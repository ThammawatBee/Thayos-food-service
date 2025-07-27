import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('customers')
export class Customer {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ unique: true })
  customerCode: string;

  @Column()
  name: string;

  @Column()
  fullname: string;

  @Column({ type: 'text' })
  address: string;

  @Column()
  pinAddress: string;

  @Column({ type: 'text', nullable: true })
  remark?: string | null;

  @Column()
  mobileNumber: string;

  @Column()
  email: string;

  @Column({ type: 'time' })
  deliveryTime: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ default: false })
  preferBreakfast: boolean;

  @Column({ default: false })
  preferLunch: boolean;

  @Column({ default: false })
  preferDinner: boolean;

  @Column({ default: false })
  preferBreakfastSnack: boolean;

  @Column({ default: false })
  preferLunchSnack: boolean;

  @Column({ default: false })
  preferDinnerSnack: boolean;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
