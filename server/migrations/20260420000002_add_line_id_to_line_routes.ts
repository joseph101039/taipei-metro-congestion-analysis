import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('line_routes', (t) => {
    t.integer('line_id').unsigned().nullable().references('id').inTable('lines').after('line_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('line_routes', (t) => {
    t.dropForeign(['line_id']);
    t.dropColumn('line_id');
  });
}
