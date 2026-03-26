import React from 'react'
import { CardHeader, CardTitle } from '@newwork/nw-design-system'
import { formatFlowName, extractOperation } from './utils/formSchemaUtils'

interface FormHeaderProps {
  flowName: string
  isDeleteOperation: boolean
  operation?: 'create' | 'update' | 'delete'
  bulkItemCount?: number
}

export const FormHeader: React.FC<FormHeaderProps> = ({
  flowName,
  isDeleteOperation,
  operation: operationProp,
  bulkItemCount
}) => {
  // Use provided operation or extract from flow name as fallback
  const extractedOperation = extractOperation(flowName)
  const operation = operationProp
    ? operationProp === 'delete'
      ? 'Delete'
      : operationProp === 'update'
        ? 'Update'
        : 'Create'
    : extractedOperation

  // Get badge styling based on operation type
  const getBadgeClassName = () => {
    if (isDeleteOperation) return 'gba:bg-destructive-secondary gba:text-destructive'
    if (operation === 'Create') return 'gba:bg-success-secondary gba:text-success'
    if (operation === 'Update') return 'gba:bg-info-secondary gba:text-info'
    return 'gba:bg-muted gba:text-muted-foreground'
  }

  // Icon paths for different operation types
  const iconPath = isDeleteOperation ? (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  ) : (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  )

  return (
    <CardHeader className="gba:border-b-2 gba:p-0 gba:overflow-hidden">
      <div className="gba:w-full gba:bg-muted/50 gba:shadow-sm gba:px-4 gba:py-3">
        <div className="gba:flex gba:items-center gba:gap-2 gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <svg className="gba:h-4 gba:w-4 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {iconPath}
            </svg>
            <CardTitle className="gba:text-foreground gba:text-base">{formatFlowName(flowName)}</CardTitle>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            {bulkItemCount != null && (
              <span className="gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded-md gba:bg-info-secondary gba:text-info">
                x{bulkItemCount}
              </span>
            )}
            {operation && (
              <span
                className={`gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded-md gba:capitalize ${getBadgeClassName()}`}
              >
                {operation}
              </span>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
  )
}
