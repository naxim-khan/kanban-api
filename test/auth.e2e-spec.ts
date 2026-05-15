import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailQueue } from '../src/queues/email/mail.queue';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    name: 'Auth User',
    email: 'auth-e2e@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      })
      .overrideProvider(MailQueue)
      .useValue({
        addWelcomeEmailJob: jest.fn().mockResolvedValue({ id: 'mock-job' }),
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
    // Fix for "UnsupportedMediaTypeError: unsupported charset UTF-8"
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.headers['content-type']?.includes('UTF-8')) {
        req.headers['content-type'] = req.headers['content-type'].replace(
          'UTF-8',
          'utf-8',
        );
      }
      next();
    });
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Clean up
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  }, 45000);

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: testUser.email },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email);
        });
    });

    it('should fail registration with existing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login and return token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });

    it('should fail login with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should return user profile with valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const token = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout user and blacklist token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const token = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Accessing profile with blacklisted token should fail
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
