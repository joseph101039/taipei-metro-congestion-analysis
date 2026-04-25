import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stations', (table) => {
    table.decimal('lat', 10, 7).nullable().after('line_id');
    table.decimal('lng', 10, 7).nullable().after('lat');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stations', (table) => {
    table.dropColumn('lat');
    table.dropColumn('lng');
  });
}

