import { Router } from 'express';
import db from '../config/database';
import { LineCapacityRepository } from '../repositories/LineCapacityRepository';
import { LineCapacityService } from '../services/LineCapacityService';
import { LineCapacityController } from '../controllers/LineCapacityController';

const router = Router();
const repo = new LineCapacityRepository(db);
const service = new LineCapacityService(repo);
const controller = new LineCapacityController(service);

router.get('/', controller.getAll);

export default router;

