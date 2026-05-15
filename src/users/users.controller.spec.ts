import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '@generated/prisma';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { OwnershipGuard } from 'src/auth/guards/ownership.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    adminUpdate: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: '1',
    name: 'test',
    email: 'test@gmail.com',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser = {
    ...mockUser,
    id: '2',
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const dto = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password',
        role: Role.USER,
      };
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(dto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    const updateDto = { name: 'updated name' };

    it('should call update for a regular user', async () => {
      mockUsersService.update.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await controller.update('1', updateDto, {
        sub: '1',
        email: 'test@gmail.com',
        role: Role.USER,
      });

      expect(result.name).toEqual('updated name');
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
      expect(service.adminUpdate).not.toHaveBeenCalled();
    });

    it('should call adminUpdate for an admin user', async () => {
      mockUsersService.adminUpdate.mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });

      const result = await controller.update('1', updateDto, {
        sub: '2',
        email: 'admin@test.com',
        role: Role.ADMIN,
      });

      expect(result.name).toEqual('updated name');
      expect(service.adminUpdate).toHaveBeenCalledWith('1', updateDto);
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(mockUser);

      const result = await controller.remove('1');

      expect(result).toEqual(mockUser);
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
