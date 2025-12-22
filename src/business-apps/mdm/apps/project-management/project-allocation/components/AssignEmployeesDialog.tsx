import React, { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useDebounce } from '@/common/hooks/useDebounce'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Checkbox,
  Spinner
} from '@newwork/nw-design-system'
import { useTeamAssignments, AvailableEmployee } from '../../hooks/useTeamAssignments'
import { useTranslation } from 'react-i18next'
import { BriefcaseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

const DATA_TEST_ID_PREFIX = 'AssignEmployeesDialog'

export interface AssignEmployeesDialogProps extends BusinessAppContextProps {
  teamId: string
  structureId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignComplete?: () => void
  prefixDataTestId?: string
}

interface SelectedEmployeeWithAllocation extends AvailableEmployee {
  allocationPercentage: number
}

export const AssignEmployeesDialog: React.FC<AssignEmployeesDialogProps> = ({
  teamId,
  structureId,
  accessToken,
  open,
  onOpenChange,
  onAssignComplete,
  prefixDataTestId
}) => {
  const { t } = useTranslation()
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { getAvailableEmployees, assignEmployeeToTeam } = useTeamAssignments(accessToken)

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)
  const [employees, setEmployees] = useState<AvailableEmployee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Map<string, SelectedEmployeeWithAllocation>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Load employees
  const loadEmployees = useCallback(
    async (page: number, search: string, append: boolean = false) => {
      try {
        setIsLoading(true)
        const response = await getAvailableEmployees({
          searchCriteria: search,
          page,
          size: pageSize,
          matrixUnitId: teamId,
          structureId
        })

        if (append) {
          setEmployees(prev => [...prev, ...(response || [])])
        } else {
          setEmployees(response || [])
        }

        setHasMore(response.length === pageSize)
      } catch (error) {
        console.error('Error loading available employees:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [getAvailableEmployees, teamId, structureId, pageSize]
  )

  // Initial load when dialog opens
  const initializeDialog = useCallback(async () => {
    setCurrentPage(0)
    setSearchInput('')
    setSelectedEmployees(new Map())
    setEmployees([])
    setHasMore(false)
    await loadEmployees(0, '')
  }, [loadEmployees])

  useEffect(() => {
    if (open) {
      initializeDialog()
    }
  }, [open, initializeDialog])

  // Handle search input change (instant update)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }, [])

  // Trigger search when debounced value changes
  useEffect(() => {
    setCurrentPage(0)
    loadEmployees(0, debouncedSearch, false)
  }, [debouncedSearch, loadEmployees])

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoading || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadEmployees(nextPage, debouncedSearch, true)
    }
  }, [isLoading, hasMore, currentPage, debouncedSearch, loadEmployees])

  // Handle checkbox change
  const handleCheckboxChange = useCallback((employee: AvailableEmployee, checked: boolean) => {
    setSelectedEmployees(prev => {
      const newMap = new Map(prev)
      if (checked) {
        newMap.set(employee.id, {
          ...employee,
          allocationPercentage: 0
        })
      } else {
        newMap.delete(employee.id)
      }
      return newMap
    })
  }, [])

  // Handle allocation percentage change with available allocation limit
  const handleAllocationChange = useCallback((employeeId: string, value: string, availableAllocation: number) => {
    setSelectedEmployees(prev => {
      const newMap = new Map(prev)
      const employee = newMap.get(employeeId)
      if (employee) {
        // Limit to available allocation (can't exceed 100% total)
        const maxAllowed = Math.max(0, availableAllocation)
        const numValue = value === '' ? 0 : Math.max(0, Math.min(maxAllowed, Number(value)))
        newMap.set(employeeId, {
          ...employee,
          allocationPercentage: numValue
        })
      }
      return newMap
    })
  }, [])

  // Handle assign
  const handleAssign = useCallback(async () => {
    if (selectedEmployees.size === 0) return

    try {
      setIsAssigning(true)

      const payload = Array.from(selectedEmployees.values()).map(employee => ({
        employeeId: employee.id,
        structureId,
        matrixUnitId: teamId,
        percentage: employee.allocationPercentage,
        totalAllocationPercent: employee.totalAllocationPercent
      }))

      await assignEmployeeToTeam(payload)

      onAssignComplete?.()
      onOpenChange(false)
      setSelectedEmployees(new Map())
    } catch (error) {
      console.error('Error assigning employees:', error)
    } finally {
      setIsAssigning(false)
    }
  }, [selectedEmployees, assignEmployeeToTeam, structureId, teamId, onAssignComplete, onOpenChange])

  const isEmployeeSelected = useCallback(
    (employeeId: string) => {
      return selectedEmployees.has(employeeId)
    },
    [selectedEmployees]
  )

  const getEmployeeAllocation = useCallback(
    (employeeId: string) => {
      return selectedEmployees.get(employeeId)?.allocationPercentage ?? 0
    },
    [selectedEmployees]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:smart_project.dialog.assign_employees_title',
              'Assign Employees to Team'
            )}
          </DialogTitle>
          <DialogDescription>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:smart_project.dialog.assign_employees_description',
              'Select employees to assign to this team. You can set their allocation percentage after assignment.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:py-4">
          {/* Search Input */}
          <div className="gba:mb-4 gba:relative">
            <Input
              placeholder={t('actions.search', { defaultValue: 'Search employees...' })}
              value={searchInput}
              onChange={handleSearchChange}
              className="gba:pl-10"
              data-testid={`${dataTestId}-search-input`}
            />
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </div>

          {/* Employee List */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="gba:max-h-[400px] gba:overflow-y-auto gba:space-y-2"
            data-testid={`${dataTestId}-employee-list`}
          >
            {employees.map(employee => {
              const isSelected = isEmployeeSelected(employee.id)
              const allocation = getEmployeeAllocation(employee.id)
              const totalAllocationPercent = employee.totalAllocationPercent?.totalAllocationPercent ?? 0
              const availableAllocation = 100 - totalAllocationPercent
              const employeeFullName =
                employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()

              const isFullyAllocated = availableAllocation === 0

              return (
                <div
                  key={employee.id}
                  role="button"
                  tabIndex={isFullyAllocated ? -1 : 0}
                  className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:border-border gba:rounded-lg gba:transition-colors ${
                    isFullyAllocated
                      ? 'gba:opacity-60 gba:cursor-not-allowed'
                      : 'gba:hover:bg-accent/50 gba:cursor-pointer'
                  }`}
                  onClick={() => !isFullyAllocated && handleCheckboxChange(employee, !isSelected)}
                  onKeyDown={e => {
                    if (!isFullyAllocated && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      handleCheckboxChange(employee, !isSelected)
                    }
                  }}
                  data-testid={`${dataTestId}-employee-item-${employee.id}`}
                >
                  {/* Avatar */}
                  <Avatar shape="circle" size="default">
                    {employee.picture_thumbnail ? (
                      <AvatarImage src={`data:image/jpeg;base64,${employee.picture_thumbnail}`} />
                    ) : (
                      <AvatarFallback>
                        {employee.firstName?.[0] || ''}
                        {employee.lastName?.[0] || ''}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Employee Info */}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:font-semibold gba:text-sm">{employeeFullName}</div>
                    {employee.jobPosition?.jobPositionName && (
                      <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:mt-1">
                        <BriefcaseIcon className="gba:h-3 gba:w-3" />
                        {employee.jobPosition.jobPositionName}
                      </div>
                    )}
                  </div>

                  {/* Allocation Info & Input */}
                  <div
                    className="gba:flex gba:items-center gba:gap-3"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    {/* Available allocation badge */}
                    <span
                      className={`gba:text-xs gba:px-2 gba:py-1 gba:rounded ${
                        availableAllocation > 0
                          ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                          : 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground'
                      }`}
                    >
                      {availableAllocation > 0
                        ? `${availableAllocation}% ${getTranslationFromI18nKeyAndLabel(
                            'lowcoder:smart_project.available',
                            'available'
                          )}`
                        : getTranslationFromI18nKeyAndLabel(
                            'lowcoder:smart_project.fully_allocated',
                            'Fully allocated'
                          )}
                    </span>

                    {/* Allocation Input (only shown when selected and has available allocation) */}
                    {isSelected && availableAllocation > 0 && (
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Input
                          type="number"
                          min="0"
                          max={availableAllocation}
                          value={allocation === 0 ? '' : allocation}
                          onChange={e => handleAllocationChange(employee.id, e.target.value, availableAllocation)}
                          placeholder="0"
                          className="gba:w-16"
                          data-testid={`${dataTestId}-allocation-input-${employee.id}`}
                        />
                        <span className="gba:text-sm gba:text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>

                  {/* Checkbox - disabled if fully allocated */}
                  <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={availableAllocation === 0}
                      onCheckedChange={checked => handleCheckboxChange(employee, checked === true)}
                      data-testid={`${dataTestId}-checkbox-${employee.id}`}
                    />
                  </div>
                </div>
              )
            })}

            {isLoading && employees.length > 0 && (
              <div className="gba:flex gba:justify-center gba:py-4">
                <Spinner size="sm" />
              </div>
            )}

            {employees.length === 0 && !isLoading && (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.no_employees_found', 'No employees found')}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.cancel', 'Cancel')}
            </Button>
          </DialogClose>
          <Button
            onClick={handleAssign}
            disabled={selectedEmployees.size === 0 || isAssigning}
            data-testid={`${dataTestId}-assign-button`}
          >
            {isAssigning ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.assigning', 'Assigning...')}
              </>
            ) : (
              getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.assign', 'Assign')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
