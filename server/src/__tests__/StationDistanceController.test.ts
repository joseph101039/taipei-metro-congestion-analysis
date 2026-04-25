import { Request, Response, NextFunction } from 'express';
import { StationDistanceController } from '../controllers/StationDistanceController';
import { IStationDistanceService } from '../services/StationDistanceService';
import { StationDistanceWithStations } from '../models/StationDistance';

const mockRecord: StationDistanceWithStations = {
  id: 1,
  from_station: { id: 1, code: 'R28', name: '淡水', alias: '淡水' },
  to_station:   { id: 2, code: 'R27', name: '紅樹林', alias: '紅樹林' },
  distance_km: 2.09,
};

const makeReq = (query: Record<string, string> = {}): Partial<Request> => ({ query });
const makeRes = (): { json: jest.Mock; status: jest.Mock } => {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};
const makeNext = (): NextFunction => jest.fn();

const makeService = (records: StationDistanceWithStations[] = [mockRecord]): IStationDistanceService => ({
  getDistances: jest.fn().mockResolvedValue(records),
});

describe('StationDistanceController', () => {
  it('responds with { data } on success', async () => {
    const service = makeService();
    const controller = new StationDistanceController(service);
    const req = makeReq();
    const res = makeRes();

    await controller.getDistances(req as Request, res as unknown as Response, makeNext());

    expect(res.json).toHaveBeenCalledWith({ data: [mockRecord] });
  });

  it('extracts from_code query param', async () => {
    const service = makeService();
    const controller = new StationDistanceController(service);

    await controller.getDistances(makeReq({ from_code: 'R28' }) as Request, makeRes() as unknown as Response, makeNext());

    expect(service.getDistances).toHaveBeenCalledWith(
      expect.objectContaining({ from_code: 'R28' }),
    );
  });

  it('extracts from_name query param', async () => {
    const service = makeService();
    const controller = new StationDistanceController(service);

    await controller.getDistances(makeReq({ from_name: '淡水' }) as Request, makeRes() as unknown as Response, makeNext());

    expect(service.getDistances).toHaveBeenCalledWith(
      expect.objectContaining({ from_name: '淡水' }),
    );
  });

  it('extracts to_code and to_name query params', async () => {
    const service = makeService();
    const controller = new StationDistanceController(service);

    await controller.getDistances(
      makeReq({ to_code: 'R27', to_name: '紅樹林' }) as Request,
      makeRes() as unknown as Response,
      makeNext(),
    );

    expect(service.getDistances).toHaveBeenCalledWith(
      expect.objectContaining({ to_code: 'R27', to_name: '紅樹林' }),
    );
  });

  it('calls next with error on service failure', async () => {
    const error = new Error('db error');
    const service: IStationDistanceService = { getDistances: jest.fn().mockRejectedValue(error) };
    const controller = new StationDistanceController(service);
    const next = makeNext();

    await controller.getDistances(makeReq() as Request, makeRes() as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
