import { Router } from 'express';
import db from '../config/database';
import { LineRepository } from '../repositories/LineRepository';
import { LineService } from '../services/LineService';
import { LineController } from '../controllers/LineController';
import { LineRouteRepository } from '../repositories/LineRouteRepository';
import { LineRouteService } from '../services/LineRouteService';
import { LineRouteController } from '../controllers/LineRouteController';

const router = Router();

const repo = new LineRepository(db);
const service = new LineService(repo);
const controller = new LineController(service);

const lineRouteRepo = new LineRouteRepository(db);
const lineRouteService = new LineRouteService(lineRouteRepo);
const lineRouteController = new LineRouteController(lineRouteService);

router.get('/', controller.getLines);
router.get('/routes', lineRouteController.getAllRoutes);
router.get('/:code/routes', lineRouteController.getRoutesByLineCode);
router.get('/:code', controller.getLineByCode);

export default router;
