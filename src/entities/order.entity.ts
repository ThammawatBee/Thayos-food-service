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

  @Column({ type: 'integer' })
  breakfastCount: number;

  @Column({ default: false })
  preferLunch: boolean;

  @Column({ type: 'integer' })
  lunchCount: number;

  @Column({ default: false })
  preferDinner: boolean;

  @Column({ type: 'integer' })
  dinnerCount: number;

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

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ nullable: true })
  slipFilename: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];

  @Column({ type: 'jsonb', nullable: true })
  deliveryOn: DeliveryOn;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
