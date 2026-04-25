import { Router } from 'express';
import db from '../config/database';
import { CongestionRepository } from '../repositories/CongestionRepository';
import { RoutePathService } from '../services/RoutePathService';
import { CongestionService } from '../services/CongestionService';
import { CongestionController } from '../controllers/CongestionController';

const router = Router();
const repo = new CongestionRepository(db);
const routePathService = new RoutePathService(repo);
const service = new CongestionService(repo, routePathService);
const controller = new CongestionController(service);

router.get('/station-load', controller.getStationLoad);
router.get('/station-load-range', controller.getStationLoadRange);

export default router;

