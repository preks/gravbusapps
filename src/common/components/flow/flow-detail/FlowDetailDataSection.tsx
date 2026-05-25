import React, { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Database } from 'lucide-react'
import { DataTab } from './tabs'
import type { FlowDetailData, FlowStep, StepAssignmentInfo } from './types'

interface FlowDetailDataSectionProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  accessToken?: string
  defaultOpen?: boolean
}

export const FlowDetailDataSection: React.FC<FlowDetailDataSectionProps> = ({
  flowData,
  flowSteps,
  stepAssignmentsByStepIndex,
  accessToken,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [hasOpened, setHasOpened] = useState(defaultOpen)

  useEffect(() => {
    if (isOpen) setHasOpened(true)
  }, [isOpen])

  return (
    <Card>
      <CardHeader className="gba:gap-4">
        <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:space-y-1">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Database className="gba:h-4 gba:w-4" />
              Flow data
            </CardTitle>
            <CardDescription>Inspect only the steps that already captured data.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(current => !current)}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="flow-detail-data-toggle"
          >
            {isOpen ? <ChevronDown className="gba:h-4 gba:w-4" /> : <ChevronRight className="gba:h-4 gba:w-4" />}
            {isOpen ? 'Hide data' : 'Show data'}
          </Button>
        </div>
      </CardHeader>

      {hasOpened ? (
        <CardContent className={isOpen ? 'gba:pt-0' : 'gba:hidden'}>
          <DataTab
            flowData={flowData}
            flowSteps={flowSteps}
            stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
            accessToken={accessToken}
          />
        </CardContent>
      ) : null}
    </Card>
  )
}
