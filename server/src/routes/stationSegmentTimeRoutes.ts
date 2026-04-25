import { Router } from 'express';
import db from '../config/database';
import { StationSegmentTimeRepository } from '../repositories/StationSegmentTimeRepository';
import { StationSegmentTimeService } from '../services/StationSegmentTimeService';
import { StationSegmentTimeController } from '../controllers/StationSegmentTimeController';

const router = Router();
const repo = new StationSegmentTimeRepository(db);
const service = new StationSegmentTimeService(repo);
const controller = new StationSegmentTimeController(service);

router.get('/', controller.getAll);
router.get('/:from/:to', controller.getBySegment);

export default router;

