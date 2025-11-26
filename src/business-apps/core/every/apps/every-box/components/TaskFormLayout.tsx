/**
 * TaskFormLayout Component
 *
 * Unified layout wrapper for task forms that handles:
 * - Proper padding structure for sticky header/footer
 * - Scrollable content area
 * - Consistent spacing and alignment
 *
 * This component eliminates the need to manually manage px-6/py-6 padding
 * and ensures TaskDetailHeader and TaskDetailFooter work correctly.
 *
 * Usage:
 * ```tsx
 * <TaskFormLayout
 *   header={<TaskDetailHeader {...} />}
 *   footer={<TaskDetailFooter {...} />}
 * >
 *   <YourFormContent />
 * </TaskFormLayout>
 * ```
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'

export interface TaskFormLayoutProps {
  /**
   * Header component (typically TaskDetailHeader)
   * Will be rendered with sticky positioning at the top
   */
  header?: React.ReactNode

  /**
   * Main content area (scrollable)
   */
  children: React.ReactNode

  /**
   * Footer component (typically TaskDetailFooter)
   * Will be rendered with sticky positioning at the bottom
   */
  footer?: React.ReactNode

  /**
   * Additional CSS classes for the root container
   */
  className?: string

  /**
   * Additional CSS classes for the content area
   */
  contentClassName?: string

  /**
   * Test ID for the root container
   */
  'data-testid'?: string
}

/**
 * TaskFormLayout provides the proper structure for forms with sticky header/footer.
 *
 * Layout structure:
 * ```
 * <div className="gba:flex gba:flex-col gba:h-full gba:px-6">  ← px-6 here
 *   {header}                                                    ← sticky top
 *   <div className="gba:flex-1 gba:overflow-y-auto gba:py-6">  ← py-6 only
 *     {children}
 *   </div>
 *   {footer}                                                    ← sticky bottom
 * </div>
 * ```
 *
 * The px-6 padding on the parent container is critical for TaskDetailHeader
 * and TaskDetailFooter components to work correctly with their negative margins
 * and width calculations (gba:-mx-6 gba:w-[calc(100%+3rem)]).
 */
const TaskFormLayoutBase: React.FC<TaskFormLayoutProps> = ({
  header,
  children,
  footer,
  className,
  contentClassName,
  'data-testid': dataTestId = 'task-form-layout'
}) => {
  return (
    <div
      className={cn(
        'gba:flex',
        'gba:flex-col',
        'gba:h-full',
        'gba:px-6', // Critical: Parent padding for header/footer negative margins
        className
      )}
      data-testid={dataTestId}
    >
      {/* Sticky Header */}
      {header}

      {/* Scrollable Content Area */}
      <div
        className={cn(
          'gba:flex-1',
          'gba:overflow-y-auto',
          'gba:py-6', // Vertical padding only - horizontal padding comes from parent
          'gba:min-h-0', // Allow flex item to shrink below content size
          contentClassName
        )}
        data-testid={`${dataTestId}-content`}
      >
        {children}
      </div>

      {/* Sticky Footer */}
      {footer}
    </div>
  )
}

/**
 * TaskFormLayout.Simple - Simplified version without footer
 * Useful for read-only views or forms without actions
 */
export const TaskFormLayoutSimple: React.FC<Omit<TaskFormLayoutProps, 'footer'>> = ({
  header,
  children,
  className,
  contentClassName,
  'data-testid': dataTestId
}) => {
  return (
    <TaskFormLayout header={header} className={className} contentClassName={contentClassName} data-testid={dataTestId}>
      {children}
    </TaskFormLayout>
  )
}

/**
 * TaskFormLayout.Content - Just the content wrapper
 * For forms that need to manage header/footer separately
 */
export const TaskFormLayoutContent: React.FC<{
  children: React.ReactNode
  className?: string
  'data-testid'?: string
}> = ({ children, className, 'data-testid': dataTestId = 'task-form-content' }) => {
  return (
    <div
      className={cn('gba:flex-1', 'gba:overflow-y-auto', 'gba:space-y-6', 'gba:min-h-0', className)}
      data-testid={dataTestId}
    >
      {children}
    </div>
  )
}

// Export with compound components pattern
export const TaskFormLayout = Object.assign(TaskFormLayoutBase, {
  Simple: TaskFormLayoutSimple,
  Content: TaskFormLayoutContent
})
