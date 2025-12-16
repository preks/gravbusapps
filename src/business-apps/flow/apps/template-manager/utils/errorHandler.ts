/**
 * Error Handler Utility
 * Converts raw errors into enhanced errors with helpful suggestions
 */

import axios, { AxiosError } from 'axios'
import { EnhancedError, ErrorCategory, ErrorSeverity, ErrorContext } from '../types/error'

/**
 * Create an enhanced error from various error sources
 */
export const createEnhancedError = (error: unknown, context: ErrorContext): EnhancedError => {
  const timestamp = new Date().toISOString()

  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    return createAxiosEnhancedError(error, context, timestamp)
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return createStandardEnhancedError(error, context, timestamp)
  }

  // Handle unknown errors
  return createUnknownEnhancedError(error, context, timestamp)
}

/**
 * Create enhanced error from Axios error
 */
const createAxiosEnhancedError = (error: AxiosError, context: ErrorContext, timestamp: string): EnhancedError => {
  const status = error.response?.status
  const responseData = error.response?.data as any

  // CORS Error
  if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
    return {
      category: ErrorCategory.CORS,
      severity: ErrorSeverity.HIGH,
      message: `Cannot connect to ${context.instanceName || 'instance'}`,
      technicalDetails: `Network error when accessing ${context.url}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Check CORS Configuration',
          description: 'The server may not be configured to allow requests from this domain.',
          action: 'Verify CORS settings on the custom-flow-engine instance'
        },
        {
          title: 'Verify URL Protocol',
          description: 'Ensure the instance URL uses HTTPS if your app is on HTTPS.',
          action: 'Check instance configuration in FlowEngineInstances catalog'
        },
        {
          title: 'Check Network Connection',
          description: 'Ensure the instance URL is accessible from your network.',
          action: 'Try accessing the URL directly in your browser'
        }
      ]
    }
  }

  // 401 Unauthorized
  if (status === 401) {
    return {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: 'Authentication failed',
      technicalDetails: `${context.operation}: 401 Unauthorized - ${responseData?.message || error.message}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Refresh Your Session',
          description: 'Your access token may have expired.',
          action: 'Hard refresh (Ctrl+Shift+R) or re-login to the platform'
        },
        {
          title: 'Check API Key',
          description: 'The API key for this instance may be invalid or expired.',
          action: 'Update the API key in FlowEngineInstances catalog'
        },
        {
          title: 'Verify Instance Configuration',
          description: 'Ensure the instance is configured to accept your credentials.',
          action: 'Contact your system administrator'
        }
      ]
    }
  }

  // 403 Forbidden
  if (status === 403) {
    return {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      message: 'Access denied',
      technicalDetails: `${context.operation}: 403 Forbidden - ${responseData?.message || error.message}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Check Permissions',
          description: 'You may not have permission to perform this operation.',
          action: 'Contact your administrator to request access'
        },
        {
          title: 'Verify API Key Permissions',
          description: 'The API key may not have sufficient permissions.',
          action: 'Update API key with required permissions'
        }
      ]
    }
  }

  // 404 Not Found
  if (status === 404) {
    return {
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.MEDIUM,
      message: `${context.templateName || 'Resource'} not found`,
      technicalDetails: `${context.operation}: 404 Not Found - ${context.url}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Template May Not Exist',
          description: 'The template may have been deleted or moved.',
          action: 'Refresh the comparison to get updated template list'
        },
        {
          title: 'Check Instance Health',
          description: 'The instance may be unavailable or misconfigured.',
          action: 'Verify instance health indicator is green'
        },
        {
          title: 'Database Race Condition',
          description: 'Template may not be fully saved yet (timing issue).',
          action: 'Wait a few seconds and try again'
        }
      ]
    }
  }

  // 409 Conflict
  if (status === 409) {
    return {
      category: ErrorCategory.CONFLICT,
      severity: ErrorSeverity.MEDIUM,
      message: 'Conflict detected',
      technicalDetails: `${context.operation}: 409 Conflict - ${responseData?.message || error.message}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Version Conflict',
          description: 'The template may have been updated by another user.',
          action: 'Refresh comparison and try syncing again'
        },
        {
          title: 'Active Workflows',
          description: 'There may be active workflows using this template.',
          action: 'Enable "Skip if Active Workflows" option'
        }
      ]
    }
  }

  // 400 Bad Request (Validation)
  if (status === 400) {
    const errorMessage = responseData?.message || responseData?.error || error.message
    return {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      message: 'Invalid request',
      technicalDetails: `${context.operation}: 400 Bad Request - ${errorMessage}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Check Template Data',
          description: 'The template may have missing or invalid fields.',
          action: 'Ensure template has required fields (name, steps, etc.)'
        },
        {
          title: 'Review Error Details',
          description: errorMessage,
          action: 'Copy technical details and review the template structure'
        }
      ]
    }
  }

  // Timeout
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return {
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      message: 'Request timed out',
      technicalDetails: `${context.operation}: Connection timeout to ${context.url}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Check Network Connection',
          description: 'Your network may be slow or unstable.',
          action: 'Verify your internet connection and try again'
        },
        {
          title: 'Instance May Be Slow',
          description: 'The instance may be under heavy load.',
          action: 'Wait a moment and try again, or contact your administrator'
        },
        {
          title: 'Increase Timeout',
          description: 'Large templates may take longer to sync.',
          action: 'Contact support to adjust timeout settings'
        }
      ]
    }
  }

  // 500+ Server Error
  if (status && status >= 500) {
    return {
      category: ErrorCategory.SERVER_ERROR,
      severity: ErrorSeverity.HIGH,
      message: 'Server error',
      technicalDetails: `${context.operation}: ${status} ${error.message}`,
      originalError: error,
      timestamp,
      context,
      suggestions: [
        {
          title: 'Instance Issue',
          description: 'The custom-flow-engine instance encountered an error.',
          action: 'Check instance logs and health status'
        },
        {
          title: 'Try Again Later',
          description: 'The issue may be temporary.',
          action: 'Wait a few minutes and retry the operation'
        },
        {
          title: 'Contact Administrator',
          description: 'If the issue persists, contact your system administrator.',
          action: 'Provide error details and timestamp for investigation'
        }
      ]
    }
  }

  // Generic network error
  return {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'Network error',
    technicalDetails: `${context.operation}: ${error.message}`,
    originalError: error,
    timestamp,
    context,
    suggestions: [
      {
        title: 'Check Connection',
        description: 'Verify your network connection is stable.',
        action: 'Try reloading the page or checking other websites'
      },
      {
        title: 'Verify Instance URL',
        description: 'Ensure the instance URL is correct and accessible.',
        action: 'Check FlowEngineInstances catalog configuration'
      }
    ]
  }
}

/**
 * Create enhanced error from standard Error
 */
const createStandardEnhancedError = (error: Error, context: ErrorContext, timestamp: string): EnhancedError => {
  return {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: error.message || 'An unexpected error occurred',
    technicalDetails: `${context.operation}: ${error.message}\n${error.stack || ''}`,
    originalError: error,
    timestamp,
    context,
    suggestions: [
      {
        title: 'Refresh and Try Again',
        description: 'This may be a temporary issue.',
        action: 'Reload the page and retry the operation'
      },
      {
        title: 'Check Browser Console',
        description: 'More details may be available in the console.',
        action: 'Press F12 to open developer tools and check the console'
      }
    ]
  }
}

/**
 * Create enhanced error from unknown error
 */
const createUnknownEnhancedError = (error: unknown, context: ErrorContext, timestamp: string): EnhancedError => {
  const errorString = String(error)
  return {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.LOW,
    message: 'An unexpected error occurred',
    technicalDetails: `${context.operation}: ${errorString}`,
    originalError: error,
    timestamp,
    context,
    suggestions: [
      {
        title: 'Refresh the Page',
        description: 'Try reloading to clear any temporary state.',
        action: 'Hard refresh with Ctrl+Shift+R'
      }
    ]
  }
}

/**
 * Format enhanced error for display
 */
export const formatErrorForDisplay = (error: EnhancedError): string => {
  return `[${error.category.toUpperCase()}] ${error.message}`
}

/**
 * Format enhanced error for clipboard (technical details)
 */
export const formatErrorForClipboard = (error: EnhancedError): string => {
  const lines = [
    '=== Template Manager Error Report ===',
    '',
    `Timestamp: ${error.timestamp}`,
    `Category: ${error.category}`,
    `Severity: ${error.severity}`,
    '',
    `Message: ${error.message}`,
    ''
  ]

  if (error.technicalDetails) {
    lines.push('Technical Details:')
    lines.push(error.technicalDetails)
    lines.push('')
  }

  if (error.context) {
    lines.push('Context:')
    Object.entries(error.context).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value}`)
    })
    lines.push('')
  }

  if (error.suggestions.length > 0) {
    lines.push('Suggested Solutions:')
    error.suggestions.forEach((suggestion, index) => {
      lines.push(`${index + 1}. ${suggestion.title}`)
      lines.push(`   ${suggestion.description}`)
      if (suggestion.action) {
        lines.push(`   Action: ${suggestion.action}`)
      }
      lines.push('')
    })
  }

  return lines.join('\n')
}

/**
 * Get severity color for UI
 */
export const getSeverityColor = (severity: ErrorSeverity): string => {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'destructive'
    case ErrorSeverity.HIGH:
      return 'destructive'
    case ErrorSeverity.MEDIUM:
      return 'warning'
    case ErrorSeverity.LOW:
      return 'default'
    default:
      return 'default'
  }
}

/**
 * Get category icon for UI
 */
export const getCategoryIcon = (category: ErrorCategory): string => {
  switch (category) {
    case ErrorCategory.NETWORK:
      return '🌐'
    case ErrorCategory.AUTHENTICATION:
      return '🔐'
    case ErrorCategory.AUTHORIZATION:
      return '🚫'
    case ErrorCategory.VALIDATION:
      return '⚠️'
    case ErrorCategory.NOT_FOUND:
      return '🔍'
    case ErrorCategory.CONFLICT:
      return '⚔️'
    case ErrorCategory.SERVER_ERROR:
      return '🔥'
    case ErrorCategory.TIMEOUT:
      return '⏱️'
    case ErrorCategory.CORS:
      return '🔒'
    default:
      return '❓'
  }
}
