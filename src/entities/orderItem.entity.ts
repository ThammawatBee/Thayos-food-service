import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Bag } from './bag.entity';

@Entity('order_items')
export class OrderItem {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @Column()
  type: string;

  @ManyToOne(() => Order, (order) => order.orderItems)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Bag, (bag) => bag.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bag_id' })
  bag: Bag;

  @Column({ type: 'date' })
  deliveryAt: string;

  @Column({ type: 'text', nullable: true })
  qrcode: string | null;

  @Column({ default: false })
  inBagStatus: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
