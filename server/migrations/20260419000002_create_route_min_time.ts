import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('route_min_time', (table) => {
    table.increments('id').unsigned().primary();
    table.integer('from_station_id').unsigned().notNullable();
    table.integer('to_station_id').unsigned().notNullable();
    table.integer('min_travel_time').unsigned().notNullable().comment('乘車時間（分鐘）');
    table.string('transfer_ids', 255).notNullable().defaultTo('').comment('轉運站 ID，逗號分隔');
    table.foreign('from_station_id').references('stations.id');
    table.foreign('to_station_id').references('stations.id');
    table.unique(['from_station_id', 'to_station_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('route_min_time');
}

