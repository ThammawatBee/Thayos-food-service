import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './orderItem.entity';
import { User } from './user.entity';

export type DeliveryOn = {
  Sunday: boolean;
  Monday: boolean;
  Tuesday: boolean;
  Wednesday: boolean;
  Thursday: boolean;
  Friday: boolean;
  Saturday: boolean;
};

@Entity('orders')
export class Order {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @Column()
  type: string;

  @Column({ default: false })
  preferBreakfast: boolean;

  @Column({ type: 'integer', default: 0 })
  breakfastCount: number;

  @Column({ default: false })
  preferBreakfastSnack: boolean;

  @Column({ type: 'integer', default: 0 })
  breakfastSnackCount: number;

  @Column({ default: false })
  preferLunch: boolean;

  @Column({ type: 'integer', default: 0 })
  lunchCount: number;

  @Column({ default: false })
  preferLunchSnack: boolean;

  @Column({ type: 'integer', default: 0 })
  lunchSnackCount: number;

  @Column({ default: false })
  preferDinner: boolean;

  @Column({ type: 'integer', default: 0 })
  dinnerCount: number;

  @Column({ default: false })
  preferDinnerSnack: boolean;

  @Column({ type: 'integer', default: 0 })
  dinnerSnackCount: number;

  @Column({ type: 'time' })
  deliveryTime: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column()
  customerType: string;

  @Column()
  paymentType: string;

  @Column()
  promotion: string;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ nullable: true })
  slipFilename: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];

  @Column({ type: 'jsonb', nullable: true })
  deliveryOn: DeliveryOn;

  @Column({ type: 'text', nullable: true, default: null })
  address?: string;

  @Column({ type: 'text', nullable: true, default: null })
  remark?: string;

  @Column({ type: 'text', nullable: true, default: '' })
  deliveryRemark?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
