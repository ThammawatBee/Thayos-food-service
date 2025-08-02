import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import keyBy from 'lodash/keyBy';
import isNil from 'lodash/isNil';
import { DateTime } from 'luxon';
import * as ExcelJS from 'exceljs';
import { Bag } from 'src/entities/bag.entity';
import { Customer } from 'src/entities/customer.entity';
import { Holiday } from 'src/entities/holiday.entity';
import { DeliveryOn, Order } from 'src/entities/order.entity';
import { OrderItem } from 'src/entities/orderItem.entity';
import {
  CreateOrder,
  ListBag,
  ListOderPayment,
  ListOrder,
  UpdateBag,
  UpdateBagData,
  UpdateOrder,
  VerifyBag,
  VerifyOrderItem,
} from 'src/schema/zod';
import { Brackets, DataSource, Repository } from 'typeorm';
import { NoRemarkQRFormat } from 'src/constant/noRemarkQRFomat';
import { Response } from 'express';
import toPairs from 'lodash/toPairs';
import omit from 'lodash/omit';
import { chunk } from 'lodash';

const types = [
  { text: 'มื้อเช้า', value: 'breakfast' },
  { text: 'ของว่างเช้า', value: 'breakfastSnack' },
  { text: 'มื้อกลางวัน', value: 'lunch' },
  { text: 'ของว่างกลางวัน', value: 'lunchSnack' },
  { text: 'มื้อเย็น', value: 'dinner' },
  { text: 'ของว่างเย็น', value: 'dinnerSnack' },
];

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Bag)
    private readonly bagRepo: Repository<Bag>,
    @InjectDataSource() private readonly dataSource: DataSource,
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

  async createOrder(payload: CreateOrder, userId: string) {
    const order = this.orderRepo.create({
      ...payload,
      customer: {
        id: payload.customerId,
      },
      user: {
        id: userId,
      },
    });
    const noRemarkType = isNil(order.remark || null);
    const createdOrder = await this.orderRepo.save(order);
    await this.generateOrderItem(createdOrder, noRemarkType);
    return createdOrder;
  }

  async generateOrderItem(order: Order, noRemarkType: boolean) {
    const deliveryDates = this.generateDeliveryDate(
      order.deliveryOn,
      order.startDate,
      order.endDate,
    );

    const calculateDeliveryDates = await this.calculateDateWithHolidays(
      order,
      deliveryDates,
    );

    const bags = await this.createBags(
      calculateDeliveryDates,
      order,
      noRemarkType,
    );

    const newOrderItems = this.buildOrderItem(
      order,
      calculateDeliveryDates,
      bags,
    );
    for (const batch of chunk(newOrderItems, 200)) {
      await this.orderItemRepo.save(batch);
    }
  }

  async createBags(
    calculateDeliveryDates: string[],
    order: Order,
    noRemarkType: boolean,
  ) {
    const bags: Bag[] = [];
    calculateDeliveryDates.forEach((date) => {
      const bag = new Bag();
      bag.deliveryAt = date;
      bag.noRemarkType = noRemarkType;
      bag.order = order;
      bag.address = order.address;
      bags.push(bag);
    });

    const newBags = await this.bagRepo.save(bags);
    return newBags;
  }

  buildOrderItem(order: Order, calculateDeliveryDates: string[], bags: Bag[]) {
    const result: OrderItem[] = [];
    const bagKeyByDeliveryAt = keyBy(bags, 'deliveryAt');
    function distribute(mealType: string, count: number) {
      calculateDeliveryDates.forEach((date) => {
        for (let i = 0; i < count; i++) {
          const orderItem = new OrderItem();
          orderItem.deliveryAt = date;
          orderItem.order = order;
          orderItem.type = mealType;
          orderItem.bag = bagKeyByDeliveryAt[date];
          orderItem.qrcode = bagKeyByDeliveryAt[date].noRemarkType
            ? NoRemarkQRFormat[
            `${DateTime.fromISO(date).toFormat('cccc')}-${mealType}`
            ]
            : null;
          result.push(orderItem);
        }
      });
    }
    if (order.breakfastCount && order.preferBreakfast) {
      distribute('breakfast', order.breakfastCount);
    }
    if (order.lunchCount && order.preferLunch) {
      distribute('lunch', order.lunchCount);
    }
    if (order.dinnerCount && order.preferDinner) {
      distribute('dinner', order.dinnerCount);
    }
    if (order.breakfastSnackCount && order.preferBreakfastSnack) {
      distribute('breakfastSnack', order.breakfastSnackCount);
    }
    if (order.lunchSnackCount && order.preferLunchSnack) {
      distribute('lunchSnack', order.lunchSnackCount);
    }
    if (order.dinnerCount && order.preferDinnerSnack) {
      distribute('dinnerSnack', order.dinnerSnackCount);
    }
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

  async listBag(options: ListBag) {
    const { limit, offset, startDate, endDate, type, customer } = options;
    const query = this.bagRepo.createQueryBuilder('bag');
    query.leftJoin('bag.order', 'order');
    query.leftJoin('order.customer', 'customer');
    if (type && type !== 'ALL') {
      query.innerJoinAndSelect(
        'bag.orderItems',
        'orderItems',
        'orderItems.type = :type',
        { type },
      );
    } else {
      query.leftJoinAndSelect('bag.orderItems', 'orderItems');
    }
    if (startDate && endDate) {
      query.andWhere('bag.deliveryAt >= :start AND bag.deliveryAt <= :end', {
        start: startDate,
        end: endDate,
      });
    }
    if (customer) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('customer.customerCode ILIKE :input', {
            input: `%${customer}%`,
          }).orWhere('customer.name ILIKE :input', {
            input: `%${customer}%`,
          });
        }),
      );
    }

    const count = await query.getCount();
    query.take(+limit || 20);
    query.skip(+offset || 0);
    query.select([
      'bag',
      'orderItems',
      'customer.fullname',
      'customer.customerCode',
      'customer.address',
      'customer.remark',
      'order.type',
      'order.deliveryTime',
      'order.address',
      'order.remark',
      'order.deliveryRemark',
    ]);
    const bags = await query.getMany();
    return { bags, count };
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
    query.take(+limit || 20);
    query.skip(+offset || 0);
    const payments = await query.getMany();
    return { payments, count };
  }

  public async exportBag(response: Response, options: ListBag) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename=reports.xlsx',
    );
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: response, // STREAM directly to response
      useStyles: true,
      useSharedStrings: true,
    });

    const renderMenu = (bag: Bag) => {
      let text = '';
      types.forEach((type) => {
        const items = bag.orderItems.filter((item) => item.type === type.value);
        if (items.length) {
          text = text + `${type.text}(${items.length}) `;
        }
      });
      return text;
    };

    const worksheet = workbook.addWorksheet('Bags');
    worksheet.columns = [
      { header: 'id', key: 'id', width: 20 },
      { header: 'วันที่', key: 'deliveryAt', width: 20 },
      { header: 'รหัสลูกค้า', key: 'customerCode', width: 20 },
      { header: 'ชื่อลูกค้า', key: 'customerName', width: 20 },
      { header: 'ที่อยู่', key: 'address', width: 20 },
      { header: `Remark`, key: 'remark', width: 20 },
      { header: `เมณู`, key: 'menu', width: 50 },
      { header: `Basket`, key: 'basket', width: 20 },
    ];

    const batchSize = 20;
    let offset = 0;
    while (true) {
      const { bags } = await this.listBag({
        ...options,
        offset: `${offset}`,
        limit: `${batchSize}`,
      });
      if (bags.length === 0) break;
      bags.forEach((bag) => {
        worksheet
          .addRow({
            id: bag.id,
            deliveryAt: bag.deliveryAt,
            customerCode: bag.order.customer.customerCode,
            customerName: bag.order.customer.fullname,
            address: bag.order.customer.address,
            menu: renderMenu(bag),
            remark: bag.order.customer.remark,
            basket: bag.basket || '',
          })
          .commit(); // important in streaming mode
      });
      offset += batchSize;
    }
    worksheet.commit(); // commit worksheet

    await workbook.commit();
  }

  public async updateBasket(payload: UpdateBag) {
    const bags = payload.bags;
    const bagIds = bags.map((bag) => `'${bag.id}'`);
    let basketCases = '';
    bags.forEach((bag) => {
      basketCases += `WHEN '${bag.id}' THEN '${bag.basket.replace(
        /\s/g,
        '',
      )}' `;
    });
    const query = `
      UPDATE "bags"
      SET
        basket = CASE id ${basketCases} END,
        updated_at = NOW()
      WHERE id IN (${bagIds.join(',')});
    `;
    await this.dataSource.query(query);
  }

  public async updateBagData(id: string, payload: UpdateBagData) {
    const query = this.bagRepo.createQueryBuilder('bag');
    const newOrderItems: OrderItem[] = [];
    let orderItemIdsToDelete: string[] = [];
    query.leftJoinAndSelect('bag.orderItems', 'orderItems');
    query.leftJoinAndSelect('bag.order', 'order');
    query.where('bag.id = :id', { id: id });
    const bag = await query.getOne();
    if (!(DateTime.fromISO(bag.deliveryAt) > DateTime.local().startOf('day'))) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errorKey: 'BAG_DELIVERY_AT_IS_NOT_AFTER_TODAY',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const typeToDelete = toPairs(omit(payload, 'address'))
      .filter(([_, value]) => value === 0)
      .map(([key]) => key);
    const typeToUpdate = toPairs(omit(payload, 'address'))
      .filter(([_, value]) => value > 0)
      .map(([type, value]) => ({ type, value }));

    const orderItemIdToDeletes = await this.dataSource
      .createQueryBuilder(OrderItem, 'orderItem')
      .select('orderItem.id')
      .innerJoin('orderItem.bag', 'bag')
      .where('bag.id = :id', { id })
      .andWhere('orderItem.type IN (:...types)', { types: typeToDelete })
      .getMany();
    const deleteIds = orderItemIdToDeletes.map((orderItem) => orderItem.id);
    if (deleteIds.length) {
      await this.dataSource
        .createQueryBuilder()
        .delete()
        .from(OrderItem)
        .where(`id IN (:...ids)`, {
          ids: deleteIds,
        })
        .execute();
    }
    typeToUpdate.forEach((item) => {
      const orderItemsByType = bag.orderItems.filter(
        (orderItem) => orderItem.type === item.type,
      );
      if (orderItemsByType.length !== item.value) {
        if (item.value > orderItemsByType.length) {
          for (let i = 0; i < item.value - orderItemsByType.length; i = i + 1) {
            const orderItem = new OrderItem();
            orderItem.deliveryAt = bag.deliveryAt;
            orderItem.order = bag.order;
            orderItem.type = item.type;
            orderItem.bag = bag;
            orderItem.qrcode = bag.noRemarkType
              ? NoRemarkQRFormat[
              `${DateTime.fromISO(bag.deliveryAt).toFormat('cccc')}-${item.type
              }`
              ]
              : null;
            newOrderItems.push(orderItem);
          }
        }
        if (item.value < orderItemsByType.length) {
          const orderItemIdToDelete = orderItemsByType
            .filter(
              (_item, index) => index < orderItemsByType.length - item.value,
            )
            .map((orderItem) => orderItem.id);
          orderItemIdsToDelete = [
            ...orderItemIdsToDelete,
            ...orderItemIdToDelete,
          ];
        }
      }
    });
    if (newOrderItems.length) {
      await this.orderItemRepo.save(newOrderItems);
    }
    if (orderItemIdsToDelete.length) {
      await this.orderItemRepo
        .createQueryBuilder()
        .delete()
        .from(OrderItem)
        .where('id IN (:...ids)', { ids: orderItemIdsToDelete })
        .execute();
    }
    await this.bagRepo.save({
      id,
      address: payload.address,
    });
    return;
  }

  public async updateOrder(id: string, payload: UpdateOrder) {
    await this.orderRepo.save({
      id,
      ...payload,
    });
    const query = this.orderRepo.createQueryBuilder('order');
    query.where('id = :id', { id: id });
    const order = await query.getOne();
    const bags = await this.bagRepo
      .createQueryBuilder('bag')
      .leftJoinAndSelect('bag.order', 'order')
      .where('bag.deliveryAt > CURRENT_DATE')
      .andWhere('order.id = :id', { id })
      .select(['bag.deliveryAt', 'bag.id', 'order'])
      .getMany();
    const deliveryDates = bags.map((bag) => bag.deliveryAt);
    await this.bagRepo
      .createQueryBuilder()
      .delete()
      .from(Bag)
      .where('id IN (:...ids)', {
        ids: bags.map((bag) => bag.id),
      })
      .execute();
    const noRemarkType = isNil(order.remark || null);
    const newBags = await this.createBags(deliveryDates, order, noRemarkType);
    const newOrderItems = this.buildOrderItem(order, deliveryDates, newBags);
    for (const batch of chunk(newOrderItems, 200)) {
      await this.orderItemRepo.save(batch);
    }
  }

  public async listOrders(options: ListOrder) {
    const { limit, offset, startDate, endDate, customer } = options;
    const query = this.orderRepo.createQueryBuilder('order');
    query.leftJoinAndSelect('order.customer', 'customer');
    if (startDate && endDate) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('order.startDate >= :start', {
            start: startDate,
          }).orWhere('order.endDate <= :end', {
            end: endDate,
          });
        }),
      );
    }
    if (customer) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('customer.customerCode ILIKE :input', {
            input: `%${customer}%`,
          }).orWhere('customer.name ILIKE :input', {
            input: `%${customer}%`,
          });
        }),
      );
    }
    const count = await query.getCount();
    query.orderBy('order.createdAt', 'DESC');
    query.take(+limit || 20);
    query.skip(+offset || 0);
    const orders = await query.getMany();
    return { orders, count };
  }

  public async getBag(id: string) {
    const query = this.bagRepo.createQueryBuilder('bag');
    query.leftJoin('bag.order', 'order');
    query.leftJoin('order.customer', 'customer');
    query.leftJoinAndSelect('bag.orderItems', 'orderItems');
    query.where('bag.id = :id', { id });
    query.select([
      'bag',
      'orderItems',
      'customer.fullname',
      'customer.customerCode',
      'customer.address',
      'customer.remark',
      'order.type',
      'order.deliveryTime',
      'order.address',
      'order.remark',
      'order.deliveryRemark',
    ]);
    const bag = await query.getOne();
    if (!bag) throw new NotFoundException('Bag not found');
    return bag;
  }

  public async verifyOrderItem(payload: VerifyOrderItem) {
    const bag = await this.bagRepo.findOne({ where: { id: payload.bagId } });
    if (!bag) throw new NotFoundException('Bag not found');
    const orderItem = await this.orderItemRepo
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.bag', 'bag')
      .where('bag.id = :bagId', { bagId: payload.bagId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('orderItem.id = :orderItemId', {
            orderItemId: payload.orderItemId,
          });
        }),
      )
      .getOne();
    if (!orderItem) {
      await this.dataSource
        .createQueryBuilder()
        .update(OrderItem)
        .set({ inBagStatus: false })
        .where('id = :orderItemId', { orderItemId: payload.orderItemId })
        .execute();
      throw new NotFoundException('Not found Box in Bag');
    } else {
      await this.dataSource
        .createQueryBuilder()
        .update(OrderItem)
        .set({ inBagStatus: true })
        .where('id = :orderItemId', { orderItemId: orderItem.id })
        .execute();
    }
    return;
  }

  public async verifyBag(payload: VerifyBag) {
    const bag = await this.bagRepo.findOne({ where: { id: payload.bagId } });
    if (!bag) throw new NotFoundException('Bag not found');
    const verifyBag = await this.bagRepo
      .createQueryBuilder('bag')
      .where('bag.id = :bagId', { bagId: payload.bagId })
      .andWhere('bag.basket =:basket', { basket: payload.basket })
      .getOne();
    if (!verifyBag) {
      await this.dataSource
        .createQueryBuilder()
        .update(Bag)
        .set({ inBasketStatus: false })
        .where('id = :bagId', { bagId: payload.bagId })
        .execute();
      throw new BadRequestException('Bag and Basket not match');
    } else {
      await this.dataSource
        .createQueryBuilder()
        .update(Bag)
        .set({ inBasketStatus: true })
        .where('id = :bagId', { bagId: payload.bagId })
        .execute();
    }
    return;
  }
}
