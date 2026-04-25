import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transfer_overheads', (table) => {
    table.increments('id').unsigned().primary();
    table.smallint('transfer_station_sid').unsigned().notNullable().comment('轉運站 SID（009、010…）');
    table.string('station_codes', 20).notNullable().comment('站碼組合，如 BR11/G16');
    table.string('station_name', 20).notNullable();
    table.smallint('sample_count').unsigned().notNullable().comment('樣本數');
    table.decimal('avg_transfer_time_min', 3, 1).notNullable().comment('平均轉乘時間（分鐘）');
    table.unique(['transfer_station_sid']);
    table.index('transfer_station_sid');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transfer_overheads');
}

