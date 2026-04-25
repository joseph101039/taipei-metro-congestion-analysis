import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('line_routes', (t) => {
    t.increments('id').unsigned().primary();
    t.string('route_id', 10).notNullable().unique();
    t.string('line_code', 5).notNullable();
    t.tinyint('direction').notNullable();
    t.string('route_name_zh', 50).nullable();
    t.string('route_name_en', 100).nullable();
  });

  await knex.schema.createTable('line_route_stops', (t) => {
    t.increments('id').unsigned().primary();
    t.string('route_id', 10).notNullable();
    t.string('station_code', 10).notNullable();
    t.smallint('stop_sequence').notNullable();
    t.decimal('cumulative_distance', 6, 3).notNullable();
    t.unique(['route_id', 'station_code']);
    t.index('route_id');
    t.index('station_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('line_route_stops');
  await knex.schema.dropTableIfExists('line_routes');
}
