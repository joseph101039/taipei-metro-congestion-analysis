import { ILineCapacityRepository } from '../repositories/LineCapacityRepository';
import { LineCapacity } from '../models/LineCapacity';

export interface ILineCapacityService {
  getAll(): Promise<LineCapacity[]>;
}

export class LineCapacityService implements ILineCapacityService {
  constructor(private readonly repo: ILineCapacityRepository) {}

  getAll(): Promise<LineCapacity[]> {
    return this.repo.findAll();
  }
}

