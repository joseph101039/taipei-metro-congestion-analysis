import { Router } from 'express';
import db from '../config/database';
import { RouteRepository } from '../repositories/RouteRepository';
import { RouteService } from '../services/RouteService';
import { RouteController } from '../controllers/RouteController';

const router = Router();
const repo = new RouteRepository(db);
const service = new RouteService(repo);
const controller = new RouteController(service);

router.get('/', controller.getRoute);

export default router;
