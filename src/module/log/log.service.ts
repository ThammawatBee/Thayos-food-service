import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Log, LogStatus, LogType } from 'src/entities/log.entity';
import { ListLog } from 'src/schema/zod';
import { Repository } from 'typeorm';

type LogInput = {
  customerId?: string;
  userId: string;
  bagId?: string;
  type: LogType;
  detail: string;
  status: LogStatus;
};

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(Log)
    private readonly logRepo: Repository<Log>,
  ) {}

  async createLog(payload: LogInput) {
    const log = this.logRepo.create({
      type: payload.type,
      detail: payload.detail,
      status: payload.status,
      ...(payload?.customerId
        ? {
            customer: {
              id: payload.customerId,
            },
          }
        : {}),
      ...(payload?.userId
        ? {
            user: {
              id: payload.userId,
            },
          }
        : {}),
      ...(payload?.bagId
        ? {
            bag: {
              id: payload.bagId,
            },
          }
        : {}),
    });
    const createdLog = await this.logRepo.save(log);
    return createdLog;
  }

  async listLog(options: ListLog) {
    const { startDate, endDate, limit, offset, type } = options;
    const query = this.logRepo.createQueryBuilder('log');
    query.leftJoin('log.bag', 'bag');
    query.leftJoin('log.customer', 'customer');
    query.leftJoin('log.user', 'user');
    if (startDate && endDate) {
      query.andWhere('log.createdAt >= :start AND log.createdAt < :end', {
        start: DateTime.fromFormat(startDate, 'yyyy-MM-dd').toJSDate(),
        end: DateTime.fromFormat(endDate, 'yyyy-MM-dd').toJSDate(),
      });
    }
    if (type && type !== 'ALL') {
      query.andWhere('log.type =:type', { type });
    }
    const count = await query.getCount();
    query.orderBy('log.createdAt', 'DESC');
    query.limit(+limit || 20);
    query.offset(+offset || 0);
    query.select([
      'log',
      'customer.fullname',
      'customer.customerCode',
      'bag.deliveryAt',
      'bag.address',
      'user.name',
      'user.userCode',
    ]);
    const logs = await query.getMany();
    return { logs, count };
  }
}
