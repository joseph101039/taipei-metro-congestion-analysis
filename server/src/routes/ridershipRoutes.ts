import { Router } from 'express';
import db from '../config/database';
import { RidershipRepository } from '../repositories/RidershipRepository';
import { RidershipService } from '../services/RidershipService';
import { RidershipController } from '../controllers/RidershipController';

const router = Router();
const repo = new RidershipRepository(db);
const service = new RidershipService(repo);
const controller = new RidershipController(service);

router.get('/', controller.getSnapshot);
router.get('/flows', controller.getFlows);

export default router;


