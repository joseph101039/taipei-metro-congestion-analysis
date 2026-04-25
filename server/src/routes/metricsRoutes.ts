import { Router } from 'express';
import { MetricsController } from '../controllers/MetricsController';

const router = Router();
const controller = new MetricsController();

router.get('/', controller.getMetrics);

export default router;
