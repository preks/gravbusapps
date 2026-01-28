import React from 'react'
import { Badge, Card, CardContent } from '@newwork/nw-design-system'
import { CheckCircle2, Clock, AlertTriangle, XCircle, User } from 'lucide-react'
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

function getStatusUi(status: NoteActionItemFlow['status']): {
  label: string
  icon: React.ReactNode
  badgeVariant: 'secondary' | 'outline' | 'default' | 'destructive'
} {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', icon: <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />, badgeVariant: 'default' }
    case 'RUNNING':
      return { label: 'In progress', icon: <Clock className="gba:w-3.5 gba:h-3.5" />, badgeVariant: 'secondary' }
    case 'FAILED':
      return { label: 'Failed', icon: <AlertTriangle className="gba:w-3.5 gba:h-3.5" />, badgeVariant: 'destructive' }
    case 'CANCELED':
      return { label: 'Canceled', icon: <XCircle className="gba:w-3.5 gba:h-3.5" />, badgeVariant: 'outline' }
    default:
      return { label: 'Unknown', icon: <Clock className="gba:w-3.5 gba:h-3.5" />, badgeVariant: 'outline' }
  }
}

export const ActionItemsList: React.FC<ActionItemsListProps> = ({
  flows,
  'data-testid': testId = 'action-items-list'
}) => {
  if (flows.length === 0) {
    return (
      <Card data-testid={testId}>
        <CardContent className="gba:p-4 gba:text-sm gba:text-muted-foreground">
          No action items yet. Use “Transform → Extract Action Items” to create blinks.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {flows.map(flow => {
        const ui = getStatusUi(flow.status)
        return (
          <Card key={flow.id}>
            <CardContent className="gba:p-3 gba:space-y-2">
              <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                <div className="gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-snug gba:break-words">
                    {flow.text}
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1 gba:text-xs gba:text-muted-foreground">
                    <User className="gba:w-3.5 gba:h-3.5" />
                    <span className="gba:truncate">{flow.assigneeDisplayName || flow.assigneeUserId}</span>
                  </div>
                </div>
                <Badge variant={ui.badgeVariant} className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                  {ui.icon}
                  {ui.label}
                </Badge>
              </div>

              <div className="gba:flex gba:flex-col gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
                <div>Sent: {formatDateTime(flow.createdAt)}</div>
                {flow.completedAt && <div>Completed: {formatDateTime(flow.completedAt)}</div>}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default ActionItemsList
