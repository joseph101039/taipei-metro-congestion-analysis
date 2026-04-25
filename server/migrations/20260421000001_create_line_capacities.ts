import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('line_capacities', (t) => {
    t.increments('id').primary();
    t.string('line_code', 10).notNullable().unique();
    t.string('line_name', 30).notNullable();
    t.string('train_type', 20).notNullable();
    t.tinyint('cars').unsigned().notNullable();
    t.smallint('seated_per_car').unsigned().notNullable();
    t.smallint('standing_per_car').unsigned().notNullable();
    t.smallint('capacity_per_train').unsigned().notNullable();
    t.string('notes', 100).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('line_capacities');
}

