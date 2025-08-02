import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Log, LogStatus, LogType } from 'src/entities/log.entity';
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
}
