import { Router } from 'express';
import db from '../config/database';
import { VillagePopulationRepository } from '../repositories/VillagePopulationRepository';
import { VillagePopulationService } from '../services/VillagePopulationService';
import { VillagePopulationController } from '../controllers/VillagePopulationController';

const router = Router();
const repo = new VillagePopulationRepository(db);
const service = new VillagePopulationService(repo);
const controller = new VillagePopulationController(service);

router.get('/village-density', controller.getVillagePopulation);
router.get('/village-boundaries', controller.getVillageBoundaries);

export default router;
