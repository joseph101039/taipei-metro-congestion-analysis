import { Knex } from 'knex';
import { LineCapacity } from '../models/LineCapacity';

export interface ILineCapacityRepository {
  findAll(): Promise<LineCapacity[]>;
}

export class LineCapacityRepository implements ILineCapacityRepository {
  constructor(private readonly db: Knex) {}

  findAll(): Promise<LineCapacity[]> {
    return this.db('line_capacities').select('*');
  }
}

