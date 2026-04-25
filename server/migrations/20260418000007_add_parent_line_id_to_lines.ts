import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('lines', (table) => {
    table.integer('parent_line_id').unsigned().nullable().references('id').inTable('lines').after('color');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('lines', (table) => {
    table.dropColumn('parent_line_id');
  });
}

