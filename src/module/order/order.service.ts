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
import { chunk, groupBy, sortBy, values } from 'lodash';
import { LogService } from '../log/log.service';
import { UserPayload } from 'src/types/user-payload.interface';
import { LogStatus, LogType } from 'src/entities/log.entity';
import { displayMenu, indexMap } from 'src/utils/menu';
import { groupDatesByWeekAndGroup, modifyGroupBag } from 'src/utils/bag';
import { v4 as uuidv4 } from 'uuid';

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
    private readonly logService: LogService,
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

  async createOrder(
    payload: CreateOrder,
    userId: string,
    operator?: UserPayload,
  ) {
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
    if (operator) {
      this.logService.createLog({
        customerId: payload.customerId,
        userId: operator.sub,
        type: LogType.CREATE_ORDER,
        detail: `Create order delivery at ${payload.startDate} - ${payload.endDate}`,
        status: LogStatus.SUCCESS,
      });
    }
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
    const grouped = groupDatesByWeekAndGroup(calculateDeliveryDates);
    for (const dtList of values(grouped)) {
      const qrcode = uuidv4(); // or custom logic
      for (const dt of dtList) {
        const bag = new Bag();
        bag.deliveryAt = dt.toISODate();
        bag.noRemarkType = noRemarkType;
        bag.order = order;
        bag.address = order.address;
        bag.qrCode = qrcode;
        bags.push(bag);
      }
    }

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
    const {
      limit,
      offset,
      startDate,
      endDate,
      type,
      customer,
      getAll = false,
    } = options;
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
    query.orderBy('bag.deliveryAt', 'ASC');
    if (!getAll) {
      query.take(+limit || 20);
      query.skip(+offset || 0);
    }
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

    const renderMenu = (orderItems: OrderItem[]) => {
      let text = '';
      types.forEach((type) => {
        const items = orderItems.filter((item) => item.type === type.value);
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
      values(groupBy(bags, 'qrCode')).forEach((bags) => {
        const bag = modifyGroupBag(bags);
        worksheet
          .addRow({
            id: bag.qrCode,
            deliveryAt: bag.deliveryAt,
            customerCode: bag.customerCode,
            customerName: bag.customerName,
            address: bag.address,
            menu: renderMenu(bag.orderItems),
            remark: bag.remark,
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
        basket = CASE qr_code ${basketCases} END,
        updated_at = NOW()
      WHERE qr_code IN (${bagIds.join(',')});
    `;
    await this.dataSource.query(query);
  }

  public async updateBagData(
    id: string,
    payload: UpdateBagData,
    operator?: UserPayload,
  ) {
    const query = this.bagRepo.createQueryBuilder('bag');
    const newOrderItems: OrderItem[] = [];
    let orderItemIdsToDelete: string[] = [];
    query.leftJoinAndSelect('bag.orderItems', 'orderItems');
    query.leftJoinAndSelect('bag.order', 'order');
    query.leftJoinAndSelect('order.customer', 'customer');
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
                  `${DateTime.fromISO(bag.deliveryAt).toFormat('cccc')}-${
                    item.type
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
    if (operator) {
      this.logService.createLog({
        customerId: bag.order.customer?.id,
        userId: operator.sub,
        type: LogType.UPDATE_BAG,
        detail: `Update bag date ${bag.deliveryAt}`,
        status: LogStatus.SUCCESS,
        bagId: bag.id,
      });
    }
    return;
  }

  public async updateOrder(
    id: string,
    payload: UpdateOrder,
    operator?: UserPayload,
  ) {
    await this.orderRepo.save({
      id,
      ...payload,
    });
    const query = this.orderRepo.createQueryBuilder('order');
    query.leftJoinAndSelect('order.customer', 'customer');
    query.where('id = :id', { id: id });
    const order = await query.getOne();
    const bags = await this.bagRepo
      .createQueryBuilder('bag')
      .leftJoinAndSelect('bag.order', 'order')
      .where('bag.deliveryAt > CURRENT_DATE')
      .andWhere('order.id = :id', { id })
      .select(['bag.deliveryAt', 'bag.id', 'order'])
      .getMany();
    if (bags.length) {
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
      if (operator) {
        const sortedBag = newBags.sort((a, b) =>
          a.deliveryAt.localeCompare(b.deliveryAt),
        );
        this.logService.createLog({
          customerId: order.customer?.id,
          userId: operator.sub,
          type: LogType.UPDATE_ORDER,
          detail: `Update order date ${sortedBag?.[0]?.deliveryAt} - ${
            sortedBag?.[sortedBag.length - 1]?.deliveryAt
          }`,
          status: LogStatus.SUCCESS,
        });
      }
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

  public async getBagByQrCode(id: string) {
    try {
      const query = this.bagRepo.createQueryBuilder('bag');
      query.leftJoin('bag.order', 'order');
      query.leftJoin('order.customer', 'customer');
      query.leftJoinAndSelect('bag.orderItems', 'orderItems');
      query.where('bag.qrCode = :id', { id });
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
      if (!bags.length) throw new NotFoundException('Bag not found');
      return modifyGroupBag(bags);
    } catch (err) {
      throw new NotFoundException('Bag not found');
    }
  }

  public async verifyOrderItem(
    payload: VerifyOrderItem,
    operator?: UserPayload,
  ) {
    const bags = await this.bagRepo.find({
      where: { qrCode: payload.bagId },
      relations: ['order', 'order.customer'],
    });
    if (!bags.length) throw new NotFoundException('Bag not found');
    const orderItem = await this.orderItemRepo
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.bag', 'bag')
      .where('bag.qrCode = :qrCode', { qrCode: payload.bagId })
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
      if (operator) {
        await this.logService.createLog({
          customerId: bags[0].order.customer?.id,
          userId: operator.sub,
          type: LogType.CHECK_BOX,
          detail: `Verify Box fail at Bag delivery at ${bags[0].deliveryAt}`,
          status: LogStatus.FAIL,
          bagId: bags[0].id,
        });
      }
      throw new NotFoundException('Not found Box in Bag');
    } else {
      await this.dataSource
        .createQueryBuilder()
        .update(OrderItem)
        .set({ inBagStatus: true })
        .where('id = :orderItemId', { orderItemId: orderItem.id })
        .execute();
      if (operator) {
        try {
          await this.logService.createLog({
            customerId: bags[0].order.customer?.id,
            userId: operator.sub,
            type: LogType.CHECK_BOX,
            detail: `Verify Box success at Bag delivery at ${
              bags[0].deliveryAt
            } ${displayMenu(orderItem.type)}`,
            status: LogStatus.SUCCESS,
            bagId: bags[0].id,
          });
        } catch (err) {
          console.log('err', err);
        }
      }
    }
    return;
  }

  public async verifyBag(payload: VerifyBag, operator?: UserPayload) {
    const bags = await this.bagRepo.find({
      where: { qrCode: payload.bagQrCode },
      relations: ['order', 'order.customer'],
    });
    if (!bags.length) throw new NotFoundException('Bag not found');
    const verifyBag = await this.bagRepo
      .createQueryBuilder('bag')
      .where('bag.id = :bagId', { bagId: bags?.[0].id })
      .andWhere('bag.basket =:basket', { basket: payload.basket })
      .getOne();
    if (!verifyBag) {
      await this.dataSource
        .createQueryBuilder()
        .update(Bag)
        .set({ inBasketStatus: false })
        .where('id IN(:...bagIds)', { bagIds: bags.map((bag) => bag.id) })
        .execute();
      if (operator) {
        await this.logService.createLog({
          customerId: bags[0].order.customer?.id,
          userId: operator.sub,
          type: LogType.CHECK_BAG,
          detail: `Verify Bag fail at delivery at ${bags[0].deliveryAt}`,
          status: LogStatus.FAIL,
          bagId: bags[0].id,
        });
      }
      throw new BadRequestException('Bag and Basket not match');
    } else {
      await this.dataSource
        .createQueryBuilder()
        .update(Bag)
        .set({ inBasketStatus: true })
        .where('id IN(:...bagIds)', { bagIds: bags.map((bag) => bag.id) })
        .execute();
      if (operator) {
        await this.logService.createLog({
          customerId: bags[0].order.customer?.id,
          userId: operator.sub,
          type: LogType.CHECK_BAG,
          detail: `Verify Bag fail at delivery at ${bags[0].deliveryAt}`,
          status: LogStatus.SUCCESS,
          bagId: bags[0].id,
        });
      }
    }
    return;
  }

  public async deleteBag(bagId: string, operator?: UserPayload) {
    const bag = await this.bagRepo.findOne({
      where: { id: bagId },
    });
    if (!bag) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          errorKey: 'NOT_FOUND_BAG_TO_DELETE',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.bagRepo
      .createQueryBuilder()
      .delete()
      .from(Bag)
      .where('id = :id', { id: bagId })
      .execute();
    if (operator) {
      this.logService.createLog({
        userId: operator.sub,
        type: LogType.REMOVE_BAG,
        detail: `Delete bag delivery at ${bag.deliveryAt}`,
        status: LogStatus.SUCCESS,
      });
    }
    return;
  }

  public async exportOrderItem(response: Response, options: ListBag) {
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
    const worksheet = workbook.addWorksheet('Bags');
    worksheet.columns = [
      { header: 'วันที่', key: 'deliveryAt', width: 20 },
      { header: 'รหัสลูกค้า', key: 'customerCode', width: 20 },
      { header: 'ชื่อลูกค้า', key: 'customerName', width: 20 },
      { header: 'ที่อยู่', key: 'address', width: 20 },
      { header: `Remark`, key: 'remark', width: 20 },
      { header: `Delivery Remark`, key: 'deliveryRemark', width: 20 },
      { header: `มื้ออาหาร`, key: 'type', width: 50 },
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
        sortBy(bag.orderItems, (item) =>
          indexMap.has(item.type) ? indexMap.get(item.type)! : Infinity,
        ).forEach((orderItem) => {
          worksheet
            .addRow({
              deliveryAt: bag.deliveryAt,
              customerCode: bag.order.customer.customerCode,
              customerName: bag.order.customer.fullname,
              address: bag.order.customer.address,
              remark: bag.order.customer.remark,
              deliveryRemark: bag.order.deliveryRemark,
              type: displayMenu(orderItem.type),
              basket: bag.basket || '',
            })
            .commit(); // important in streaming mode
        });
      });
      offset += batchSize;
    }
    worksheet.commit(); // commit worksheet

    await workbook.commit();
  }

  public async getOrderItemSummary(options: ListBag) {
    const { bags } = await this.listBag({ ...options, getAll: true });
    let orderItems: OrderItem[] = [];
    bags.forEach((bag) => {
      orderItems = [...orderItems, ...bag.orderItems];
    });
    const summary = types.map((type) => {
      return {
        ...type,
        count: orderItems.filter((orderItem) => orderItem.type === type.value)
          .length,
      };
    });
    return summary;
  }
}
