import { join } from 'path';

import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const postgresDbConfig = (): PostgresConnectionOptions => ({
  type: 'postgres',
  host: 'localhost',
  port: 54325,
  username: 'thayos_food_user',
  password: 'thayos_food_pass',
  database: 'thayos_food',
  schema: 'thayos_food',
  logging: false,
  entities: [join(__dirname, '../entities/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/postgres/*{.ts,.js}')],
  synchronize: true,
  namingStrategy: new SnakeNamingStrategy(),
  extra: {
    options: '-c search_path=thayos_food',
  },
});

if (
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'local'
) {
  Logger.debug(postgresDbConfig());
}

export default new DataSource(postgresDbConfig());
