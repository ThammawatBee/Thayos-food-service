import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogService } from './log.service';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) {}
}
