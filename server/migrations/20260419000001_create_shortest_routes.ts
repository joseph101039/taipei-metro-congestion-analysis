import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shortest_routes', (table) => {
    table.increments('id').unsigned().primary();
    table.integer('from_station_id').unsigned().notNullable();
    table.integer('to_station_id').unsigned().notNullable();
    table.decimal('total_distance_km', 6, 2).notNullable();
    table.string('transfer_ids', 255).notNullable().defaultTo('');
    table.foreign('from_station_id').references('stations.id');
    table.foreign('to_station_id').references('stations.id');
    table.unique(['from_station_id', 'to_station_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shortest_routes');
}
