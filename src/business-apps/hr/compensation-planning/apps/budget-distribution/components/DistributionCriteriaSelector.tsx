import React from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import type { DistributionMethod } from '../../../types/compensationPlanningTypes'

interface DistributionCriteriaSelectorProps {
  selectedMethod: DistributionMethod
  onMethodChange: (method: DistributionMethod) => void
  disabled?: boolean
}

const METHOD_OPTIONS: { value: DistributionMethod; label: string; description: string }[] = [
  {
    value: 'proportional_headcount',
    label: 'By Headcount',
    description: 'Distribute proportionally to the number of employees'
  },
  {
    value: 'proportional_salary_cost',
    label: 'By Salary Cost',
    description: 'Distribute proportionally to current total salary cost'
  },
  {
    value: 'performance_weighted',
    label: 'Performance Weighted',
    description: 'Weight by average performance rating per org unit'
  },
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Distribute equally across all org units'
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Manually set budget for each org unit'
  }
]

export const DistributionCriteriaSelector: React.FC<DistributionCriteriaSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  disabled = false
}) => {
  return (
    <Card className="gba:mb-4">
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">Distribution Method</h3>
            <div className="gba:space-y-2">
              {METHOD_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`gba:flex gba:items-start gba:gap-2 gba:cursor-pointer ${disabled ? 'gba:opacity-50 gba:cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="distributionMethod"
                    value={opt.value}
                    checked={selectedMethod === opt.value}
                    onChange={() => onMethodChange(opt.value)}
                    disabled={disabled}
                    className="gba:mt-1"
                  />
                  <div>
                    <span className="gba:font-medium gba:text-sm">{opt.label}</span>
                    <span className="gba:text-xs gba:text-muted-foreground gba:ml-2">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Button disabled>
            <ArrowsClockwiseIcon size={16} className="gba:mr-2" />
            Apply Distribution
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
