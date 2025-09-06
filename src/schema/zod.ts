import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

const ListUserSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  userCode: z.string().optional(),
  name: z.string().optional(),
});

export class ListUsers extends createZodDto(ListUserSchema) { }

const CreateUserSchema = z.object({
  userCode: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user', 'checker']).optional(),
  password: z.string(),
});

export class CreateUser extends createZodDto(CreateUserSchema) { }

const EditUserSchema = z.object({
  name: z.string(),
  role: z.enum(['admin', 'user', 'checker']).optional(),
  password: z.string(),
});

export class EditUser extends createZodDto(EditUserSchema) { }

const ListCustomerSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  customerCode: z.string().optional(),
});

export class ListCustomers extends createZodDto(ListCustomerSchema) { }

const ListCustomerOrderItemSchema = z.object({
  year: z.string(),
});

export class ListCustomerOrderItem extends createZodDto(
  ListCustomerOrderItemSchema,
) { }

const CreateCustomerSchema = z.object({
  customerCode: z.string(),
  name: z.string(),
  fullname: z.string(),
  address: z.string(),
  pinAddress: z.string(),
  remark: z.string(),
  mobileNumber: z.string(),
  reserveMobileNumber: z.string(),
  email: z.string(),
  deliveryTime: z.string(),
  deliveryTimeEnd: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
  preferBreakfastSnack: z.boolean(),
  preferLunchSnack: z.boolean(),
  preferDinnerSnack: z.boolean(),
});

export class CreateCustomer extends createZodDto(CreateCustomerSchema) { }

const EditCustomerSchema = z.object({
  name: z.string(),
  fullname: z.string(),
  address: z.string(),
  pinAddress: z.string(),
  remark: z.string(),
  mobileNumber: z.string(),
  reserveMobileNumber: z.string(),
  deliveryTimeEnd: z.string(),
  email: z.string(),
  deliveryTime: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
  preferBreakfastSnack: z.boolean(),
  preferLunchSnack: z.boolean(),
  preferDinnerSnack: z.boolean(),
});

export class EditCustomer extends createZodDto(EditCustomerSchema) { }

const UpdateHolidaysSchema = z.object({
  addHolidays: z.array(z.string()),
  deleteHolidays: z.array(z.string()),
});

export class UpdateHolidays extends createZodDto(UpdateHolidaysSchema) { }

const IndividualOrder = z.object({
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
  preferBreakfastSnack: z.boolean(),
  preferLunchSnack: z.boolean(),
  preferDinnerSnack: z.boolean(),
  breakfastCount: z.number(),
  lunchCount: z.number(),
  dinnerCount: z.number(),
  breakfastSnackCount: z.number(),
  lunchSnackCount: z.number(),
  dinnerSnackCount: z.number(),
});

const CreateOrderSchema = z.object({
  type: z.string(),
  address: z.string(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
  preferBreakfastSnack: z.boolean(),
  preferLunchSnack: z.boolean(),
  preferDinnerSnack: z.boolean(),
  breakfastCount: z.number(),
  lunchCount: z.number(),
  dinnerCount: z.number(),
  breakfastSnackCount: z.number(),
  lunchSnackCount: z.number(),
  dinnerSnackCount: z.number(),
  remark: z.string(),
  deliveryRemark: z.string(),
  deliveryTime: z.string(),
  deliveryTimeEnd: z.string(),
  deliveryOn: z.object({
    Sunday: z.boolean(),
    Monday: z.boolean(),
    Tuesday: z.boolean(),
    Wednesday: z.boolean(),
    Thursday: z.boolean(),
    Friday: z.boolean(),
    Saturday: z.boolean(),
  }),
  startDate: z.string(),
  endDate: z.string(),
  customerType: z.string(),
  paymentType: z.string(),
  total: z.number(),
  promotion: z.string(),
  customerId: z.string(),
  deliveryOrderType: z.string(),
  individualDelivery: z.object({
    Sunday: IndividualOrder,
    Monday: IndividualOrder,
    Tuesday: IndividualOrder,
    Wednesday: IndividualOrder,
    Thursday: IndividualOrder,
    Friday: IndividualOrder,
    Saturday: IndividualOrder,
  }),
});

export class CreateOrder extends createZodDto(CreateOrderSchema) { }

const ListOderPaymentSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export class ListOderPayment extends createZodDto(ListOderPaymentSchema) { }

const ListBagSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
  customer: z.string().optional(),
  getAll: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export class ListBag extends createZodDto(ListBagSchema) { }

const UpdateBagSchema = z.object({
  id: z.string(),
  basket: z.string(),
});

export class UpdateBag extends createZodDto(
  z.object({ bags: z.array(UpdateBagSchema) }),
) { }

const UpdateBagDataSchema = z.object({
  address: z.string(),
  breakfast: z.number().int(),
  lunch: z.number().int(),
  dinner: z.number().int(),
  breakfastSnack: z.number().int(),
  lunchSnack: z.number().int(),
  dinnerSnack: z.number().int(),
});

export class UpdateBagData extends createZodDto(UpdateBagDataSchema) { }

const UpdateOrderSchema = z.object({
  address: z.string(),
  remark: z.string(),
  deliveryRemark: z.string(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
  preferBreakfastSnack: z.boolean(),
  preferLunchSnack: z.boolean(),
  preferDinnerSnack: z.boolean(),
  breakfastCount: z.number(),
  lunchCount: z.number(),
  dinnerCount: z.number(),
  breakfastSnackCount: z.number(),
  lunchSnackCount: z.number(),
  dinnerSnackCount: z.number(),
  individualDelivery: z.object({
    Sunday: IndividualOrder,
    Monday: IndividualOrder,
    Tuesday: IndividualOrder,
    Wednesday: IndividualOrder,
    Thursday: IndividualOrder,
    Friday: IndividualOrder,
    Saturday: IndividualOrder,
  }),
});

export class UpdateOrder extends createZodDto(UpdateOrderSchema) { }

const ListOrderSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customer: z.string().optional(),
});

export class ListOrder extends createZodDto(ListOrderSchema) { }

const VerifyOrderItemSchema = z.object({
  bagId: z.string(),
  orderItemId: z.string(),
});

export class VerifyOrderItem extends createZodDto(VerifyOrderItemSchema) { }

const VerifyBagSchema = z.object({
  bagQrCode: z.string(),
  basket: z.string(),
});

export class VerifyBag extends createZodDto(VerifyBagSchema) { }

const ListLogSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
});

export class ListLog extends createZodDto(ListLogSchema) { }
