import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@generated/prisma';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailQueue } from '../src/queues/email/mail.queue';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminUser = {
    name: 'Admin User',
    email: 'admin-e2e@example.com',
    password: 'password123',
  };

  const regularUser = {
    name: 'Regular User',
    email: 'user-e2e@example.com',
    password: 'password123',
  };

  const targetUser = {
    name: 'Target User',
    email: 'target-e2e@example.com',
    password: 'password123',
  };

  let adminToken: string;
  let userToken: string;
  let userId: string;
  let targetId: string;

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
    app.use((req, res, next) => {
      if (req.headers['content-type']?.includes('UTF-8')) {
        req.headers['content-type'] = req.headers['content-type'].replace(
          'UTF-8',
          'utf-8',
        );
      }
      next();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: [adminUser.email, regularUser.email, targetUser.email] },
      },
    });

    // Register & Login Admin
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminUser);
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: Role.ADMIN },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.accessToken;

    // Register Regular User
    const userRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(regularUser);
    userToken = userRes.body.accessToken;
    userId = userRes.body.user.id;

    // Register Target User (for admin update tests)
    const targetRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(targetUser);
    targetId = targetRes.body.user.id;
  }, 45000); // Increased timeout

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: { in: [adminUser.email, regularUser.email, targetUser.email] },
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('/users (GET)', () => {
    it('should allow admin to list users', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should forbid regular user from listing users', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should allow user to view their own profile', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
        });
    });

    it('should allow admin to view any profile', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('/users/:id (PUT)', () => {
    it('should allow user to update their own name', () => {
      return request(app.getHttpServer())
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
    });

    it('should NOT allow user to update their role', () => {
      return request(app.getHttpServer())
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'ADMIN' })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(Role.USER);
        });
    });

    it('should allow admin to update user role', () => {
      return request(app.getHttpServer())
        .put(`/api/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(Role.ADMIN);
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should allow admin to delete user', () => {
      return request(app.getHttpServer())
        .delete(`/api/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
