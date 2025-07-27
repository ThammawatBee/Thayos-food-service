import { join } from 'path';

import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const postgresDbConfig = (): PostgresConnectionOptions => ({
  type: 'postgres',
  host: 'dpg-d1i7s3qdbo4c73emcns0-a.singapore-postgres.render.com',
  port: 5432,
  username: 'thayos_db_user',
  password: 'WfoQ45tXx0aDb49cYHDRRt9g6JjjgJFC',
  database: 'thayos_db',
  schema: 'thayos_food',
  logging: false,
  entities: [join(__dirname, '../entities/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/postgres/*{.ts,.js}')],
  synchronize: true,
  namingStrategy: new SnakeNamingStrategy(),
  ssl: true,
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
