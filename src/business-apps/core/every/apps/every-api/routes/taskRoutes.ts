/**
 * Task Routes for Every API
 *
 * JSON-only API endpoints for unified task management
 */

import { TaskFilters } from '../types/TaskFilters'
import { UserTasksResponse, TaskStatsResponse, SingleTaskResponse } from '../types/UnifiedTask'
import { fetchAllUserTasks, fetchTaskById, fetchTaskStatistics } from '../services/UnifiedTaskService'
import {
  normalizeJsonPath,
  createJsonResponse,
  createErrorResponse,
  parseQueryParams,
  extractUserId,
  extractTaskId,
  logRequest,
  logError
} from '../utils/middleware'

/**
 * Handle GET /tasks/user/:userId[.json]
 *
 * Fetch all tasks for a user with optional filtering
 */
export async function handleGetUserTasks(request: Request, userId: string, accessToken?: string): Promise<Response> {
  try {
    logRequest('GET', `/tasks/user/${userId}`)

    // Parse query parameters
    const url = new URL(request.url)
    const params = parseQueryParams(url.searchParams)

    // Build filters from query params
    const filters: Partial<TaskFilters> = {}

    if (params.status) {
      filters.status = params.status as any
    }

    if (params.search) {
      filters.search = params.search
    }

    if (params.source) {
      filters.source = params.source as any
    }

    if (params.priority) {
      filters.priority = Number.parseInt(params.priority, 10)
    }

    if (params.taskCategory) {
      filters.taskCategory = params.taskCategory
    }

    if (params.assignedTo) {
      filters.assignedTo = params.assignedTo
    }

    if (params.limit) {
      filters.limit = Number.parseInt(params.limit, 10)
    }

    if (params.offset) {
      filters.offset = Number.parseInt(params.offset, 10)
    }

    if (params.sortBy) {
      filters.sortBy = params.sortBy as any
    }

    if (params.sortOrder) {
      filters.sortOrder = params.sortOrder as any
    }

    if (params.claimableOnly === 'true') {
      filters.claimableOnly = true
    }

    if (params.assignedOnly === 'true') {
      filters.assignedOnly = true
    }

    // Fetch tasks
    const result = await fetchAllUserTasks(userId, accessToken, filters)

    // Build response
    const response: UserTasksResponse = {
      status: result.errors.length > 0 ? 'partial' : 'success',
      count: result.tasks.length,
      tasks: result.tasks,
      pagination: {
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        total: result.tasks.length,
        hasMore: false // Would need total count from service to determine this
      }
    }

    if (result.warnings.length > 0) {
      response.warnings = result.warnings
    }

    if (result.errors.length > 0) {
      response.errors = result.errors
    }

    return createJsonResponse(response)
  } catch (error) {
    logError('GET', `/tasks/user/${userId}`, error)
    return createErrorResponse(
      'Failed to fetch user tasks',
      500,
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * Handle GET /tasks/user/:userId/stats[.json]
 *
 * Fetch task statistics for a user
 */
export async function handleGetUserTaskStats(
  request: Request,
  userId: string,
  accessToken?: string
): Promise<Response> {
  try {
    logRequest('GET', `/tasks/user/${userId}/stats`)

    // Fetch statistics
    const result = await fetchTaskStatistics(userId, accessToken)

    // Build response
    const response: TaskStatsResponse = {
      status: result.errors.length > 0 ? 'partial' : 'success',
      statistics: result.statistics
    }

    if (result.warnings.length > 0) {
      response.warnings = result.warnings
    }

    if (result.errors.length > 0) {
      response.errors = result.errors
    }

    return createJsonResponse(response)
  } catch (error) {
    logError('GET', `/tasks/user/${userId}/stats`, error)
    return createErrorResponse(
      'Failed to fetch task statistics',
      500,
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * Handle GET /tasks/:taskId[.json]
 *
 * Fetch a single task by ID
 */
export async function handleGetTask(
  request: Request,
  taskId: string,
  userId: string,
  accessToken?: string
): Promise<Response> {
  try {
    logRequest('GET', `/tasks/${taskId}`)

    // Fetch task
    const task = await fetchTaskById(taskId, userId, accessToken)

    if (!task) {
      return createErrorResponse('Task not found', 404)
    }

    // Build response
    const response: SingleTaskResponse = {
      status: 'success',
      task
    }

    return createJsonResponse(response)
  } catch (error) {
    logError('GET', `/tasks/${taskId}`, error)
    return createErrorResponse('Failed to fetch task', 500, error instanceof Error ? error.message : String(error))
  }
}

/**
 * Route dispatcher
 *
 * Routes requests to appropriate handlers based on path
 */
export async function handleTaskRequest(request: Request, accessToken?: string): Promise<Response> {
  const url = new URL(request.url)
  const pathname = normalizeJsonPath(url.pathname)

  // Only handle GET requests
  if (request.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405)
  }

  // Route: GET /tasks/user/:userId/stats
  if (/\/tasks\/user\/[^/]+\/stats$/.exec(pathname)) {
    const userId = extractUserId(pathname)
    if (!userId) {
      return createErrorResponse('Invalid user ID', 400)
    }
    return handleGetUserTaskStats(request, userId, accessToken)
  }

  // Route: GET /tasks/user/:userId
  if (/\/tasks\/user\/[^/]+$/.exec(pathname)) {
    const userId = extractUserId(pathname)
    if (!userId) {
      return createErrorResponse('Invalid user ID', 400)
    }
    return handleGetUserTasks(request, userId, accessToken)
  }

  // Route: GET /tasks/:taskId
  if (/\/tasks\/[^/]+$/.exec(pathname)) {
    const taskId = extractTaskId(pathname)
    if (!taskId) {
      return createErrorResponse('Invalid task ID', 400)
    }

    // userId is required for task lookup
    const params = parseQueryParams(url.searchParams)
    const userId = params.userId
    if (!userId) {
      return createErrorResponse('Missing required query parameter: userId', 400)
    }

    return handleGetTask(request, taskId, userId, accessToken)
  }

  // No matching route
  return createErrorResponse('Not found', 404)
}
