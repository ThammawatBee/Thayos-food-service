import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from 'src/entities/customer.entity';
import { CreateCustomer, EditCustomer, ListCustomers } from 'src/schema/zod';
import { Brackets, Repository } from 'typeorm';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async editUser(id: string, payload: EditCustomer) {
    const user = await this.customerRepo.findOne({
      where: { id },
    });
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errorKey: 'NOT_FOUND_CUSTOMER_TO_UPDATE',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const updatedCustomer = await this.customerRepo.save({
        id,
        ...payload,
      });
      return updatedCustomer;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'EDIT_CUSTOMER_ERROR',
          error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listCustomers(options: ListCustomers) {
    const { customerCode, offset, limit } = options;
    const query = this.customerRepo.createQueryBuilder('customer');
    if (customerCode) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('customer.customerCode ILIKE :input', {
            input: `%${customerCode}%`,
          }).orWhere('customer.name ILIKE :input', {
            input: `%${customerCode}%`,
          });
        }),
      );
    }
    const count = await query.getCount();
    query.orderBy('customer.createdAt', 'DESC');
    query.limit(+limit || 20);
    query.offset(+offset || 0);
    const customers = await query.getMany();
    return { customers, count };
  }

  async createUser(payload: CreateCustomer) {
    const existing = await this.customerRepo.findOne({
      where: { customerCode: payload.customerCode },
    });
    if (existing) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'CUSTOME_CODE_IS_ALREADY_EXIST',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const customer = this.customerRepo.create({
        ...payload,
      });

      return this.customerRepo.save(customer);
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
}
