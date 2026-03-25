import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'
import type { NoteActionItemFlow } from '../../types'

export interface ActionItemsListProps {
  flows: NoteActionItemFlow[]
  'data-testid'?: string
}

function formatDateTime(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function getStatusUi(
  status: NoteActionItemFlow['status'],
  t: (key: string) => string
): {
  label: string
  icon: React.ReactNode
  badgeVariant: 'secondary' | 'outline' | 'default' | 'destructive'
} {
  switch (status) {
    case 'COMPLETED':
      return {
        label: t('action-items-status-completed'),
        icon: <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />,
        badgeVariant: 'default'
      }
    case 'RUNNING':
      return {
        label: t('action-items-status-in-progress'),
        icon: <Clock className="gba:w-3.5 gba:h-3.5" />,
        badgeVariant: 'secondary'
      }
    case 'FAILED':
      return {
        label: t('action-items-status-failed'),
        icon: <AlertTriangle className="gba:w-3.5 gba:h-3.5" />,
        badgeVariant: 'destructive'
      }
    case 'CANCELED':
      return {
        label: t('action-items-status-canceled'),
        icon: <XCircle className="gba:w-3.5 gba:h-3.5" />,
        badgeVariant: 'outline'
      }
    default:
      return {
        label: t('action-items-status-unknown'),
        icon: <Clock className="gba:w-3.5 gba:h-3.5" />,
        badgeVariant: 'outline'
      }
  }
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!)
    .join('')
    .toUpperCase()
}

export const ActionItemsList: React.FC<ActionItemsListProps> = ({
  flows,
  'data-testid': testId = 'action-items-list'
}) => {
  const { t } = useTranslation(translations)

  if (flows.length === 0) {
    return (
      <Card data-testid={testId}>
        <CardContent className="gba:p-4 gba:text-sm gba:text-muted-foreground">
          {t('action-items-list-empty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {flows.map(flow => {
        const ui = getStatusUi(flow.status, t)
        return (
          <Card key={flow.id}>
            <CardContent className="gba:p-3 gba:space-y-2">
              <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                <div className="gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-snug gba:break-words">
                    {flow.text}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1 gba:text-xs gba:text-muted-foreground">
                    <Avatar className="gba:w-5 gba:h-5">
                      {flow.assigneeAvatarUrl && <AvatarImage src={flow.assigneeAvatarUrl} />}
                      <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                        {getInitials(flow.assigneeDisplayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="gba:truncate">{flow.assigneeDisplayName || flow.assigneeUserId}</span>
                  </div>
                </div>
                <Badge variant={ui.badgeVariant} className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                  {ui.icon}
                  {ui.label}
                </Badge>
              </div>

              <div className="gba:flex gba:flex-col gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
                <div>{t('action-items-sent', { date: formatDateTime(flow.createdAt) })}</div>
                {flow.completedAt && (
                  <div>{t('action-items-completed', { date: formatDateTime(flow.completedAt) })}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default ActionItemsList
