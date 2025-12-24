import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Log, LogStatus, LogType } from 'src/entities/log.entity';
import { ListLog } from 'src/schema/zod';
import { Repository } from 'typeorm';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { getLogLabel } from 'src/utils/log';

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
  ) { }

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
    // if (type && type !== 'ALL') {
    //   query.andWhere('log.type =:type', { type });
    // }
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

  public async exportLog(response: Response, options: ListLog) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename=reports.xlsx',
    );
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: response, // STREAM directly to response
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Logs');
    worksheet.columns = [
      { header: 'Date Time', key: 'createdAt', width: 20 },
      { header: 'Operation', key: 'operation', width: 20 },
      { header: 'Operator', key: 'operator', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Detail', key: 'detail', width: 20 },
      { header: `Status`, key: 'status', width: 20 },
    ];

    const batchSize = 20;
    let offset = 0;

    while (true) {
      const { logs } = await this.listLog({
        ...options,
        offset: `${offset}`,
        limit: `${batchSize}`,
      });
      if (logs.length === 0) break;
      logs.forEach((log) => {
        worksheet
          .addRow({
            createdAt: DateTime.fromISO(log.createdAt.toISOString()).toFormat(
              'dd/MM/yyyy-hh:mm',
            ),
            operation: getLogLabel(log.type),
            operator: log.user.name,
            customer: log.customer ? log.customer.fullname : '',
            detail: log.detail,
            status: log.status === 'success' ? 'Success' : 'Fail',
          })
          .commit(); // important in streaming mode
      });
      offset += batchSize;
    }
    worksheet.commit(); // commit worksheet

    await workbook.commit();
  }

  public async exportMonitor(response: Response, options: ListLog) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename=reports.xlsx',
    );
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: response, // STREAM directly to response
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Logs');
    worksheet.columns = [
      { header: 'วันที่ตรวจสอบ', key: 'createdAt', width: 20 },
      { header: 'Order date', key: 'orderDate', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Detail', key: 'detail', width: 20 },
      { header: 'ผู้ตรวจสอบ', key: 'user', width: 20 },
      { header: `Status`, key: 'status', width: 20 },
    ];

    const batchSize = 20;
    let offset = 0;

    while (true) {
      const { logs } = await this.listLog({
        ...options,
        offset: `${offset}`,
        limit: `${batchSize}`,
      });
      if (logs.length === 0) break;
      logs.forEach((log) => {
        worksheet
          .addRow({
            createdAt: DateTime.fromISO(log.createdAt.toISOString()).toFormat(
              'dd/MM/yyyy-hh:mm',
            ),
            orderDate: DateTime.fromISO(log.bag.deliveryAt).toFormat(
              'dd/MM/yyyy',
            ),
            customer: log.customer ? log.customer.fullname : '',
            user: log.user.name,
            detail: log.detail,
            status: log.status === 'success' ? 'Success' : 'Fail',
          })
          .commit(); // important in streaming mode
      });
      offset += batchSize;
    }
    worksheet.commit(); // commit worksheet

    await workbook.commit();
  }
}
