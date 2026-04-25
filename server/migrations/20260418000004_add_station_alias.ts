import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stations', (table) => {
    table.string('alias', 50).nullable().after('name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stations', (table) => {
    table.dropColumn('alias');
  });
}
