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
  EmptyState,
  ScrollArea
} from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, type Icon } from '@phosphor-icons/react'

export interface WorkplacePanelProps {
  title: string
  icon?: Icon
  /** Optional count rendered as a badge next to the title. */
  count?: number
  /** When provided, the title becomes a link into the owning app. */
  onTitleClick?: () => void
  /** Accessible label / tooltip for the title link. */
  titleActionLabel?: string
  /** Optional trailing node (e.g. an "Open app" action). */
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
 * Card-wrapped panel used across the Digital Workplace dashboard. Fills its
 * grid cell, keeps the header pinned and scrolls its body internally so the
 * whole dashboard stays on one screen. Centralizes loading / error / empty
 * states so each panel stays small.
 */
const WorkplacePanel: React.FC<WorkplacePanelProps> = ({
  title,
  icon: PanelIcon,
  count,
  onTitleClick,
  titleActionLabel,
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
    <Card
      variant="surface"
      className={`gba:flex gba:min-h-0 gba:min-w-0 gba:flex-col gba:overflow-hidden ${className ?? ''}`}
      data-testid={testId}
    >
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2 gba:space-y-0 gba:shrink-0">
        <CardTitle className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:text-base">
          {PanelIcon ? <PanelIcon className="gba:size-4 gba:shrink-0 gba:text-muted-foreground" /> : null}
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              title={titleActionLabel}
              aria-label={titleActionLabel}
              className="gba:group/title gba:flex gba:min-w-0 gba:items-center gba:gap-1 gba:rounded-md gba:text-left gba:text-foreground gba:transition-colors gba:hover:text-primary gba:focus-visible:outline-none gba:focus-visible:text-primary"
              data-testid={`${testId}-title-link`}
            >
              <span className="gba:truncate">{title}</span>
              <ArrowSquareOutIcon className="gba:size-3.5 gba:shrink-0 gba:opacity-0 gba:transition-opacity gba:group-hover/title:opacity-100" />
            </button>
          ) : (
            <span className="gba:truncate">{title}</span>
          )}
          {typeof count === 'number' ? (
            <Badge variant="secondary" size="sm" data-testid={`${testId}-count`}>
              {count}
            </Badge>
          ) : null}
        </CardTitle>
        {action ? <div className="gba:shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className="gba:min-h-0 gba:flex-1 gba:p-0">
        {/* dw-panel-scroll forces the Radix viewport's inner wrapper to block layout so rows
            shrink/truncate to the column width instead of overflowing (Radix defaults it to display:table). */}
        <ScrollArea className="dw-panel-scroll gba:h-full">
          {/* Extra bottom padding lets the last items scroll clear of the floating composer. */}
          <div className="gba:w-full gba:min-w-0 gba:px-6 gba:pb-20">{renderBody()}</div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default WorkplacePanel
export { WorkplacePanel }
