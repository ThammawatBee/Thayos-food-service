import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateCustomer,
  EditCustomer,
  ListCustomerOrderItem,
  ListCustomers,
} from 'src/schema/zod';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get(':id/order-items')
  async listCustomerOrderItem(
    @Param('id') id: string,
    @Query() query: ListCustomerOrderItem,
  ) {
    const result = await this.customerService.listCustomerOrderItem(
      id,
      query.year,
    );
    return { orderItems: result };
  }

  @Get()
  async listCustomers(@Query() query: ListCustomers) {
    const result = await this.customerService.listCustomers(query);
    return { customers: result.customers, count: result.count };
  }

  @Post()
  async createCustomer(@Body() payload: CreateCustomer) {
    return this.customerService.createUser(payload);
  }

  @Patch('/:id')
  async editEquipment(@Param('id') id: string, @Body() body: EditCustomer) {
    const customer = await this.customerService.editUser(id, body);
    return { customer };
  }

  @Delete('/:id')
  async deleteCustomer(@Param('id') id: string) {
    await this.customerService.deleteCustomer(id);
    return { status: 'delete customer success' };
  }
}
