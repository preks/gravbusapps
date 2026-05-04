import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@newwork/nw-design-system'

interface DashboardFiltersProps {
  availableCycles: Array<{ id: string; name: string; apiStatus?: string }>
  selectedCycleId: string | null
  onCycleChange: (cycleId: string) => void
}

export const DashboardFilters = ({ availableCycles, selectedCycleId, onCycleChange }: DashboardFiltersProps) => {
  const hasCycles = availableCycles.length > 0
  const isActiveCycle = (apiStatus?: string) => apiStatus === 'ACTIVE_PERFORMANCE_CYCLE_STATUS'

  return (
    <div className="gba:flex gba:items-center gba:gap-3">
      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Cycle</span>
      <Select value={selectedCycleId ?? undefined} onValueChange={onCycleChange} disabled={!hasCycles}>
        <SelectTrigger className="gba:w-72">
          <SelectValue placeholder={hasCycles ? 'Select cycle' : 'No cycles available'} />
        </SelectTrigger>
        <SelectContent>
          {availableCycles.map(cycle => (
            <SelectItem key={cycle.id} value={cycle.id}>
              <span className="gba:flex gba:items-center gba:gap-2">
                {cycle.name}
                {isActiveCycle(cycle.apiStatus) && (
                  <Badge variant="outline" className="gba:text-xs">
                    Active
                  </Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
