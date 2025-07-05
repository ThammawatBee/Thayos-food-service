import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_PIPE } from '@nestjs/core';
import configuration from './configs';
import { ZodValidationPipe } from 'nestjs-zod';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './module/user/userModule';
import { AuthModule } from './module/auth/authModule';
import { CustomerModule } from './module/customer/customerModule';
import { HolidayModule } from './module/holiday/holidayModule';
import { OrderModule } from './module/order/orderModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('postgres'),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    CustomerModule,
    HolidayModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
