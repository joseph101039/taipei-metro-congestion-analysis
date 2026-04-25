import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stations', (table) => {
    table.integer('line_id').unsigned().nullable().references('id').inTable('lines').after('alias');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stations', (table) => {
    table.dropColumn('line_id');
  });
}

