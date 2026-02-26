import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { FlowEntityKind } from '../../services/flowEngine'

interface FlowScopeConfigProps {
  flowEntity: FlowEntityKind
  scope: 'all' | 'byUser'
  onScopeChange: (s: 'all' | 'byUser') => void
  participationType: 'initiated' | 'participated'
  onParticipationTypeChange: (t: 'initiated' | 'participated') => void
  includeAssigned: boolean
  onIncludeAssignedChange: (v: boolean) => void
  includeClaimable: boolean
  onIncludeClaimableChange: (v: boolean) => void
  status: string
  onStatusChange: (s: string) => void
  priority: string
  onPriorityChange: (p: string) => void
  limit: number
  onLimitChange: (l: number) => void
  refreshMode: 'manual' | 'onOpen' | 'periodic'
  onRefreshModeChange: (m: 'manual' | 'onOpen' | 'periodic') => void
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

export const FlowScopeConfig: React.FC<FlowScopeConfigProps> = ({
  flowEntity,
  scope,
  onScopeChange,
  participationType,
  onParticipationTypeChange,
  includeAssigned,
  onIncludeAssignedChange,
  includeClaimable,
  onIncludeClaimableChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  limit,
  onLimitChange,
  refreshMode,
  onRefreshModeChange,
  onBack,
  onNext,
  'data-testid': testId = 'flow-scope-config'
}) => {
  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div>
        <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">Configure scope &amp; options</h3>
        <p className="gba:text-xs gba:text-muted-foreground">
          Fine-tune which {flowEntity === 'flows' ? 'flows' : 'tasks'} to include.
        </p>
      </div>

      {/* Scope */}
      <div className="gba:space-y-2">
        <Label className="gba:text-xs">Scope</Label>
        <Select value={scope} onValueChange={v => onScopeChange(v as 'all' | 'byUser')}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-scope`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {flowEntity}</SelectItem>
            <SelectItem value="byUser">Only my {flowEntity}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Participation type (flows) */}
      {flowEntity === 'flows' && scope === 'byUser' && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs">Participation</Label>
          <Select
            value={participationType}
            onValueChange={v => onParticipationTypeChange(v as 'initiated' | 'participated')}
          >
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-participation`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initiated">Initiated by me</SelectItem>
              <SelectItem value="participated">I participated in</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Task scope options */}
      {flowEntity === 'tasks' && scope === 'byUser' && (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">Include tasks assigned to me</Label>
            <Switch
              checked={includeAssigned}
              onCheckedChange={onIncludeAssignedChange}
              data-testid={`${testId}-assigned`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">Include claimable tasks</Label>
            <Switch
              checked={includeClaimable}
              onCheckedChange={onIncludeClaimableChange}
              data-testid={`${testId}-claimable`}
            />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="gba:space-y-2">
        <Label className="gba:text-xs">Status filter</Label>
        <Select value={status || '_all'} onValueChange={v => onStatusChange(v === '_all' ? '' : v)}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority (tasks only) */}
      {flowEntity === 'tasks' && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs">Priority</Label>
          <Select value={priority || '_all'} onValueChange={v => onPriorityChange(v === '_all' ? '' : v)}>
            <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-priority`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All priorities</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Limit */}
      <div className="gba:space-y-2">
        <Label className="gba:text-xs">Record limit</Label>
        <Input
          type="number"
          min={1}
          max={5000}
          value={limit}
          onChange={e => onLimitChange(Math.max(1, Number(e.target.value) || 200))}
          className="gba:h-8 gba:text-xs"
          data-testid={`${testId}-limit`}
        />
      </div>

      {/* Refresh mode */}
      <div className="gba:space-y-2">
        <Label className="gba:text-xs">Keep connected</Label>
        <Select value={refreshMode} onValueChange={v => onRefreshModeChange(v as typeof refreshMode)}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-refresh`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual sync only</SelectItem>
            <SelectItem value="onOpen">Refresh on open</SelectItem>
            <SelectItem value="periodic">Periodic auto-refresh</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="gba:flex gba:justify-between gba:pt-2">
        <Button variant="outline" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Back
        </Button>
        <Button size="sm" onClick={onNext} data-testid={`${testId}-next`}>
          Import <ArrowRight className="gba:w-3.5 gba:h-3.5 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
