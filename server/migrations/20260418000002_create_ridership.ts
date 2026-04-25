import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ridership', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.date('date').notNullable();
    table.tinyint('hour').unsigned().notNullable().comment('0–23');
    table.integer('origin_id').unsigned().notNullable().references('id').inTable('stations');
    table.integer('destination_id').unsigned().notNullable().references('id').inTable('stations');
    table.integer('passengers').unsigned().notNullable().defaultTo(0);

    table.unique(['date', 'hour', 'origin_id', 'destination_id'], { indexName: 'uq_trip' });
    table.index(['date'], 'idx_date');
    table.index(['origin_id'], 'idx_origin');
    table.index(['destination_id'], 'idx_destination');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ridership');
}
