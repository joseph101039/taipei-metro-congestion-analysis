import { StationDistanceService } from '../services/StationDistanceService';
import { IStationDistanceRepository } from '../repositories/StationDistanceRepository';
import { StationDistanceWithStations } from '../models/StationDistance';

const mockRecord: StationDistanceWithStations = {
  id: 1,
  from_station: { id: 1, code: 'R28', name: '淡水', alias: '淡水' },
  to_station:   { id: 2, code: 'R27', name: '紅樹林', alias: '紅樹林' },
  distance_km: 2.09,
};

const makeRepo = (records: StationDistanceWithStations[] = [mockRecord]): IStationDistanceRepository => ({
  findAll: jest.fn().mockResolvedValue(records),
});

describe('StationDistanceService', () => {
  it('returns all distances when no filter given', async () => {
    const repo = makeRepo();
    const service = new StationDistanceService(repo);

    const result = await service.getDistances({});

    expect(repo.findAll).toHaveBeenCalledWith({});
    expect(result).toEqual([mockRecord]);
  });

  it('passes from_code filter to repo', async () => {
    const repo = makeRepo();
    const service = new StationDistanceService(repo);

    await service.getDistances({ from_code: 'R28' });

    expect(repo.findAll).toHaveBeenCalledWith({ from_code: 'R28' });
  });

  it('passes from_name filter to repo', async () => {
    const repo = makeRepo();
    const service = new StationDistanceService(repo);

    await service.getDistances({ from_name: '淡水' });

    expect(repo.findAll).toHaveBeenCalledWith({ from_name: '淡水' });
  });

  it('passes to_code filter to repo', async () => {
    const repo = makeRepo();
    const service = new StationDistanceService(repo);

    await service.getDistances({ to_code: 'R27' });

    expect(repo.findAll).toHaveBeenCalledWith({ to_code: 'R27' });
  });

  it('passes to_name filter to repo', async () => {
    const repo = makeRepo();
    const service = new StationDistanceService(repo);

    await service.getDistances({ to_name: '紅樹林' });

    expect(repo.findAll).toHaveBeenCalledWith({ to_name: '紅樹林' });
  });

  it('returns empty array when repo returns none', async () => {
    const repo = makeRepo([]);
    const service = new StationDistanceService(repo);

    const result = await service.getDistances({ from_code: 'INVALID' });

    expect(result).toEqual([]);
  });
});
