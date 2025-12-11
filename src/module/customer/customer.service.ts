import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer } from 'src/entities/customer.entity';
import { OrderItem } from 'src/entities/orderItem.entity';
import { CreateCustomer, EditCustomer, ListCustomers } from 'src/schema/zod';
import { Brackets, Repository } from 'typeorm';
import { LogService } from '../log/log.service';
import { UserPayload } from 'src/types/user-payload.interface';
import { LogStatus, LogType } from 'src/entities/log.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly logService: LogService,
  ) {}

  async editUser(id: string, payload: EditCustomer, operator?: UserPayload) {
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
      if (operator) {
        await this.logService.createLog({
          userId: operator.sub,
          type: LogType.UPDATE_CUSTOMER,
          detail: `Update customer ${updatedCustomer.customerCode} ${updatedCustomer.fullname}`,
          status: LogStatus.SUCCESS,
          customerId: updatedCustomer.id,
        });
      }
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
    query.take(+limit || 20);
    query.skip(+offset || 0);
    const customers = await query.getMany();
    return { customers, count };
  }

  async createUser(payload: CreateCustomer, operator?: UserPayload) {
    const existing = await this.customerRepo.findOne({
      where: { customerCode: payload.customerCode },
    });
    if (existing) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'CUSTOMER_CODE_IS_ALREADY_EXIST',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const customer = this.customerRepo.create({
        ...payload,
      });
      const newCustomer = await this.customerRepo.save(customer);
      if (operator) {
        await this.logService.createLog({
          userId: operator.sub,
          type: LogType.CREATE_CUSTOMER,
          detail: `Create customer ${newCustomer.customerCode} ${newCustomer.fullname}`,
          status: LogStatus.SUCCESS,
          customerId: newCustomer.id,
        });
      }
      return newCustomer;
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

  async deleteCustomer(id: string, operator?: UserPayload) {
    const customer = await this.customerRepo.findOne({
      where: { id },
    });
    if (!customer) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errorKey: 'NOT_FOUND_CUSTOMER_TO_DELETE',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.customerRepo
      .createQueryBuilder()
      .delete()
      .from(Customer)
      .where('id = :id', { id: id })
      .execute();
    if (operator) {
      await this.logService.createLog({
        userId: operator.sub,
        type: LogType.REMOVE_CUSTOMER,
        detail: `Remove customer ${customer.customerCode} ${customer.fullname}`,
        status: LogStatus.SUCCESS,
      });
    }
    return;
  }

  async listCustomerOrderItem(customerId: string, year: string) {
    const orderItems = await this.orderItemRepo
      .createQueryBuilder('orderItem')
      .leftJoin('orderItem.order', 'order')
      .leftJoin('order.customer', 'customer')
      .where('customer.id = :customerId', { customerId })
      .andWhere('EXTRACT(YEAR FROM orderItem.deliveryAt) = :year', {
        year: +year,
      })
      .getMany();
    return orderItems;
  }
}
