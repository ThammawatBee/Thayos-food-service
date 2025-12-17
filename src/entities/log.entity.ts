import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Customer } from './customer.entity';
import { Bag } from './bag.entity';

export enum LogType {
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  REMOVE_USER = 'remove_user',
  CREATE_CUSTOMER = 'create_customer',
  UPDATE_CUSTOMER = 'update_customer',
  REMOVE_CUSTOMER = 'remove_customer',
  CREATE_ORDER = 'create_order',
  UPDATE_ORDER = 'update_order',
  UPDATE_BAG = 'update_bag',
  CHECK_BOX = 'check_box',
  CHECK_BAG = 'check_bag',
  UPDATE_HOLIDAY = 'update_holiday',
  REMOVE_BAG = 'remove_bag',
}

export enum LogStatus {
  SUCCESS = 'success',
  FAIL = 'fail',
}

@Entity('logs')
export class Log {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'CASCADE' })
  customer?: Customer;

  @ManyToOne(() => Bag, { nullable: true, onDelete: 'CASCADE' })
  bag?: Bag;

  @Column({
    type: 'enum',
    enum: LogType,
  })
  type!: LogType;

  @Column({ type: 'text', default: '' })
  detail: string;

  @Column({
    type: 'enum',
    enum: LogStatus,
  })
  status!: LogStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
