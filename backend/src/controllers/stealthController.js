import prisma from '../lib/prisma.js';
import logger from '../services/loggerService.js';
import {
  claimStealthIssueForUser,
  getStealthClaimPreviewForUser,
  listStealthIssuesForAuthenticatedUser,
  refreshStealthIssueForUser,
} from '../services/stealthLifecycleService.js';

async function findAuthenticatedUser(clerkUserId) {
  return prisma.user.findUnique({ where: { email: clerkUserId } });
}

export async function listStealthIssues(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);

    if (!user) {
      return res.status(200).json({ success: true, issues: [] });
    }

    const statuses = String(req.query.status || '')
      .split(',')
      .map((value) => String(value || '').trim().toUpperCase())
      .filter(Boolean);

    const issues = await listStealthIssuesForAuthenticatedUser(user.id, { statuses });
    return res.status(200).json({ success: true, issues });
  } catch (error) {
    logger.error('[Stealth] listStealthIssues error', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to load stealth issues' });
  }
}

export async function refreshStealthIssue(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const issue = await refreshStealthIssueForUser(user.id, req.params.issueId);
    return res.status(200).json({ success: true, issue });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logger.error('[Stealth] refreshStealthIssue error', { error: error.message, issueId: req.params.issueId });
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Failed to refresh stealth issue' : error.message,
    });
  }
}

export async function getStealthClaimPreview(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await getStealthClaimPreviewForUser(user.id, req.params.issueId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logger.error('[Stealth] getStealthClaimPreview error', { error: error.message, issueId: req.params.issueId });
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Failed to build stealth claim preview' : error.message,
    });
  }
}

export async function claimStealthIssue(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await claimStealthIssueForUser(user.id, req.params.issueId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logger.error('[Stealth] claimStealthIssue error', { error: error.message, issueId: req.params.issueId });
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Failed to claim stealth funds' : error.message,
    });
  }
}

export default {
  listStealthIssues,
  refreshStealthIssue,
  getStealthClaimPreview,
  claimStealthIssue,
};
