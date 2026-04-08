import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button
} from '@newwork/nw-design-system'
import type { DashboardAlert } from '../../utils/dashboardComputations'

export interface ActionCenterProps {
  alerts: DashboardAlert[]
  onEmployeeClick: (employeeId: string) => void
  loading: boolean
}

const severityVariant = (severity: DashboardAlert['severity']): 'destructive' | 'default' | 'secondary' => {
  if (severity === 'high') return 'destructive'
  if (severity === 'medium') return 'default'
  return 'secondary'
}

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

const avatarSrc = (pictureThumbnail?: string): string | undefined =>
  pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined

const categoryActions: Record<DashboardAlert['category'], string[]> = {
  'score-drop': ['Review 1:1', 'Review Goals'],
  'goals-blocked': ['Review Goals', 'Remove Blockers'],
  'no-feedback': ['Encourage Feedback', 'Give Feedback'],
  'alignment-gap': ['Check Calibration', 'Open Review'],
  'skill-gap': ['Review Skills', 'Plan Development'],
  stagnation: ['Career Discussion', 'Stretch Assignment'],
  'growth-signal': ['Stretch Assignment', 'Career Discussion']
}

const primaryAction: Record<DashboardAlert['category'], string> = {
  'score-drop': 'Review 1:1',
  'goals-blocked': 'Review Goals',
  'no-feedback': 'Give Feedback',
  'alignment-gap': 'Check Calibration',
  'skill-gap': 'Plan Development',
  stagnation: 'Stretch Assignment',
  'growth-signal': 'Stretch Assignment'
}

const SkeletonRow: React.FC = () => (
  <div className="gba:flex gba:items-center gba:gap-3 gba:py-3 gba:border-b gba:border-border last:gba:border-b-0">
    <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted gba:animate-pulse gba:shrink-0" />
    <div className="gba:flex-1 gba:space-y-2">
      <div className="gba:h-4 gba:w-40 gba:rounded gba:bg-muted gba:animate-pulse" />
      <div className="gba:h-3 gba:w-full gba:max-w-md gba:rounded gba:bg-muted gba:animate-pulse" />
    </div>
    <div className="gba:h-8 gba:w-24 gba:rounded gba:bg-muted gba:animate-pulse gba:shrink-0" />
  </div>
)

export const ActionCenter: React.FC<ActionCenterProps> = ({ alerts, onEmployeeClick, loading }) => {
  const highCount = alerts.filter(a => a.severity === 'high').length

  return (
    <Card className="gba:rounded-xl gba:overflow-hidden">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">Action Center</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">
          {loading ? 'Loading…' : `${highCount} high-priority ${highCount === 1 ? 'alert' : 'alerts'}`}
        </p>
      </CardHeader>
      <CardContent className="gba:p-0">
        {loading ? (
          <div className="gba:px-6 gba:pb-4">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : alerts.length === 0 ? (
          <p className="gba:text-sm gba:text-success gba:py-6 gba:text-center">
            No immediate action needed — your team is on track.
          </p>
        ) : (
          <div className="gba:divide-y gba:divide-border">
            {alerts.map(alert => {
              const actions = categoryActions[alert.category] ?? []
              const primary = primaryAction[alert.category]
              return (
                <div
                  key={`${alert.employeeId}-${alert.category}-${alert.reason}`}
                  className="gba:flex gba:items-center gba:gap-4 gba:px-6 gba:py-4 hover:gba:bg-muted/40 gba:transition-colors gba:cursor-pointer"
                  onClick={() => onEmployeeClick(alert.employeeId)}
                >
                  <Avatar className="gba:h-10 gba:w-10 gba:shrink-0">
                    <AvatarImage src={avatarSrc(alert.pictureThumbnail)} alt={alert.employeeName} />
                    <AvatarFallback>{initialsFromName(alert.employeeName)}</AvatarFallback>
                  </Avatar>

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-0.5">
                      <span className="gba:text-sm gba:font-semibold">{alert.employeeName}</span>
                      <Badge variant={severityVariant(alert.severity)} className="gba:text-[10px] gba:px-1.5 gba:py-0">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="gba:text-sm gba:font-medium">{alert.reason}</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                      <span className="gba:font-medium">Suggested:</span> {alert.suggestedAction}
                    </p>
                    <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:mt-2">
                      {actions.map(action => (
                        <Button
                          key={action}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gba:h-7 gba:text-xs gba:px-2.5"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="gba:shrink-0 gba:text-xs"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      onEmployeeClick(alert.employeeId)
                    }}
                  >
                    {primary}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
