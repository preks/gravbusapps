/**
 * Enhanced Error Types for Template Manager
 * Provides categorized errors with actionable suggestions
 */

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  CORS = 'cors',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorSuggestion {
  title: string
  description: string
  action?: string
  actionUrl?: string
}

export interface EnhancedError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  technicalDetails?: string
  originalError?: Error | unknown
  suggestions: ErrorSuggestion[]
  timestamp: string
  context?: Record<string, any>
}

export interface ErrorContext {
  operation: string
  instanceName?: string
  templateName?: string
  templateId?: string
  url?: string
  statusCode?: number
  [key: string]: any
}
