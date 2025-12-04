import React from 'react'
import { CardHeader, CardTitle } from '@newwork/nw-design-system'
import { formatFlowName, extractOperation } from './utils/formSchemaUtils'

interface FormHeaderProps {
  flowName: string
  moduleName?: string
  isDeleteOperation: boolean
}

export const FormHeader: React.FC<FormHeaderProps> = ({ flowName, moduleName, isDeleteOperation }) => {
  const operation = extractOperation(flowName)
  const isCreateOperation = operation === 'Create'
  const isUpdateOperation = operation === 'Update'

  return (
    <CardHeader
      className={`gba:border-b-2 ${
        isDeleteOperation
          ? 'gba:bg-gradient-to-r gba:from-destructive-secondary/50 gba:to-destructive-secondary/30 gba:border-destructive/30'
          : 'gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30'
      }`}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          {isDeleteOperation ? (
            <svg className="gba:h-5 gba:w-5 gba:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ) : (
            <svg className="gba:h-5 gba:w-5 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
          <CardTitle
            className={
              isDeleteOperation
                ? 'gba:bg-gradient-to-r gba:from-destructive gba:to-destructive/80 gba:bg-clip-text gba:text-transparent'
                : 'gba:text-foreground'
            }
          >
            {formatFlowName(flowName)}
          </CardTitle>
        </div>
        {operation && (
          <span
            className={`gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded-md gba:capitalize ${
              isDeleteOperation
                ? 'gba:bg-destructive-secondary gba:text-destructive'
                : isCreateOperation
                  ? 'gba:bg-success-secondary gba:text-success'
                  : isUpdateOperation
                    ? 'gba:bg-info-secondary gba:text-info'
                    : 'gba:bg-muted gba:text-muted-foreground'
            }`}
          >
            {operation}
          </span>
        )}
      </div>
      {moduleName && <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{moduleName}</p>}
    </CardHeader>
  )
}
