import { Router } from 'express';
import db from '../config/database';
import { TransferOverheadRepository } from '../repositories/TransferOverheadRepository';
import { TransferOverheadService } from '../services/TransferOverheadService';
import { TransferOverheadController } from '../controllers/TransferOverheadController';

const router = Router();
const repo = new TransferOverheadRepository(db);
const service = new TransferOverheadService(repo);
const controller = new TransferOverheadController(service);

router.get('/', controller.getAll);
router.get('/:sid', controller.getBySid);

export default router;

