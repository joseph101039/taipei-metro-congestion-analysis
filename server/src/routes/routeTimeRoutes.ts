import { Router } from 'express';
import db from '../config/database';
import { RouteRepository } from '../repositories/RouteRepository';
import { RouteTimeRepository } from '../repositories/RouteTimeRepository';
import { RouteTimeService } from '../services/RouteTimeService';
import { RouteTimeController } from '../controllers/RouteTimeController';

const router = Router();
const routeRepo = new RouteRepository(db);
const routeTimeRepo = new RouteTimeRepository(db);
const service = new RouteTimeService(routeTimeRepo, routeRepo);
const controller = new RouteTimeController(service);

router.get('/', controller.getRouteTime);
router.get('/transfers', controller.getTransferStations);

export default router;

