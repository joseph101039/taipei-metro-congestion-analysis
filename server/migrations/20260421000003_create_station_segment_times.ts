import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('station_segment_times', (table) => {
    table.increments('id').unsigned().primary();
    table.string('line_code', 5).notNullable().comment('路線代碼 BR/BL/R/G/O/Y');
    table.string('from_station_code', 6).notNullable().comment('起站代碼');
    table.string('to_station_code', 6).notNullable().comment('迄站代碼（升序方向）');
    table.tinyint('travel_time_min').unsigned().notNullable().comment('行駛時間（分鐘）');
    table.unique(['line_code', 'from_station_code', 'to_station_code'], { indexName: 'uq_sst_line_from_to' });
    table.index('line_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('station_segment_times');
}

