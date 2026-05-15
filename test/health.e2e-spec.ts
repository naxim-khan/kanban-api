import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: jest
          .fn()
          .mockResolvedValue({ totalHits: 0, timeToReset: 60 }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/health (GET) - Liveness Probe', () => {
    it('should return status ok with timestamp', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
          expect(new Date(res.body.timestamp).getTime()).toBeGreaterThan(0);
        });
    });

    it('should always return 200 OK even under load', async () => {
      // Test multiple rapid requests
      const requests = Array(5)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/api/health').expect(200));

      const responses = await Promise.all(requests);
      responses.forEach((res) => {
        expect(res.body.status).toBe('ok');
      });
    });
  });

  describe('/health/ready (GET) - Readiness Probe', () => {
    it('should return health check with all services', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect((res) => {
          // Terminus health check response structure
          expect(res.body.status).toBeDefined();
          expect(res.body.details).toBeDefined();
          expect(res.body.details.database).toBeDefined();
          expect(res.body.details.redis).toBeDefined();
        });
    });

    it('should return 200 when all dependencies are healthy', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.details.database.status).toBe('up');
          expect(res.body.details.redis.status).toBe('up');
        });
    });

    it('should include health messages in response', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect((res) => {
          expect(res.body.details.database.message).toBeDefined();
          expect(res.body.details.redis.message).toBeDefined();
        });
    });
  });
});
