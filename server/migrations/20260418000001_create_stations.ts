import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stations', (table) => {
    table.increments('id').unsigned().primary();
    table.string('code', 10).notNullable().unique();
    table.string('name', 50).notNullable().unique();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('stations');
}
