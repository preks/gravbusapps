import { Checkbox, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { PartialJobFunction } from '../../utils/JobFunction.types'
import { JobLevel } from '../../utils/JobLevel.types'

interface ProfileMatrixProps {
  jobFunctions: PartialJobFunction[]
  jobLevels: JobLevel[]
  isCellSelected: (functionId: string, levelId: string) => boolean
  isCellExisting: (functionId: string, levelId: string) => boolean
  isRowFullySelected: (functionId: string) => boolean
  isColumnFullySelected: (levelId: string) => boolean
  onToggleCell: (functionId: string, levelId: string) => void
  onToggleRow: (functionId: string) => void
  onToggleColumn: (levelId: string) => void
  onSelectAll: () => void
  selectedCount: number
  dataTestId?: string
}

export default function ProfileMatrix({
  jobFunctions,
  jobLevels,
  isCellSelected,
  isCellExisting,
  isRowFullySelected,
  isColumnFullySelected,
  onToggleCell,
  onToggleRow,
  onToggleColumn,
  onSelectAll,
  selectedCount,
  dataTestId
}: Readonly<ProfileMatrixProps>) {
  const allSelectableCount = jobFunctions.reduce(
    (acc, fn) => acc + jobLevels.filter(l => !isCellExisting(fn.id, l.id)).length,
    0
  )
  const isAllSelected = allSelectableCount > 0 && selectedCount === allSelectableCount

  return (
    <TooltipProvider>
      <div className="gba:flex gba:flex-col gba:gap-3 gba:min-h-0 gba:flex-1">
        <div className="gba:flex gba:items-center gba:justify-between">
          <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">
            Select combinations to generate ({selectedCount} selected)
          </p>
        </div>

        <div className="gba:overflow-auto gba:flex-1 gba:min-h-0 gba:border gba:rounded-md">
          <table className="gba:w-full gba:border-collapse gba:text-sm" data-testid={`${dataTestId}-matrix`}>
            <thead className="gba:sticky gba:top-0 gba:z-10 gba:bg-muted">
              <tr>
                <th className="gba:border-b gba:border-r gba:p-2 gba:text-left gba:font-medium gba:min-w-[180px] gba:sticky gba:left-0 gba:bg-muted gba:z-20">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={() => onSelectAll()}
                      data-testid={`${dataTestId}-select-all`}
                    />
                    <span>Function \ Level</span>
                  </div>
                </th>
                {jobLevels.map(level => (
                  <th
                    key={level.id}
                    className="gba:border-b gba:border-r gba:p-2 gba:text-center gba:font-medium gba:min-w-[90px]"
                  >
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
                      <Checkbox
                        checked={isColumnFullySelected(level.id)}
                        onCheckedChange={() => onToggleColumn(level.id)}
                        data-testid={`${dataTestId}-col-${level.code}`}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="gba:text-xs gba:truncate gba:max-w-[80px] gba:cursor-default">
                            {level.code}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{level.name}</TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobFunctions.map(fn => (
                <tr key={fn.id} className="gba:hover:bg-muted/50">
                  <td className="gba:border-b gba:border-r gba:p-2 gba:font-medium gba:sticky gba:left-0 gba:bg-background gba:z-10">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Checkbox
                        checked={isRowFullySelected(fn.id)}
                        onCheckedChange={() => onToggleRow(fn.id)}
                        data-testid={`${dataTestId}-row-${fn.code || fn.id}`}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="gba:truncate gba:max-w-[150px] gba:cursor-default gba:text-xs">
                            {fn.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {fn.name} ({fn.code})
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                  {jobLevels.map(level => {
                    const isExisting = isCellExisting(fn.id, level.id)
                    const isSelected = isCellSelected(fn.id, level.id)

                    return (
                      <td key={level.id} className="gba:border-b gba:border-r gba:p-2 gba:text-center">
                        {isExisting ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="gba:flex gba:justify-center">
                                <div className="gba:w-4 gba:h-4 gba:rounded-sm gba:bg-muted-foreground/30" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Profile already exists</TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="gba:flex gba:justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleCell(fn.id, level.id)}
                              data-testid={`${dataTestId}-cell-${fn.code || fn.id}-${level.code}`}
                            />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  )
}
