import { StationDistanceFilter, StationDistanceWithStations } from '../models/StationDistance';
import { IStationDistanceRepository } from '../repositories/StationDistanceRepository';

export interface IStationDistanceService {
  getDistances(filter: StationDistanceFilter): Promise<StationDistanceWithStations[]>;
}

export class StationDistanceService implements IStationDistanceService {
  constructor(private readonly repo: IStationDistanceRepository) {}

  async getDistances(filter: StationDistanceFilter): Promise<StationDistanceWithStations[]> {
    return this.repo.findAll(filter);
  }
}
