import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { join } from 'path';
import { diskStorage } from 'multer';
import { CreateOrder, ListOderPayment } from 'src/schema/zod';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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

  @Get('/:id/image')
  async downloadSlip(@Param('id') id: string, @Res() res: Response) {
    const filename = await this.orderService.getOrderImage(id);
    return res.sendFile(join(process.cwd(), 'uploads', filename));
  }

  @Post('/')
  async createOrder(@Body() payload: CreateOrder) {
    const order = await this.orderService.createOrder(payload);
    return { order };
  }
}
