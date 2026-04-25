import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('village_population', (table) => {
    table.increments('id').unsigned().primary();
    table.integer('year_month').unsigned().notNullable().comment('西元年月，格式 YYYYMM');
    table.string('city', 10).notNullable().comment('臺北市 / 新北市');
    table.string('district', 20).notNullable().comment('行政區');
    table.string('village', 30).notNullable().comment('里別');
    table.integer('households').unsigned().notNullable().defaultTo(0).comment('戶數');
    table.integer('population').unsigned().notNullable().defaultTo(0).comment('人口數合計');
    table.integer('male').unsigned().notNullable().defaultTo(0).comment('男性人口');
    table.integer('female').unsigned().notNullable().defaultTo(0).comment('女性人口');
    table.unique(['year_month', 'city', 'district', 'village']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('village_population');
}
