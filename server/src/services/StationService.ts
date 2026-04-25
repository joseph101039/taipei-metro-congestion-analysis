import { IStationRepository } from '../repositories/StationRepository';
import { Station } from '../models/Station';

export interface IStationService {
  getAll(): Promise<Station[]>;
  getByCode(code: string): Promise<Station | null>;
}

export class StationService implements IStationService {
  constructor(private readonly repo: IStationRepository) {}

  getAll(): Promise<Station[]> {
    return this.repo.findAll();
  }

  getByCode(code: string): Promise<Station | null> {
    return this.repo.findByCode(code);
  }
}
