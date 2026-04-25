import type { Knex } from 'knex';

const lines = [
  // 主線
  { id: 1, code: 'red',             name: '淡水信義線', color: '#E3002C', parent_line_id: null },
  { id: 2, code: 'blue',            name: '板南線',     color: '#0070BD', parent_line_id: null },
  { id: 3, code: 'green',           name: '松山新店線', color: '#008659', parent_line_id: null },
  { id: 4, code: 'orange',          name: '中和新蘆線', color: '#F8B61C', parent_line_id: null },
  { id: 5, code: 'brown',           name: '文湖線',     color: '#C48C31', parent_line_id: null },
  { id: 6, code: 'yellow',          name: '環狀線',     color: '#FCDA01', parent_line_id: null },
  // 支線（parent_line_id 指向所屬主線）
  { id: 7, code: 'red_xinbeitou',   name: '新北投支線', color: '#F3A5A8', parent_line_id: 1 },
  { id: 8, code: 'green_xiaobitan', name: '小碧潭支線', color: '#DAE11F', parent_line_id: 3 },
  { id: 9, code: 'orange_luzhou',   name: '蘆洲支線',   color: '#F8B61C', parent_line_id: 4 },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('lines').insert(lines).onConflict('code').merge(['name', 'color', 'parent_line_id']);
}

