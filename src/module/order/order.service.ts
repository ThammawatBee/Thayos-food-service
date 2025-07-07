import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Holiday } from 'src/entities/holiday.entity';
import { DeliveryOn, Order } from 'src/entities/order.entity';
import { OrderItem } from 'src/entities/orderItem.entity';
import { CreateOrder, ListOderPayment } from 'src/schema/zod';
import { Repository } from 'typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

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
    const order = this.orderRepo.create({
      ...payload,
      customer: {
        id: payload.customerId,
      },
    });
    const createdOrder = await this.orderRepo.save(order);
    await this.generateOrderItem(createdOrder);
    return createdOrder;
  }

  async generateOrderItem(order: Order) {
    const deliveryDates = this.generateDeliveryDate(
      order.deliveryOn,
      order.startDate,
      order.endDate,
    );

    const calculateDeliveryDates = await this.calculateDateWithHolidays(
      order,
      deliveryDates,
    );

    const newOrderItems = this.buildOrderItem(order, calculateDeliveryDates);
    await this.orderItemRepo.save(newOrderItems);
  }

  buildOrderItem(order: Order, calculateDeliveryDates: string[]) {
    const result: OrderItem[] = [];
    function distribute(mealType: string, count: number) {
      calculateDeliveryDates.forEach((date) => {
        for (let i = 0; i < count; i++) {
          const orderItem = new OrderItem();
          orderItem.deliveryAt = date;
          orderItem.order = order;
          orderItem.type = mealType;
          result.push(orderItem);
        }
      });
    }
    distribute('breakfast', order.breakfastCount);
    distribute('lunch', order.lunchCount);
    distribute('dinner', order.dinnerCount);
    return result;
  }

  async calculateDateWithHolidays(order: Order, deliveryDates: string[]) {
    const endDate = DateTime.fromISO(order.endDate)
      .plus({ days: 90 })
      .toISODate();
    const holidays = await this.holidayRepo
      .createQueryBuilder('h')
      .where('h.date BETWEEN :start AND :end', {
        start: order.startDate,
        end: endDate,
      })
      .getMany();
    const holidaySet = new Set(holidays.map((h) => h.date));
    const deliveryDateSet = new Set(deliveryDates);

    const adjustedDates = deliveryDates.map((date) => {
      let luxonDate = DateTime.fromISO(date);
      while (holidaySet.has(luxonDate.toISODate())) {
        luxonDate = luxonDate.plus({ days: 7 });
        if (deliveryDateSet.has(luxonDate.toISODate())) {
          luxonDate = luxonDate.plus({ days: 7 });
        }
      }
      return luxonDate.toISODate();
    });

    return adjustedDates;
  }

  generateDeliveryDate(
    weekdays: DeliveryOn,
    startDate: string,
    endDate: string,
  ) {
    const weekdayToNumber: Record<keyof DeliveryOn, number> = {
      Sunday: 7,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    // Convert the weekdays object to a list of active days (numbers)
    const allowedDays = Object.entries(weekdays)
      .filter(([_, isActive]) => isActive)
      .map(([day]) => weekdayToNumber[day as keyof DeliveryOn]);

    const start = DateTime.fromISO(startDate);
    const end = DateTime.fromISO(endDate);

    const result: string[] = [];

    let current = start;
    while (current <= end) {
      if (allowedDays.includes(current.weekday)) {
        result.push(current.toISODate()); // Format: YYYY-MM-DD
      }
      current = current.plus({ days: 1 });
    }

    return result;
  }

  async listOrderPayment(options: ListOderPayment) {
    const { startDate, endDate, limit, offset } = options;
    const query = this.orderRepo.createQueryBuilder('order');
    query.leftJoin('order.customer', 'customer');
    if (startDate && endDate) {
      query.andWhere('order.createdAt >= :start AND order.createdAt < :end', {
        start: startDate,
        end: endDate,
      });
    }
    const count = await query.getCount();
    query.orderBy('order.createdAt', 'DESC');
    query.select([
      'order.id',
      'customer.fullname',
      'order.createdAt',
      'order.total',
      'order.paymentType',
      'order.slipFilename',
    ]);
    query.limit(+limit || 20);
    query.offset(+offset || 0);
    const payments = await query.getMany();
    return { payments, count };
  }
}
