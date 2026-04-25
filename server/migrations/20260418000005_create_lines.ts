import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('lines', (table) => {
    table.increments('id').unsigned().primary();
    table.string('code', 20).notNullable().unique();
    table.string('name', 50).notNullable();
    table.string('color', 20).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('lines');
}

