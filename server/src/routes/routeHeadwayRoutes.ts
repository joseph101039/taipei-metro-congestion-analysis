import { Router } from 'express';
import db from '../config/database';
import { RouteHeadwayRepository } from '../repositories/RouteHeadwayRepository';
import { RouteHeadwayService } from '../services/RouteHeadwayService';
import { RouteHeadwayController } from '../controllers/RouteHeadwayController';

const router = Router();
const repo = new RouteHeadwayRepository(db);
const service = new RouteHeadwayService(repo);
const controller = new RouteHeadwayController(service);

router.get('/', controller.getAll);
router.get('/:routeId', controller.getByRouteId);

export default router;

