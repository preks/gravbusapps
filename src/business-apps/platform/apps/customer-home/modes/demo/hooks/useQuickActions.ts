import { useMemo } from 'react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Receipt, Inbox, Sparkles, CheckCircle2, Users, Workflow, Network } from 'lucide-react'

export interface QuickAction {
  id: string
  labelKey: string
  icon: LucideIcon
  href?: string
  openAI?: boolean
}

interface UseQuickActionsProps {
  isSupervisor: boolean
}

export const useQuickActions = ({ isSupervisor }: UseQuickActionsProps): QuickAction[] => {
  const expensesEnabled = useFeature(Feature.HCM.EmployeeExpenses.Key)
  const flowCreatorEnabled = useFeature(Feature.FLOW.Creator.Key)

  return useMemo(() => {
    const baseActions: QuickAction[] = [
      {
        id: 'request-leave',
        labelKey: 'action-request-leave',
        icon: CalendarDays,
        href: '/platform/hr/absences/manager-absences'
      }
    ]

    const expenseActions: QuickAction[] =
      expensesEnabled !== false
        ? [
            {
              id: 'submit-expense',
              labelKey: 'action-submit-expense',
              icon: Receipt,
              href: '/platform/fin/expenses/personal-expenses'
            }
          ]
        : []

    const aiActions: QuickAction[] = [
      {
        id: 'open-everybox',
        labelKey: 'action-open-everybox',
        icon: Inbox,
        href: '/platform/task-manager'
      },
      {
        id: 'ask-ai',
        labelKey: 'action-ask-ai',
        icon: Sparkles,
        openAI: true
      }
    ]

    const supervisorActions: QuickAction[] = isSupervisor
      ? [
          {
            id: 'approve-requests',
            labelKey: 'action-approve-requests',
            icon: CheckCircle2,
            href: '/platform/task-manager?view=inbox'
          },
          {
            id: 'team-absences',
            labelKey: 'action-team-absences',
            icon: Users,
            href: '/platform/hr/core/apps/my-team-time?tab=dashboard'
          }
        ]
      : []

    const flowActions: QuickAction[] =
      flowCreatorEnabled !== false
        ? [
            {
              id: 'start-flow',
              labelKey: 'action-start-flow',
              icon: Workflow,
              href: '/platform/create/flow-studio'
            }
          ]
        : []

    const orgChartActions: QuickAction[] = [
      {
        id: 'orgchart',
        labelKey: 'action-orgchart',
        icon: Network,
        href: '/platform/orgchart/active/organization'
      }
    ]

    return [...baseActions, ...expenseActions, ...aiActions, ...supervisorActions, ...flowActions, ...orgChartActions]
  }, [isSupervisor, expensesEnabled, flowCreatorEnabled])
}
