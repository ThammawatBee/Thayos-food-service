// user.service.ts
import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RoleType, User } from '../../entities/user.entity';
import { CreateUser, ListUsers } from 'src/schema/zod';

const JWT_INIT_PASSWORD = process.env.JWT_INIT_PASSWORD || 'P@ssw0rd';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async createUser(payload: CreateUser) {
    const existing = await this.userRepo.findOne({
      where: { userCode: payload.userCode },
    });
    if (existing) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'CODE_IS_ALREADY_EXIST',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const hashedPassword = await bcrypt.hash(payload.password, 10);
      const user = this.userRepo.create({
        userCode: payload.userCode,
        password: hashedPassword,
        name: payload.name,
        role: payload.role as RoleType,
      });

      return this.userRepo.save(user);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'CREATE_USER_ERROR',
          error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findByUserCode(userCode: string) {
    return this.userRepo.findOne({ where: { userCode } });
  }

  async resetPassword(userId: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.userRepo
      .createQueryBuilder('user')
      .update()
      .set({ password: hashedPassword })
      .where('id = :id', { id: userId })
      .execute();
    return result;
  }

  async listUsers(options: ListUsers) {
    const { userCode, name, offset, limit } = options;
    const query = this.userRepo.createQueryBuilder('user');
    if (userCode) {
      query.andWhere(`user.userCode ilike '%${userCode}%'`);
    }
    if (name) {
      query.andWhere(`user.name ilike '%${name}%'`);
    }
    const count = await query.getCount();
    query.orderBy('user.createdAt', 'DESC');
    query.limit(+limit || 20);
    query.offset(+offset || 0);
    const users = await query.getMany();
    return { users, count };
  }
}
