import { Knex } from 'knex';
import { Line } from '../models/Line';

export interface LineWithSegments extends Line {
  segments: Array<{ from: string; to: string }>;
}

export interface ILineRepository {
  findAll(): Promise<LineWithSegments[]>;
  findByCode(code: string): Promise<LineWithSegments | null>;
}

export class LineRepository implements ILineRepository {
  constructor(private readonly db: Knex) {}

  private async attachSegments(lines: Line[]): Promise<LineWithSegments[]> {
    if (lines.length === 0) return [];
    const lineIds = lines.map((l) => l.id);
    const lineIdSet = new Set(lineIds);

    const rows = await this.db('station_distances as sd')
      .join('stations as fs', 'sd.from_station_id', 'fs.id')
      .join('stations as ts', 'sd.to_station_id', 'ts.id')
      .where(function () {
        this.whereIn('fs.line_id', lineIds).orWhereIn('ts.line_id', lineIds);
      })
      .select(
        'fs.line_id as from_line_id',
        'ts.line_id as to_line_id',
        'fs.code as from_code',
        'ts.code as to_code',
      );

    const map = new Map<number, Array<{ from: string; to: string }>>();
    for (const row of rows) {
      // Cross-line rows are branch connecting segments (e.g. R22→R22A):
      // assign to the TO station's line (the branch), not the FROM station's (the main line).
      const lineId =
        row.from_line_id === row.to_line_id ? row.from_line_id : row.to_line_id;
      if (!lineIdSet.has(lineId)) continue;
      if (!map.has(lineId)) map.set(lineId, []);
      map.get(lineId)!.push({ from: row.from_code, to: row.to_code });
    }
    return lines.map((line) => ({ ...line, segments: map.get(line.id) ?? [] }));
  }

  async findAll(): Promise<LineWithSegments[]> {
    const lines = await this.db('lines').select('*').orderBy('id');
    return this.attachSegments(lines);
  }

  async findByCode(code: string): Promise<LineWithSegments | null> {
    const line = await this.db('lines').where({ code }).first();
    if (!line) return null;
    const [result] = await this.attachSegments([line]);
    return result;
  }
}
