import express from 'express';
import { requireClerkAuth } from '../middleware/clerkAuth.js';
import {
  claimStealthIssue,
  getStealthClaimPreview,
  listStealthIssues,
  refreshStealthIssue,
} from '../controllers/stealthController.js';

const router = express.Router();

router.use(requireClerkAuth);

router.get('/issues', listStealthIssues);
router.post('/issues/:issueId/refresh', refreshStealthIssue);
router.get('/issues/:issueId/claim-preview', getStealthClaimPreview);
router.post('/issues/:issueId/claim', claimStealthIssue);

export default router;
