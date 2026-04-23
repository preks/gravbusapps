import React, { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Spinner,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import type { InvestmentTaskQueryVariables } from '@/common/data/investment/queries/investmentTaskQueries'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'

interface InvestmentPortalTasksProps {
  investmentId: string
  context: BusinessAppContextProps
}

const InvestmentPortalTasks: React.FC<InvestmentPortalTasksProps> = ({ investmentId, context }) => {
  const [tasks, setTasks] = useState<InvestmentTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks using the existing hook
  const { fetchInvestmentTasks } = useInvestmentTasks(context)

  // Get current user employee ID from userInfo
  const currentEmployeeId = context.userInfo?.employeeDetails?.employeeId

  // Build reference URLs for IRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead':
        return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
      case 'account':
        return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id })
      case 'contact':
        return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id })
      case 'opportunity':
        return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id })
      case 'investment':
        return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
      default:
        return ''
    }
  }

  // Function to load tasks
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // CRITICAL: SERVER-SIDE FILTERING
      // Show tasks that are:
      // 1. For this specific investment, AND
      // 2. Either assigned to the current user OR created by the current user
      const queryVariables: InvestmentTaskQueryVariables = {
        // investmentIds not in descriptors - must use customConditions instead
        orderBy: [{ field: 'dueDate', direction: 'ASC_NULLS_LAST' }] as Array<{
          field: string
          direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
        }>,
        limit: 100,
        offset: 0
      }

      // Build custom conditions array
      const customConditions: Record<string, any>[] = []

      // CRITICAL: Filter by investmentId (not in descriptors, must use customConditions)
      customConditions.push({ investmentId: { _eq: investmentId } })

      // Build OR condition for tasks assigned to OR created by current user
      if (currentEmployeeId) {
        customConditions.push({
          _or: [
            {
              taskAssignees: {
                assignedEmployeeId: { _eq: currentEmployeeId },
                isDeleted: { _eq: false }
              }
            },
            { creatorEmployeeId: { _eq: currentEmployeeId } }
          ]
        })
      }

      // Query tasks filtered by investment and current user (assigned OR created)
      const result = await fetchInvestmentTasks(queryVariables, {
        orConditions: customConditions.length > 0 ? customConditions : undefined
      })

      setTasks(result.tasks || [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('error.loading.tasks', 'Failed to load tasks')
      )
    } finally {
      setIsLoading(false)
    }
  }, [investmentId, currentEmployeeId, fetchInvestmentTasks])

  // Load tasks on mount
  useEffect(() => {
    if (investmentId) {
      loadTasks()
    }
  }, [investmentId, loadTasks])

  // Listen for task creation/update completion
  useProcessCompletion({
    onSuccess: () => {
      loadTasks()
    }
  })

  // Render loading state
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[200px]"
        data-testid="investment-portal-tasks-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid="investment-portal-tasks-error">
        <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.loading.title', 'Error Loading Tasks')}</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={loadTasks} className="gba:ml-4">
            {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Filter tasks by status (use raw tasks, not transformed - let TaskSection handle transformation)
  const openTasks = tasks.filter(task => task.taskStatus?.value?.toUpperCase() !== 'COMPLETED')
  const completedTasks = tasks.filter(task => task.taskStatus?.value?.toUpperCase() === 'COMPLETED')

  const taskEntityActionProps = {
    contextsArray: [FlowContextName.investmentTaskEntity],
    externalContextData: { investmentId },
    prefixDataTestId: 'investment-portal-task-entity',
    emptyStateBehavior: 'enable' as const
  }

  const emptyStateTitle = getTranslationFromI18nKeyAndLabel('investment.portal.tasks.empty.title', 'No tasks yet')
  const emptyStateDescription = getTranslationFromI18nKeyAndLabel(
    'investment.portal.tasks.empty.description',
    'Once a task is assigned to you, you will see it here.'
  )

  // When there are no tasks at all, skip the tabs entirely and render a
  // single empty state so users aren't forced to click between two empty
  // tabs that can't be populated from the portal anyway.
  if (tasks.length === 0) {
    return (
      <Card data-testid="investment-portal-tasks-card">
        <CardContent>
          <TaskSection
            {...context}
            investmentId={investmentId}
            buildReferenceUrl={buildReferenceUrl}
            tasks={[]}
            taskEntityActionProps={taskEntityActionProps}
            emptyStateTitle={emptyStateTitle}
            emptyStateDescription={emptyStateDescription}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="investment-portal-tasks-card">
      <CardContent>
        <Tabs defaultValue="open" data-testid="investment-portal-tasks-tabs">
          <TabsList className="gba:mb-4">
            <TabsTrigger value="open" data-testid="investment-portal-tasks-tab-open">
              {getTranslationFromI18nKeyAndLabel('investment.portal.tasks.tab.open', 'Open')}
              {openTasks.length > 0 && (
                <span className="gba:ml-2 gba:text-xs gba:text-muted-foreground">({openTasks.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="investment-portal-tasks-tab-completed">
              {getTranslationFromI18nKeyAndLabel('investment.portal.tasks.tab.completed', 'Completed')}
              {completedTasks.length > 0 && (
                <span className="gba:ml-2 gba:text-xs gba:text-muted-foreground">({completedTasks.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" data-testid="investment-portal-tasks-content-open">
            <TaskSection
              {...context}
              investmentId={investmentId}
              buildReferenceUrl={buildReferenceUrl}
              tasks={openTasks}
              taskEntityActionProps={taskEntityActionProps}
              emptyStateTitle={emptyStateTitle}
              emptyStateDescription={emptyStateDescription}
            />
          </TabsContent>

          <TabsContent value="completed" data-testid="investment-portal-tasks-content-completed">
            <TaskSection
              {...context}
              investmentId={investmentId}
              buildReferenceUrl={buildReferenceUrl}
              tasks={completedTasks}
              taskEntityActionProps={taskEntityActionProps}
              emptyStateTitle={emptyStateTitle}
              emptyStateDescription={emptyStateDescription}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export { InvestmentPortalTasks }
