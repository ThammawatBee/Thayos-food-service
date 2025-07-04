import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RoleType {
  ADMIN = 'admin',
  USER = 'user',
  CHECKER = 'checker',
}

@Entity('users')
export class User {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ unique: true })
  userCode: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: RoleType,
  })
  role!: RoleType;

  @Column()
  password: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
