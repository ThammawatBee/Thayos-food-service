import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogService } from './log.service';
import { ListLog } from 'src/schema/zod';
import { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) { }

  @Get('/')
  async listLogs(@Query() query: ListLog) {
    const result = await this.logService.listLog(query);
    return { ...result };
  }

  @Get('/export')
  async exportLogs(@Res() res: Response, @Query() query: ListLog) {
    return this.logService.exportLog(res, query);
  }

  @Get('/monitor/export')
  async exportMonitor(@Res() res: Response, @Query() query: ListLog) {
    return this.logService.exportMonitor(res, query);
  }
}
