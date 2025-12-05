import React from 'react'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

/**
 * Pure helper functions for delete popup UI rendering
 * These are simple utility functions that return JSX, not React components
 */

export const renderLoadingState = (prefixDataTestId: string, entityType: string) => (
  <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
    <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
    <p>{getTranslationFromI18nKeyAndLabel(`${entityType}.delete.loading`, `Loading ${entityType}...`)}</p>
  </div>
)

export const renderErrorState = (prefixDataTestId: string, entityType: string, error: string) => (
  <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
    <Alert variant="destructive">
      <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
        {error ||
          getTranslationFromI18nKeyAndLabel(`${entityType}.delete.error.failed`, `Failed to load ${entityType}`)}
      </AlertDescription>
    </Alert>
  </div>
)

export const renderDeleteWarning = (
  prefixDataTestId: string,
  confirmationQuestion: string,
  displayName: string,
  createdAt: string,
  ownerName: string
) => (
  <div
    className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
    data-testid={formatDataTestId(prefixDataTestId, 'warning')}
  >
    <div className="gba:flex">
      <div className="gba:flex-shrink-0">
        <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="gba:ml-3">
        <h3 className="gba:text-sm gba:font-medium gba:text-destructive">{confirmationQuestion}</h3>
        <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
          <p>
            <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
            <Badge variant="outline" className="gba:ml-1">
              {displayName}
            </Badge>
          </p>
          <p className="gba:mt-1">
            <strong>{getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At')}:</strong>{' '}
            <Badge variant="outline" className="gba:ml-1">
              {formatDate(createdAt)}
            </Badge>
          </p>
          <p className="gba:mt-1">
            <strong>{getTranslationFromI18nKeyAndLabel('common.owner', 'Owner')}:</strong>{' '}
            <Badge variant="outline" className="gba:ml-1">
              {ownerName}
            </Badge>
          </p>
          <p className="gba:mt-2 gba:font-medium gba:text-destructive">
            {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
          </p>
        </div>
      </div>
    </div>
  </div>
)
