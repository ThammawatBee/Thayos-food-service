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
  role: z.enum(['admin', 'operator']).optional(),
  password: z.string(),
});

export class CreateUser extends createZodDto(CreateUserSchema) {}