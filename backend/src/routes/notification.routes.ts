import { Router } from 'express';
import {
  getNotificationPreferencesController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
  updateNotificationPreferencesController,
  userEventsStreamController,
} from '../controllers/notification.controller';
import { authenticate, verifyCsrf } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/stream', userEventsStreamController);
router.get('/preferences', getNotificationPreferencesController);
router.patch('/preferences', verifyCsrf, updateNotificationPreferencesController);
router.get('/', listNotificationsController);
router.patch('/read-all', verifyCsrf, markAllNotificationsReadController);
router.patch('/:id/read', verifyCsrf, markNotificationReadController);

export default router;

