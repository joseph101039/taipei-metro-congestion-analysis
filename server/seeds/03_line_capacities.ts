import type { Knex } from 'knex';

const rows = [
  { line_code: 'R',  line_name: '淡水信義線', train_type: 'C341',   cars: 6, seated_per_car: 58, standing_per_car: 252, capacity_per_train: 1860, notes: '新北投支線共用車型' },
  { line_code: 'BL', line_name: '板南線',     train_type: 'C371',   cars: 6, seated_per_car: 58, standing_per_car: 252, capacity_per_train: 1860, notes: null },
  { line_code: 'G',  line_name: '松山新店線', train_type: 'C301',   cars: 6, seated_per_car: 48, standing_per_car: 246, capacity_per_train: 1764, notes: '小碧潭支線共用車型' },
  { line_code: 'O',  line_name: '中和新蘆線', train_type: 'C301',   cars: 6, seated_per_car: 48, standing_per_car: 246, capacity_per_train: 1764, notes: '蘆洲支線與主線直通運轉共用車型' },
  { line_code: 'BR', line_name: '文湖線',     train_type: 'VAL256', cars: 2, seated_per_car: 30, standing_per_car: 100, capacity_per_train: 260,  notes: '橡膠輪胎系統；每列 2 節' },
  { line_code: 'Y',  line_name: '環狀線',     train_type: 'C941',   cars: 4, seated_per_car: 24, standing_per_car: 96,  capacity_per_train: 480,  notes: '橡膠輪胎系統；每列 4 節' },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('line_capacities').insert(rows).onConflict('line_code').merge();
}

