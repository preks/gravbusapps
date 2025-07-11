import express from 'express';
import {
  getClaimableTasksController,
  getUserTasksController,
  getTaskController,
  claimTaskController,
  releaseTaskController,
  completeTaskController,
  getTaskStatsController
} from '../controllers/taskController';

const router = express.Router();

/**
 * GET /api/tasks/claimable
 * Get tasks that can be claimed by a user
 * Query params: userId (required)
 */
router.get('/claimable', getClaimableTasksController);

/**
 * GET /api/tasks/user/:userId
 * Get tasks assigned to a specific user
 * Path params: userId (required)
 * Query params: status (optional), limit (optional)
 */
router.get('/user/:userId', getUserTasksController);

/**
 * POST /api/tasks/:taskId/claim
 * Claim a task for a user
 * Path params: taskId (required)
 * Body: { userId: string }
 */
router.post('/:taskId/claim', claimTaskController);

/**
 * POST /api/tasks/:taskId/release
 * Release a task from a user
 * Path params: taskId (required)
 * Body: { userId: string }
 */
router.post('/:taskId/release', releaseTaskController);

/**
 * POST /api/tasks/:taskId/complete
 * Complete a task
 * Path params: taskId (required)
 * Body: { outputData: object }
 */
router.post('/:taskId/complete', completeTaskController);

/**
 * GET /api/tasks/:taskId
 * Get a specific task by ID
 * Path params: taskId (required)
 * Query params: userId (optional, for enhanced task info)
 */
router.get('/:taskId', getTaskController);

/**
 * GET /api/tasks/user/:userId/stats
 * Get task statistics for a user
 * Path params: userId (required)
 */
router.get('/user/:userId/stats', getTaskStatsController);

/**
 * POST /api/tasks/assignment/resolve
 * Test assignment resolution
 * Body: { targets: AssignmentTarget[] }
 */
router.post('/assignment/resolve', (req: any, res: any) => {
  try {
    const { resolveAssignmentTargets, getOrganizationalInfo } = require('../services/assignmentResolutionService');
    const { targets } = req.body;
    
    if (!targets || !Array.isArray(targets)) {
      return res.status(400).json({
        status: 'error',
        message: 'targets array is required'
      });
    }
    
    const resolvedUsers = resolveAssignmentTargets(targets);
    const orgInfo = getOrganizationalInfo();
    
    res.json({
      status: 'success',
      data: {
        targets,
        resolvedUsers,
        organizationalInfo: orgInfo
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to resolve assignment targets'
    });
  }
});

export default router;
