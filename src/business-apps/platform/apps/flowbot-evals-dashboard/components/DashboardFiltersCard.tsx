import { useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { FunnelIcon, XIcon } from '@phosphor-icons/react'
import type { DashboardFilters } from '../hooks/useEvalsDashboard'
import type { BucketGranularity, BreakdownItem } from '../types'

export interface DashboardFiltersCardProps {
  filters: DashboardFilters
  setFilters: (next: (prev: DashboardFilters) => DashboardFilters) => void
  onReset: () => void
  workflowSuggestions: string[]
  providerBreakdown: BreakdownItem[]
  modelBreakdown: BreakdownItem[]
  onQuick24h: () => void
  onQuick7d: () => void
  'data-testid'?: string
}

export function DashboardFiltersCard({
  filters,
  setFilters,
  onReset,
  workflowSuggestions,
  providerBreakdown,
  modelBreakdown,
  onQuick24h,
  onQuick7d,
  'data-testid': testId = 'flowbot-evals-dashboard-filters'
}: Readonly<DashboardFiltersCardProps>) {
  const visibleSuggestions = useMemo(() => workflowSuggestions.slice(0, 6), [workflowSuggestions])

  const hasWorkflow = Boolean(filters.workflow.trim())

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
        <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
          <FunnelIcon size={16} />
          Filters
        </CardTitle>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, workflow: '' }))}
            disabled={!hasWorkflow}
            className="gba:gap-2"
            data-testid="flowbot-evals-dashboard-clear-workflow"
          >
            <XIcon size={14} />
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} data-testid="flowbot-evals-dashboard-reset-filters">
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-4">
          <div className="gba:space-y-2">
            <Label>Provider</Label>
            <Select
              value={filters.llmProvider || '__all__'}
              onValueChange={v =>
                setFilters(prev => ({ ...prev, llmProvider: v === '__all__' ? '' : v, llmModel: '' }))
              }
            >
              <SelectTrigger data-testid="flowbot-evals-dashboard-filter-provider">
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All providers</SelectItem>
                {providerBreakdown.map(p => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.key} ({p.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label>Model</Label>
            <Select
              value={filters.llmModel || '__all__'}
              onValueChange={v => setFilters(prev => ({ ...prev, llmModel: v === '__all__' ? '' : v }))}
            >
              <SelectTrigger data-testid="flowbot-evals-dashboard-filter-model">
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All models</SelectItem>
                {modelBreakdown.map(m => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.key} ({m.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="flowbot-evals-from">From</Label>
            <Input
              id="flowbot-evals-from"
              type="date"
              value={filters.fromLocal}
              onChange={e => setFilters(prev => ({ ...prev, fromLocal: e.target.value }))}
              data-testid="flowbot-evals-dashboard-filter-from"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="flowbot-evals-to">To</Label>
            <Input
              id="flowbot-evals-to"
              type="date"
              value={filters.toLocal}
              onChange={e => setFilters(prev => ({ ...prev, toLocal: e.target.value }))}
              data-testid="flowbot-evals-dashboard-filter-to"
            />
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-4">
          <div className="gba:space-y-2 gba:lg:col-span-2">
            <Label htmlFor="flowbot-evals-workflow">Workflow (optional)</Label>
            <Input
              id="flowbot-evals-workflow"
              value={filters.workflow}
              onChange={e => setFilters(prev => ({ ...prev, workflow: e.target.value }))}
              placeholder="e.g. Controller Agent (stream)"
              data-testid="flowbot-evals-dashboard-filter-workflow"
            />
            {visibleSuggestions.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {visibleSuggestions.map(w => (
                  <Button
                    key={w}
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters(prev => ({ ...prev, workflow: w }))}
                    className="gba:h-7 gba:px-2 gba:text-xs"
                    data-testid={`flowbot-evals-dashboard-suggest-workflow-${encodeURIComponent(w)}`}
                  >
                    {w}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="gba:space-y-2">
            <Label>Bucket</Label>
            <Select
              value={filters.bucket}
              onValueChange={v => setFilters(prev => ({ ...prev, bucket: v as BucketGranularity }))}
            >
              <SelectTrigger data-testid="flowbot-evals-dashboard-filter-bucket">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">hour</SelectItem>
                <SelectItem value="day">day</SelectItem>
              </SelectContent>
            </Select>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="outline" onClick={onQuick24h} data-testid="flowbot-evals-dashboard-quick-24h">
                Last 24h
              </Button>
              <Button size="sm" variant="outline" onClick={onQuick7d} data-testid="flowbot-evals-dashboard-quick-7d">
                Last 7d
              </Button>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-2 gba:pt-6">
            <Checkbox
              id="flowbot-evals-include-split-view"
              checked={filters.includeSplitView}
              onCheckedChange={v => setFilters(prev => ({ ...prev, includeSplitView: v === true }))}
              data-testid="flowbot-evals-dashboard-filter-include-split-view"
            />
            <div className="gba:space-y-1">
              <Label htmlFor="flowbot-evals-include-split-view" className="gba:text-sm">
                Show technical split-view runs
              </Label>
              <div className="gba:text-xs gba:text-muted-foreground">
                Includes split-view child rows that are normally hidden for business reporting.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DashboardFiltersCard
