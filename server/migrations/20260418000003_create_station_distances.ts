import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('station_distances', (table) => {
    table.increments('id').unsigned().primary();
    table.integer('from_station_id').unsigned().notNullable();
    table.integer('to_station_id').unsigned().notNullable();
    table.decimal('distance_km', 5, 2).notNullable();
    table.foreign('from_station_id').references('stations.id');
    table.foreign('to_station_id').references('stations.id');
    table.unique(['from_station_id', 'to_station_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('station_distances');
}
