import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('route_headways', (t) => {
    t.increments('id').primary();
    t.string('line_code', 5).notNullable();
    t.string('route_id', 10).notNullable();
    t.string('service_day', 4).notNullable().comment('平日 or 假日');
    t.tinyint('peak_flag').unsigned().notNullable().defaultTo(0);
    t.string('start_time', 5).notNullable().comment('HH:MM');
    t.string('end_time', 5).notNullable().comment('HH:MM');
    t.decimal('min_headway_min', 4, 1).notNullable();
    t.decimal('max_headway_min', 4, 1).notNullable();

    t.unique(['route_id', 'service_day', 'peak_flag', 'start_time']);
    t.index('line_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('route_headways');
}

