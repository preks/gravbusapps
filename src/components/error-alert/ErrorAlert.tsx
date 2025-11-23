import React from 'react'
import { Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import translations from './_i18n'

export type ErrorType =
  | 'accessToken'
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'serverError' // 500
  | 'networkError'
  | 'graphqlError'
  | 'restError'
  | 'unknown'

export interface ErrorAlertProps {
  error: Error | string | unknown
  type?: ErrorType // Optional: Auto-detect wenn nicht angegeben
  context?: string // Optional: Zusätzlicher Kontext
  dataTestId?: string
}

const getErrorType = (error: unknown): ErrorType => {
  const errorString = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error)

  if (!errorString) return 'unknown'

  // Access token
  if (
    errorString.includes('accessToken') ||
    errorString.includes('access token') ||
    errorString.includes('Authorization')
  ) {
    return 'accessToken'
  }

  // HTTP Status Codes
  if (errorString.includes('401') || errorString.includes('Unauthorized')) return 'unauthorized'
  if (errorString.includes('403') || errorString.includes('Forbidden')) return 'forbidden'
  if (errorString.includes('404') || errorString.includes('Not Found')) return 'notFound'
  if (errorString.includes('500') || errorString.includes('Internal Server Error')) return 'serverError'

  // Network
  if (errorString.includes('Network') || errorString.includes('fetch') || errorString.includes('connection')) {
    return 'networkError'
  }

  // API Types
  if (errorString.includes('GraphQL')) return 'graphqlError'
  if (errorString.includes('REST request failed')) return 'restError'

  return 'unknown'
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, type, context, dataTestId = 'error-alert' }) => {
  const { t } = useTranslation(translations)
  const errorType = type || getErrorType(error)

  const translationKey = `error-${errorType}` as const
  const message = t(translationKey)

  return (
    <Alert variant="destructive" data-testid={dataTestId}>
      <AlertDescription>
        {message}
        {context && <span className="gba:block gba:mt-2 gba:text-sm gba:opacity-80">{context}</span>}
      </AlertDescription>
    </Alert>
  )
}
