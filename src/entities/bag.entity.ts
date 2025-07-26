import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './orderItem.entity';
import { Order } from './order.entity';

@Entity('bags')
export class Bag {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @Column()
  noRemarkType: boolean;

  @Column({ type: 'date' })
  deliveryAt: string;

  @OneToMany(() => OrderItem, (item) => item.bag, { cascade: ['remove'] })
  orderItems: OrderItem[];

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'text', nullable: true, default: null })
  address?: string;

  @Column({ type: 'text', nullable: true, default: null })
  basket?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
