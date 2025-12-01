import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@newwork/nw-design-system'
import { PiTrendDown } from 'react-icons/pi'
import { EmployeePerformance } from '../types/ViewSelectorTypes'
import { EmployeeCard } from './EmployeeCard'

interface NeedsAttentionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeePerformance[]
  onEmployeeClick: (emp: EmployeePerformance) => void
}

export const NeedsAttentionDrawer: React.FC<NeedsAttentionDrawerProps> = ({
  open,
  onOpenChange,
  employees,
  onEmployeeClick
}) => {
  const inactiveCount = employees.filter(e => e.isInactive).length
  const decliningCount = employees.filter(e => !e.isInactive).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gba:w-[400px] gba:sm:w-[540px]">
        <SheetHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-warning/10">
              <PiTrendDown className="gba:w-5 gba:h-5 gba:text-warning" />
            </div>
            <div>
              <SheetTitle>Needs Attention</SheetTitle>
              <SheetDescription>
                {inactiveCount > 0 && decliningCount > 0
                  ? `${inactiveCount} inactive, ${decliningCount} declining`
                  : inactiveCount > 0
                    ? `${inactiveCount} inactive team members`
                    : `${decliningCount} declining performers`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="gba:mt-6 gba:space-y-2 gba:max-h-[calc(100vh-200px)] gba:overflow-y-auto">
          {employees.map(emp => (
            <EmployeeCard
              key={emp.employee.id}
              emp={emp}
              onClick={e => {
                onEmployeeClick(e)
                onOpenChange(false)
              }}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default NeedsAttentionDrawer
