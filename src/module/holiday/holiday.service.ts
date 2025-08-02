import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Holiday } from 'src/entities/holiday.entity';
import { UpdateHolidays } from 'src/schema/zod';
import { UserPayload } from 'src/types/user-payload.interface';
import { Repository } from 'typeorm';
import { LogService } from '../log/log.service';
import { LogStatus, LogType } from 'src/entities/log.entity';

@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    private readonly logService: LogService,
  ) {}

  async listHolidays(year: string) {
    const holidays = await this.holidayRepo
      .createQueryBuilder('holiday')
      .where('EXTRACT(YEAR FROM holiday.date) = :year', { year: +year })
      .getMany();
    return holidays;
  }

  async updateHolidays(payload: UpdateHolidays, operator?: UserPayload) {
    if (payload.addHolidays.length) {
      await this.holidayRepo.save(
        payload.addHolidays.map((date) => ({ date })),
      );
    }
    if (payload.deleteHolidays.length) {
      await this.holidayRepo
        .createQueryBuilder()
        .delete()
        .from(Holiday)
        .where('date IN (:...date)', { date: payload.deleteHolidays })
        .execute();
      if (operator) {
        await this.logService.createLog({
          userId: operator.sub,
          type: LogType.UPDATE_HOLIDAY,
          detail: `UPDATE HOLIDAY`,
          status: LogStatus.SUCCESS,
        });
      }
    }
  }
}
