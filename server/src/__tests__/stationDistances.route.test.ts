import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { StationDistanceController } from '../controllers/StationDistanceController';
import { IStationDistanceService } from '../services/StationDistanceService';
import { StationDistanceWithStations } from '../models/StationDistance';

const mockRecord: StationDistanceWithStations = {
  id: 1,
  from_station: { id: 1, code: 'R28', name: '淡水', alias: '淡水' },
  to_station:   { id: 2, code: 'R27', name: '紅樹林', alias: '紅樹林' },
  distance_km: 2.09,
};

function buildApp(service: IStationDistanceService) {
  const app = express();
  app.use(express.json());
  const router = Router();
  const controller = new StationDistanceController(service);
  router.get('/', controller.getDistances);
  app.use('/api/station-distances', router);
  return app;
}

describe('GET /api/station-distances', () => {
  it('returns 200 with data array', async () => {
    const service: IStationDistanceService = { getDistances: jest.fn().mockResolvedValue([mockRecord]) };
    const app = buildApp(service);

    const res = await request(app).get('/api/station-distances');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [mockRecord] });
  });

  it('forwards from_code query param to service', async () => {
    const service: IStationDistanceService = { getDistances: jest.fn().mockResolvedValue([mockRecord]) };
    const app = buildApp(service);

    await request(app).get('/api/station-distances?from_code=R28');

    expect(service.getDistances).toHaveBeenCalledWith(
      expect.objectContaining({ from_code: 'R28' }),
    );
  });

  it('forwards from_name query param to service', async () => {
    const service: IStationDistanceService = { getDistances: jest.fn().mockResolvedValue([mockRecord]) };
    const app = buildApp(service);

    await request(app).get('/api/station-distances?from_name=%E6%B7%A1%E6%B0%B4');

    expect(service.getDistances).toHaveBeenCalledWith(
      expect.objectContaining({ from_name: '淡水' }),
    );
  });

  it('forwards to_code query param to service', async () => {
    const service: IStationDistanceService = { getDistances: jest.fn().mockResolvedValue([]) };
    const app = buildApp(service);

    await request(app).get('/api/station-distances?to_code=R27');

    expect(service.getDistances).toHaveBeenCalledWith(
      expect.objectContaining({ to_code: 'R27' }),
    );
  });

  it('returns empty data for unknown code', async () => {
    const service: IStationDistanceService = { getDistances: jest.fn().mockResolvedValue([]) };
    const app = buildApp(service);

    const res = await request(app).get('/api/station-distances?from_code=INVALID');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('returns 500 on service error', async () => {
    const service: IStationDistanceService = {
      getDistances: jest.fn().mockRejectedValue(new Error('db error')),
    };
    const app = buildApp(service);
    app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: 'Internal server error' });
    });

    const res = await request(app).get('/api/station-distances');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
