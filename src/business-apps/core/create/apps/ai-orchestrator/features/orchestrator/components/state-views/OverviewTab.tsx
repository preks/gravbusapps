/**
 * OverviewTab - Unified view of build plan + architecture diagram.
 * Merges the former Build Plan and Architecture tabs into one space-efficient layout.
 */

import React, { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@newwork/nw-design-system'
import { CheckCircle2, XCircle, MinusCircle, Clock, RotateCcw, Box, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@newwork/nw-design-system'
import { DataFlowDiagram } from './DataFlowDiagram'
import { typeIcons } from '../widgets/buildPlanReview/buildPlanReview.utils'
import type { ComponentSpec, BuildStatus } from '../../types/components'
import type { UserSummary } from '../../types/build'

const DATA_TEST_ID_PREFIX = 'overview-tab'

interface OverviewTabProps {
  components: ComponentSpec[]
  userSummary?: UserSummary
  prompt?: string
}

interface StatusConfig {
  label: string
  variant: 'success' | 'destructive' | 'info' | 'secondary' | 'default'
  icon: React.ElementType
}

const STATUS_CONFIG: Partial<Record<BuildStatus, StatusConfig>> = {
  completed: { label: 'Built', variant: 'success', icon: CheckCircle2 },
  reused: { label: 'Reused', variant: 'info', icon: RotateCcw },
  error: { label: 'Failed', variant: 'destructive', icon: XCircle },
  skipped: { label: 'Skipped', variant: 'secondary', icon: MinusCircle },
  cancelled: { label: 'Cancelled', variant: 'secondary', icon: MinusCircle },
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  building: { label: 'Building', variant: 'secondary', icon: Clock }
}

const ComponentTile: React.FC<{ component: ComponentSpec }> = ({ component }) => {
  const TypeIcon = typeIcons[component.type] || Box
  const statusConfig = STATUS_CONFIG[component.status]
  const StatusIcon = statusConfig?.icon ?? Clock

  return (
    <div
      className={cn(
        'gba:flex gba:items-center gba:gap-2 gba:px-2.5 gba:py-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-secondary/40 gba:shrink-0',
        component.status === 'error' && 'gba:border-destructive/30 gba:bg-destructive-secondary/20'
      )}
      data-testid={`${DATA_TEST_ID_PREFIX}-component-tile-${component.id}`}
    >
      <TypeIcon className="gba:w-4 gba:h-4 gba:shrink-0 gba:text-foreground" />
      <span className="gba:text-xs gba:font-medium gba:text-foreground gba:whitespace-nowrap">{component.name}</span>
      <div
        className={cn(
          'gba:flex gba:items-center gba:gap-1 gba:shrink-0',
          statusConfig?.variant === 'success' && 'gba:text-success',
          statusConfig?.variant === 'destructive' && 'gba:text-destructive',
          statusConfig?.variant === 'info' && 'gba:text-info',
          (!statusConfig || statusConfig.variant === 'secondary' || statusConfig.variant === 'default') &&
            'gba:text-muted-foreground'
        )}
      >
        <StatusIcon className="gba:w-3 gba:h-3" />
        <span className="gba:text-[10px] gba:font-medium">{statusConfig?.label ?? component.status}</span>
      </div>
    </div>
  )
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ components, userSummary, prompt }) => {
  const [promptOpen, setPromptOpen] = useState(false)
  const completedCount = components.filter(c => c.status === 'completed' || c.status === 'reused').length
  const failedCount = components.filter(c => c.status === 'error').length

  const topPane = (
    <div
      className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:min-h-0 gba:overflow-y-auto"
      data-testid={`${DATA_TEST_ID_PREFIX}-top-pane`}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:shrink-0">
        <h2 className="gba:text-base gba:font-semibold gba:text-foreground">What got built</h2>
        {prompt && (
          <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:shrink-0 gba:text-muted-foreground gba:hover:text-foreground gba:h-7"
                data-testid={`${DATA_TEST_ID_PREFIX}-show-prompt-button`}
              >
                {promptOpen ? 'Hide prompt' : 'Show prompt'}
                {promptOpen ? (
                  <ChevronUp className="gba:w-3 gba:h-3 gba:ml-1" />
                ) : (
                  <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:px-4 gba:py-3 gba:mt-2">
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Your request</p>
                <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{prompt}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <div className="gba:flex gba:flex-col gba:gap-4 gba:min-h-0">
        <div className="gba:min-w-0 gba:space-y-3">
          {userSummary ? (
            <>
              <div className="gba:flex gba:gap-6 gba:flex-wrap">
                <div className="gba:flex-1 gba:min-w-[160px]">
                  <h3 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-1">
                    Features & Capabilities
                  </h3>
                  <ul className="gba:space-y-1">
                    {userSummary.whatYouGet.slice(0, 3).map((item, i) => (
                      <li key={`get-${i}`} className="gba:text-sm gba:text-foreground gba:leading-snug">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="gba:flex-1 gba:min-w-[160px]">
                  <h3 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-1">Your App Can</h3>
                  <ul className="gba:space-y-1">
                    {userSummary.whatYouCanDo.slice(0, 3).map((item, i) => (
                      <li key={`do-${i}`} className="gba:text-sm gba:text-foreground gba:leading-snug">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="gba:text-xs gba:font-semibold gba:text-foreground gba:mb-0.5">Business Impact</h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{userSummary.businessValue}</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="gba:flex gba:flex-col gba:gap-2 gba:shrink-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">Components</span>
            {completedCount > 0 && (
              <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-success">
                <CheckCircle2 className="gba:w-3 gba:h-3" />
                {completedCount}
              </span>
            )}
            {failedCount > 0 && (
              <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-destructive">
                <XCircle className="gba:w-3 gba:h-3" />
                {failedCount}
              </span>
            )}
          </div>
          {components.length === 0 ? (
            <p
              className="gba:text-sm gba:text-muted-foreground"
              data-testid={`${DATA_TEST_ID_PREFIX}-components-empty`}
            >
              None
            </p>
          ) : (
            <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-component-grid`}>
              {components.map(comp => (
                <ComponentTile key={comp.id} component={comp} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const bottomPane = (
    <div
      className="gba:relative gba:min-h-0 gba:flex-1 gba:overflow-hidden"
      data-testid={`${DATA_TEST_ID_PREFIX}-bottom-pane`}
    >
      {components.length === 0 ? (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:text-sm"
          data-testid={`${DATA_TEST_ID_PREFIX}-diagram-empty`}
        >
          No architecture to display.
        </div>
      ) : (
        <DataFlowDiagram components={components} />
      )}
    </div>
  )

  return (
    <ResizablePanelGroup
      direction="vertical"
      className="gba:h-full gba:min-h-0 gba:w-full"
      data-testid={DATA_TEST_ID_PREFIX}
    >
      <ResizablePanel
        defaultSize={40}
        minSize={20}
        maxSize={70}
        className="gba:flex gba:flex-col gba:min-h-0 gba:overflow-hidden"
      >
        {topPane}
      </ResizablePanel>
      <ResizableHandle withHandle className="gba:bg-border" data-testid={`${DATA_TEST_ID_PREFIX}-resize-handle`} />
      <ResizablePanel
        defaultSize={60}
        minSize={30}
        maxSize={80}
        className="gba:flex gba:flex-col gba:min-h-0 gba:overflow-hidden"
      >
        {bottomPane}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
