import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/entities/order.entity';
import { CreateOrder } from 'src/schema/zod';
import { Repository } from 'typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  async uploadSlip(orderId: string, file: Express.Multer.File) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    order.slipFilename = file.filename;
    await this.orderRepo.save(order);

    return { filename: file.filename };
  }

  async getOrderImage(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || !order.slipFilename)
      throw new NotFoundException('Slip not found');
    return order.slipFilename;
  }

  async createOrder(payload: CreateOrder) {

  }
}
