import { Router } from 'express';
import db from '../config/database';
import { StationRepository } from '../repositories/StationRepository';
import { StationService } from '../services/StationService';
import { StationController } from '../controllers/StationController';

const router = Router();
const repo = new StationRepository(db);
const service = new StationService(repo);
const controller = new StationController(service);

router.get('/', controller.getStations);
router.get('/:code', controller.getStationByCode);

export default router;
