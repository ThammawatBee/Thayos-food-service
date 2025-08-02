import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { UpdateHolidays } from 'src/schema/zod';
import { User } from 'src/decorator/user.decorator';
import { UserPayload } from 'src/types/user-payload.interface';

@Controller('holidays')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}
  @Get()
  async listHolidays(@Query() query: { year: string }) {
    const result = await this.holidayService.listHolidays(query.year);
    return { holidays: result };
  }

  @Patch()
  async patchHolidays(
    @Body() payload: UpdateHolidays,
    @User() operator: UserPayload,
  ) {
    await this.holidayService.updateHolidays(payload, operator);
    return { status: 'Patch Holiday success' };
  }
}
