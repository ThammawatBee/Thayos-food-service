import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

const ListUserSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  userCode: z.string().optional(),
  name: z.string().optional(),
});

export class ListUsers extends createZodDto(ListUserSchema) {}

const CreateUserSchema = z.object({
  userCode: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user', 'checker']).optional(),
  password: z.string(),
});

export class CreateUser extends createZodDto(CreateUserSchema) {}

const EditUserSchema = z.object({
  name: z.string(),
  role: z.enum(['admin', 'user', 'checker']).optional(),
  password: z.string(),
});

export class EditUser extends createZodDto(EditUserSchema) {}

const ListCustomerSchema = z.object({
  offset: z.string().optional(),
  limit: z.string().optional(),
  customerCode: z.string().optional(),
});

export class ListCustomers extends createZodDto(ListCustomerSchema) {}

const CreateCustomerSchema = z.object({
  customerCode: z.string(),
  name: z.string(),
  fullname: z.string(),
  address: z.string(),
  pinAddress: z.string(),
  remark: z.string(),
  mobileNumber: z.string(),
  email: z.string(),
  deliveryTime: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
});

export class CreateCustomer extends createZodDto(CreateCustomerSchema) {}

const EditCustomerSchema = z.object({
  name: z.string(),
  fullname: z.string(),
  address: z.string(),
  pinAddress: z.string(),
  remark: z.string(),
  mobileNumber: z.string(),
  email: z.string(),
  deliveryTime: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
});

export class EditCustomer extends createZodDto(EditCustomerSchema) {}

const UpdateHolidaysSchema = z.object({
  addHolidays: z.array(z.string()),
  deleteHolidays: z.array(z.string()),
});

export class UpdateHolidays extends createZodDto(UpdateHolidaysSchema) {}

const CreateOrderSchema = z.object({
  type: z.string(),
  preferBreakfast: z.boolean(),
  preferLunch: z.boolean(),
  preferDinner: z.boolean(),
  breakfastCount: z.number(),
  lunchCount: z.number(),
  dinnerCount: z.number(),
  deliveryTime: z.string(),
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
});

export class CreateOrder extends createZodDto(CreateOrderSchema) {}
