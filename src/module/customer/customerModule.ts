import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/authModule';
import { Customer } from '../../entities/customer.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { OrderItem } from 'src/entities/orderItem.entity';
import { LogModule } from '../log/logModule';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, User, OrderItem]),
    AuthModule,
    LogModule,
  ],
  providers: [CustomerService],
  controllers: [CustomerController],
  exports: [CustomerService],
})
export class CustomerModule {}
