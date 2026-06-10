import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  EmptyState
} from '@newwork/nw-design-system'
import type { Icon } from '@phosphor-icons/react'

export interface Customer360SectionProps {
  title: string
  icon?: Icon
  /** Optional count rendered as a badge next to the title. */
  count?: number
  /** Optional trailing node (e.g. an action button). */
  action?: React.ReactNode
  loading?: boolean
  error?: string | null
  errorTitle: string
  isEmpty?: boolean
  emptyTitle: string
  emptyDescription?: string
  testId: string
  className?: string
  children?: React.ReactNode
}

/**
 * Card-wrapped section used across every Customer 360 tab. Centralizes the
 * loading / error / empty / content states so individual views stay small and
 * visually consistent.
 */
const Customer360Section: React.FC<Customer360SectionProps> = ({
  title,
  icon: SectionIcon,
  count,
  action,
  loading = false,
  error = null,
  errorTitle,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  testId,
  className,
  children
}) => {
  const renderBody = () => {
    if (loading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
          <Spinner size="md" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" data-testid={`${testId}-error`}>
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (isEmpty) {
      return (
        <EmptyState
          type="no-data"
          title={emptyTitle}
          description={emptyDescription}
          compact
          data-testid={`${testId}-empty`}
        />
      )
    }

    return children
  }

  return (
    <Card variant="surface" className={className} data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2 gba:space-y-0">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
          {SectionIcon ? <SectionIcon className="gba:size-4 gba:text-muted-foreground" /> : null}
          <span>{title}</span>
          {typeof count === 'number' ? (
            <Badge variant="secondary" size="sm" data-testid={`${testId}-count`}>
              {count}
            </Badge>
          ) : null}
        </CardTitle>
        {action ? <div className="gba:shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  )
}

export default Customer360Section
export { Customer360Section }
