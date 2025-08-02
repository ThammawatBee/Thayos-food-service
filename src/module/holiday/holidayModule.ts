import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/authModule';
import { Holiday } from '../../entities/holiday.entity';
import { HolidayService } from './holiday.service';
import { HolidayController } from './holiday.controller';
import { LogModule } from '../log/logModule';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday, User]), AuthModule, LogModule],
  providers: [HolidayService],
  controllers: [HolidayController],
  exports: [HolidayService],
})
export class HolidayModule {}
