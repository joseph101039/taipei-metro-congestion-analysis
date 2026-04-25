import { Router } from 'express';
import db from '../config/database';
import { StationDistanceRepository } from '../repositories/StationDistanceRepository';
import { StationDistanceService } from '../services/StationDistanceService';
import { StationDistanceController } from '../controllers/StationDistanceController';

const router = Router();

const repo = new StationDistanceRepository(db);
const service = new StationDistanceService(repo);
const controller = new StationDistanceController(service);

router.get('/', controller.getDistances);

export default router;
