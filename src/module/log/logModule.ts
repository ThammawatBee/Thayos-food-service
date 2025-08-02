import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/authModule';
import { Log } from '../../entities/log.entity';
import { LogService } from './log.service';
import { LogController } from './log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Log]), AuthModule],
  providers: [LogService],
  controllers: [LogController],
  exports: [LogService],
})
export class LogModule {}
