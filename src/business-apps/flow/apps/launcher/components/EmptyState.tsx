import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Workflow, RefreshCw } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  'data-testid'?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  'data-testid': testId
}) => {
  return (
    <div
      className="gba:p-12 gba:rounded-lg gba:border gba:text-center"
      style={{
        backgroundColor: 'var(--color-surface-secondary)',
        borderColor: 'var(--color-border-default)',
        borderStyle: 'dashed'
      }}
      data-testid={testId}
    >
      <div
        className="gba:mx-auto gba:mb-6 gba:w-16 gba:h-16 gba:rounded-full gba:flex gba:items-center gba:justify-center"
        style={{
          backgroundColor: 'var(--color-primary-100)',
          color: 'var(--color-primary-600)'
        }}
      >
        {icon || <Workflow size={32} />}
      </div>

      <h3 className="gba:text-xl gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h3>

      <p className="gba:text-base gba:mb-6 gba:max-w-md gba:mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          variant="outline"
          onClick={onAction}
          className="gba:gap-2"
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            borderColor: 'var(--color-primary-300)',
            color: 'var(--color-primary-600)'
          }}
        >
          <RefreshCw size={16} />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
