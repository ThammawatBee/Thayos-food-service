import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { join } from 'path';
import { diskStorage } from 'multer';
import {
  CreateOrder,
  ListBag,
  ListOderPayment,
  ListOrder,
  UpdateBag,
  UpdateBagData,
  UpdateOrder,
} from 'src/schema/zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from 'src/decorator/user.decorator';
import { UserPayload } from 'src/types/user-payload.interface';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post(':id/upload-slip')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const filename = `${file.originalname}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async uploadOrderImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.orderService.uploadSlip(id, file);
    return result;
  }

  @Get('/payment')
  async orderPayment(@Query() query: ListOderPayment) {
    const result = await this.orderService.listOrderPayment(query);
    return { ...result };
  }

  @Get('/bags/export')
  async exportBags(@Res() res: Response, @Query() query: ListBag) {
    return this.orderService.exportBag(res, query);
  }

  @Patch('/bag/:id')
  async uploadBag(@Param('id') id: string, @Body() body: UpdateBagData) {
    await this.orderService.updateBagData(id, body);
    return { status: 'update bag success' };
  }

  @Get('/bags')
  async listBags(@Query() query: ListBag) {
    const result = await this.orderService.listBag(query);
    return { ...result };
  }

  @Patch('/bags')
  async uploadBasket(@Body() body: UpdateBag) {
    await this.orderService.updateBasket(body);
    return { status: 'update bags basket success' };
  }

  @Get('/:id/image')
  async downloadSlip(@Param('id') id: string, @Res() res: Response) {
    const filename = await this.orderService.getOrderImage(id);
    return res.sendFile(join(process.cwd(), 'uploads', filename));
  }

  @Patch('/:id')
  async updateOrder(@Param('id') id: string, @Body() body: UpdateOrder) {
    await this.orderService.updateOrder(id, body);
    return { status: 'update order success' };
  }

  @Get('/')
  async listOrders(@Query() query: ListOrder) {
    const result = await this.orderService.listOrders(query);
    return { ...result };
  }

  @Post('/')
  async createOrder(@Body() payload: CreateOrder, @User() user: UserPayload) {
    const order = await this.orderService.createOrder(payload, user.sub);
    return { order };
  }
}
