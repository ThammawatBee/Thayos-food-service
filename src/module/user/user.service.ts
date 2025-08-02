// user.service.ts
import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RoleType, User } from '../../entities/user.entity';
import { CreateUser, EditUser, ListUsers } from 'src/schema/zod';
import { LogService } from '../log/log.service';
import { UserPayload } from 'src/types/user-payload.interface';
import { LogStatus, LogType } from 'src/entities/log.entity';

const INIT_PASSWORD = process.env.INIT_PASSWORD || 'P@ssw0rd';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly logService: LogService,
  ) { }

  async editUser(id: string, payload: EditUser, operator?: UserPayload) {
    const user = await this.userRepo.findOne({
      where: { id },
    });
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errorKey: 'NOT_FOUND_USER_TO_UPDATE',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const hashedPassword = await bcrypt.hash(payload.password, 10);
      const updatedUser = await this.userRepo.save({
        id,
        name: payload.name,
        password: hashedPassword,
        role: payload.role as RoleType,
      });
      if (operator) {
        this.logService.createLog({
          userId: operator.sub,
          type: LogType.CREATE_USER,
          detail: `Update user ${updatedUser.userCode} ${updatedUser.name}`,
          status: LogStatus.SUCCESS,
        });
      }
      return {
        name: updatedUser.name,
        role: updatedUser.role,
        id: updatedUser.id,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'EDIT_USER_ERROR',
          error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createUser(payload: CreateUser, operator?: UserPayload) {
    const existing = await this.userRepo.findOne({
      where: { userCode: payload.userCode },
    });
    if (existing) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'USERCODE_IS_ALREADY_EXIST',
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

      const newUser = await this.userRepo.save(user);
      if (operator) {
        this.logService.createLog({
          userId: operator.sub,
          type: LogType.CREATE_USER,
          detail: `Create user ${newUser.userCode} ${newUser.name}`,
          status: LogStatus.SUCCESS,
        });
      }
      return newUser;
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

  async deleteUser(id: string, operator?: UserPayload) {
    const user = await this.userRepo.findOne({
      where: { id },
    });
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errorKey: 'NOT_FOUND_USER_TO_DELETE',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.userRepo
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('id = :id', { id: id })
      .execute();
    if (operator) {
      this.logService.createLog({
        userId: operator.sub,
        type: LogType.CREATE_USER,
        detail: `Delete user ${user.userCode} ${user.name}`,
        status: LogStatus.SUCCESS,
      });
    }
    return;
  }

  async listUsers(options: ListUsers) {
    const { userCode, offset, limit } = options;
    const query = this.userRepo.createQueryBuilder('user');
    if (userCode) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.userCode ILIKE :input', {
            input: `%${userCode}%`,
          }).orWhere('user.name ILIKE :input', { input: `%${userCode}%` });
        }),
      );
    }
    const count = await query.getCount();
    query.orderBy('user.createdAt', 'DESC');
    query.take(+limit || 20);
    query.skip(+offset || 0);
    const users = await query.getMany();
    return { users, count };
  }
}
