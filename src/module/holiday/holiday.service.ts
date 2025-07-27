import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Holiday } from 'src/entities/holiday.entity';
import { UpdateHolidays } from 'src/schema/zod';
import { Repository } from 'typeorm';

@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
  ) {}

  async listHolidays(year: string) {
    const holidays = await this.holidayRepo
      .createQueryBuilder('holiday')
      .where('EXTRACT(YEAR FROM holiday.date) = :year', { year: +year })
      .getMany();
    return holidays;
  }

  async updateHolidays(payload: UpdateHolidays) {
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
    }
  }
}
