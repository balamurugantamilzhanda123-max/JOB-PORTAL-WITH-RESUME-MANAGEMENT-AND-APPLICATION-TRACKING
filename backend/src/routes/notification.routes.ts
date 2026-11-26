import { Router } from 'express';
import {
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
  userEventsStreamController,
} from '../controllers/notification.controller';
import { authenticate, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/stream', userEventsStreamController);
router.get('/', listNotificationsController);
router.patch('/read-all', verifyCsrf, markAllNotificationsReadController);
router.patch('/:id/read', verifyCsrf, markNotificationReadController);

export default router;

