import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MailQueue } from 'src/queues/email/mail.queue';
import { Role } from '@generated/prisma';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let cache: any;
  let mailQueue: MailQueue;

  const mockUser = {
    id: '1',
    name: 'test',
    email: 'test@gmail.com',
    password: 'hashedPassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrismaService) => Promise<unknown>)(
          mockPrismaService,
        );
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMailQueue = {
    addWelcomeEmailJob: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: MailQueue,
          useValue: mockMailQueue,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get(CACHE_MANAGER);
    mailQueue = module.get<MailQueue>(MailQueue);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user and sanitize the result', async () => {
      const dto = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password',
        role: Role.USER,
      };
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('password');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(cache.del).toHaveBeenCalledWith('users');
      expect(mailQueue.addWelcomeEmailJob).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      const dto = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password',
      };
      mockPrismaService.user.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return users from cache if available', async () => {
      const users = [mockUser];
      mockCacheManager.get.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from DB and set cache if not in cache', async () => {
      const users = [mockUser];
      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result[0].email).toEqual(mockUser.email);
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a sanitized user if found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result.id).toEqual('1');
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user and invalidate cache', async () => {
      const updateDto = { name: 'updated' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        name: 'updated',
      });

      const result = await service.update('1', updateDto);

      expect(result.name).toEqual('updated');
      expect(cache.del).toHaveBeenCalledWith('users');
    });
  });

  describe('adminUpdate', () => {
    it('should allow role updates and uppercase them', async () => {
      const updateDto = { role: 'admin' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });

      const result = await service.adminUpdate('1', updateDto);

      expect(result.role).toEqual(Role.ADMIN);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove user and invalidate cache', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('1');

      expect(result.email).toEqual(mockUser.email);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(cache.del).toHaveBeenCalledWith('users');
    });
  });
});
