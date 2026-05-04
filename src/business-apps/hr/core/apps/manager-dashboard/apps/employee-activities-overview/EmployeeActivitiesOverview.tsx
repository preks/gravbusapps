import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { FileText, Calendar, BadgeCheck, AlertCircle, DollarSign, ChevronDown, ChevronRight, User, Filter } from 'lucide-react'
import { EmployeeActivity, ActivityType } from '../hooks/useEmployeeActivities'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const activityConfig: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  absence: { icon: <Calendar className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700', label: 'Absence' },
  'data-change': { icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700', label: 'Data Change' },
  'approval-request': { icon: <BadgeCheck className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700', label: 'Approval' },
  leave: { icon: <Calendar className="h-4 w-4" />, color: 'bg-teal-100 text-teal-700', label: 'Leave' },
  expense: { icon: <DollarSign className="h-4 w-4" />, color: 'bg-rose-100 text-rose-700', label: 'Expense' }
}

function getPriorityBadge(priority?: string) {
  if (priority === 'high') return <Badge variant="destructive">High</Badge>
  if (priority === 'medium') return <Badge variant="secondary">Medium</Badge>
  return <Badge variant="outline">Low</Badge>
}

function getStatusBadge(status?: string) {
  if (!status) return null
  const s = status.toLowerCase()
  if (s.includes('pending') || s.includes('waiting')) return <Badge variant="outline" className="border-amber-300 text-amber-700">Pending</Badge>
  if (s.includes('approved') || s.includes('accepted')) return <Badge variant="outline" className="border-green-300 text-green-700">Approved</Badge>
  if (s.includes('rejected') || s.includes('declined')) return <Badge variant="outline" className="border-red-300 text-red-700">Rejected</Badge>
  return <Badge variant="outline">{status}</Badge>
}

interface GroupedActivities {
  employeeName: string
  employeeId: string
  activities: EmployeeActivity[]
}

interface EmployeeActivitiesOverviewProps {
  activities: EmployeeActivity[]
  loading: boolean
  onSelectEmployee?: (employeeId: string) => void
}

export function EmployeeActivitiesOverview({ activities, loading, onSelectEmployee }: EmployeeActivitiesOverviewProps) {
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')

  const grouped = useMemo<GroupedActivities[]>(() => {
    const map = new Map<string, GroupedActivities>()
    const filtered = typeFilter === 'all' ? activities : activities.filter(a => a.type === typeFilter)
    for (const activity of filtered) {
      const existing = map.get(activity.employeeId)
      if (existing) {
        existing.activities.push(activity)
      } else {
        map.set(activity.employeeId, {
          employeeName: activity.employeeName,
          employeeId: activity.employeeId,
          activities: [activity]
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.activities.length - a.activities.length)
  }, [activities, typeFilter])

  const toggleEmployee = (id: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No recent activities</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Employee activities will appear here when absences, data changes, or approval requests are created.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Employee Activity Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {activities.length} recent {activities.length === 1 ? 'activity' : 'activities'} across your team
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {typeFilter === 'all' ? 'All Types' : activityConfig[typeFilter].label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-1">
              <Button
                variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setTypeFilter('all')}
              >
                All Types
              </Button>
              {(Object.keys(activityConfig) as ActivityType[]).map(type => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setTypeFilter(type)}
                >
                  {activityConfig[type].icon}
                  {activityConfig[type].label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-4">
          {grouped.map(group => {
            const isExpanded = expandedEmployees.has(group.employeeId)
            const initials = group.employeeName
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div key={group.employeeId} className="border rounded-lg bg-card">
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleEmployee(group.employeeId)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{group.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{group.activities.length} {group.activities.length === 1 ? 'activity' : 'activities'}</div>
                  </div>
                  {onSelectEmployee && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={e => {
                        e.stopPropagation()
                        onSelectEmployee(group.employeeId)
                      }}
                    >
                      <User className="h-3.5 w-3.5" />
                      Profile
                    </Button>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <Separator className="mb-3" />
                    <div className="space-y-3">
                      {group.activities.map(activity => {
                        const config = activityConfig[activity.type]
                        return (
                          <TooltipProvider key={activity.id}>
                            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                              <div className={`p-2 rounded-md ${config.color}`}>
                                {config.icon}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-sm truncate">{activity.title}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {getPriorityBadge(activity.priority)}
                                    {getStatusBadge(activity.status)}
                                  </div>
                                </div>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>{format(new Date(activity.createdAt), 'MMM d, yyyy')}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{format(new Date(activity.createdAt), 'PPp')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {activity.endDate && (
                                    <span>
                                      → {format(new Date(activity.endDate), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                  {activity.amount !== undefined && (
                                    <span className="font-medium text-foreground">${activity.amount.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TooltipProvider>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
