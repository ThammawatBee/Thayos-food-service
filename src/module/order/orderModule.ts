import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/authModule';
import { Holiday } from '../../entities/holiday.entity';
import { Order } from 'src/entities/order.entity';
import { OrderItem } from 'src/entities/orderItem.entity';
import { Customer } from 'src/entities/customer.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Bag } from 'src/entities/bag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Holiday, User, Order, OrderItem, Customer, Bag]),
    AuthModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
