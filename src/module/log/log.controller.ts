import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogService } from './log.service';
import { ListLog } from 'src/schema/zod';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('/')
  async listLogs(@Query() query: ListLog) {
    const result = await this.logService.listLog(query);
    return { ...result };
  }
}
