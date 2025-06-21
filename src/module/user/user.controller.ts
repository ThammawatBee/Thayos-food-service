// user.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUser, EditUser, ListUsers } from 'src/schema/zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserPayload } from 'src/types/user-payload.interface';
import { User } from 'src/decorator/user.decorator';

// @UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('register')
  async register(@Body() dto: any) {
    return this.userService.createUser(dto);
  }

  @Post()
  async createUser(@Body() payload: CreateUser) {
    return this.userService.createUser(payload);
  }

  @Get()
  async listUsers(@Query() query: ListUsers) {
    const result = await this.userService.listUsers(query);
    return { users: result.users, count: result.count };
  }

  @Patch('/:id')
  async editEquipment(@Param('id') id: string, @Body() body: EditUser) {
    const user = await this.userService.editUser(id, body);
    return { user };
  }

  // @Patch('/reset-password')
  // async resetPassword(
  //   @User() user: UserPayload,
  //   @Body() payload: ResetPassword,
  // ) {
  //   const data = await this.userService.resetPassword(
  //     user.sub,
  //     payload.password,
  //   );
  //   return data;
  // }
}
