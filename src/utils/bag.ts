import { NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Bag } from 'src/entities/bag.entity';

export const getDeliveryGroup = (date: DateTime): string => {
  const day = date.weekday; // 1 = Mon ... 7 = Sun
  if ([1, 2].includes(day)) return 'mon-tue';
  if ([3, 4].includes(day)) return 'wed-thu';
  if ([5, 6].includes(day)) return 'fri-sat';
  return 'other'; // exclude or handle separately
};

export const groupDatesByWeekAndGroup = (
  dates: string[],
): Record<string, DateTime[]> => {
  const map: Record<string, DateTime[]> = {};

  for (const iso of dates) {
    const dt = DateTime.fromISO(iso);
    const group = getDeliveryGroup(dt);
    const week = dt.weekNumber;
    const year = dt.year;

    const key = `${group}-${year}-W${week}`;

    if (!map[key]) map[key] = [];
    map[key].push(dt);
  }

  return map;
};

export const modifyGroupBag = (bags: Bag[]) => {
  if (bags.length === 0) {
    throw new NotFoundException('Bag not found');
  }
  if (bags.length === 2) {
    const sortedBags = bags.sort(
      (a, b) =>
        new Date(a.deliveryAt).getTime() - new Date(b.deliveryAt).getTime(),
    );
    return {
      deliveryAt: `${sortedBags[0].deliveryAt} - ${sortedBags[1].deliveryAt}`,
      customerName: sortedBags[0].order.customer.fullname,
      address: sortedBags[0].order.address,
      customerCode: sortedBags[0].order.customer.customerCode,
      orderItems: [...sortedBags[0].orderItems, ...sortedBags[1].orderItems],
      noRemarkType: sortedBags[0].noRemarkType,
      remark: sortedBags[0].order.customer.remark,
      qrCode: sortedBags[0].qrCode,
      inBasketStatus: sortedBags[0].inBasketStatus,
      basket: sortedBags[0].basket,
      order: sortedBags[0].order,
    };
  } else {
    return {
      deliveryAt: `${bags[0].deliveryAt}`,
      customerName: bags[0].order.customer.fullname,
      address: bags[0].order.address,
      customerCode: bags[0].order.customer.customerCode,
      orderItems: bags[0].orderItems,
      noRemarkType: bags[0].noRemarkType,
      remark: bags[0].order.customer.remark,
      qrCode: bags[0].qrCode,
      inBasketStatus: bags[0].inBasketStatus,
      basket: bags[0].basket,
      order: bags[0].order,
    };
  }
};
