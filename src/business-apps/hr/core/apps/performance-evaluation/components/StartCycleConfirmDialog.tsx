import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Label,
  Combobox,
  RadioGroup,
  RadioGroupItem,
  useTranslation
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { PerformanceCycle } from '../types'
import { useStructureEmployees } from '@/business-apps/hr/core/forms/performance-evaluation-form/hooks/useStructureEmployees'
import { useOrganizationalUnits, type OrganizationalUnit } from '../hooks/useOrganizationalUnits'
import translations from '../_i18n'

export type RunForOption = 'self' | 'team'

export interface StartCycleConfirmOptions {
  runFor: RunForOption
  teamIds: string[]
  employeeId?: string
  employeeUserId?: string
  managerUserId?: string
  cycleId?: string
}

interface StartCycleConfirmDialogProps {
  open: boolean
  cycle: PerformanceCycle | null
  /** When provided (manual run mode), shows a cycle selector filtered to Active/In Progress/Completed */
  cycles?: PerformanceCycle[]
  accessToken: string
  /** Pre-select this employee when runFor is 'self' (e.g. current user's employeeId) */
  defaultEmployeeId?: string | null
  onConfirm: (options: StartCycleConfirmOptions) => void
  onCancel: () => void
}

export const StartCycleConfirmDialog: React.FC<StartCycleConfirmDialogProps> = ({
  open,
  cycle,
  cycles,
  accessToken,
  defaultEmployeeId,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation(translations)
  const isManualRun = !cycle && Boolean(cycles)
  const [runFor, setRunFor] = useState<RunForOption>('self')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')

  const eligibleCycles = useMemo(() => {
    if (!cycles) return []
    return cycles.filter(c => c.status === 'In Progress' || c.status === 'Completed')
  }, [cycles])

  const cycleOptions = useMemo(() => eligibleCycles.map(c => ({ label: c.name, value: c.id })), [eligibleCycles])

  const resolvedCycle = isManualRun ? (eligibleCycles.find(c => c.id === selectedCycleId) ?? null) : cycle

  const {
    employees,
    isLoading: employeesLoading,
    fetchStructureEmployees,
    getEmployeeById
  } = useStructureEmployees(accessToken, open && runFor === 'self')

  const {
    organizationalUnits,
    loading: teamsLoading,
    error: teamsError
  } = useOrganizationalUnits(accessToken, open && runFor === 'team')

  const searchEmployees = useCallback(
    async (search: string) => {
      await fetchStructureEmployees(search)
    },
    [fetchStructureEmployees]
  )

  const employeeOptionsForSelect = useMemo<Employee[]>(
    () =>
      employees.map(emp => ({
        id: emp.id,
        displayName: emp.name,
        firstName: emp.name.split(' ')[0] || '',
        lastName: emp.name.split(' ').slice(1).join(' ') || '',
        pictureThumbnail: emp.pictureThumbnail,
        userId: emp.userId,
        employeePosition: {
          jobPosition: emp.jobTitle ? { name: emp.jobTitle } : undefined,
          organizationalUnit: emp.department ? { name: emp.department } : undefined
        }
      })),
    [employees]
  )

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      prevOpenRef.current = true
      setRunFor('self')
      setSelectedEmployeeId(defaultEmployeeId ?? null)
      setSelectedTeamIds([])
      setSelectedCycleId('')
      if (defaultEmployeeId) fetchStructureEmployees()
    }
    if (!open) prevOpenRef.current = false
  }, [open, defaultEmployeeId, fetchStructureEmployees])

  const hasValidEmployee = Boolean(selectedEmployeeId && String(selectedEmployeeId).trim())
  const hasValidTeam = selectedTeamIds.length > 0

  const handleConfirm = () => {
    if (isManualRun && !selectedCycleId) return

    if (runFor === 'self') {
      if (!hasValidEmployee) return
      const selected = getEmployeeById(selectedEmployeeId!)
      onConfirm({
        runFor: 'self',
        teamIds: [],
        employeeId: selectedEmployeeId!,
        employeeUserId: selected?.userId ?? '',
        managerUserId: selected?.managerUserId ?? '',
        ...(isManualRun ? { cycleId: selectedCycleId } : {})
      })
    } else {
      if (!hasValidTeam) return
      onConfirm({
        runFor: 'team',
        teamIds: selectedTeamIds,
        ...(isManualRun ? { cycleId: selectedCycleId } : {})
      })
    }
  }

  const needsCycleSelection = isManualRun && !selectedCycleId
  const isConfirmDisabled =
    needsCycleSelection ||
    (runFor === 'self'
      ? !hasValidEmployee || employeesLoading
      : runFor === 'team'
        ? !hasValidTeam || teamsLoading
        : true)

  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent data-testid="performance-evaluation-start-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('start-confirm-title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {resolvedCycle
              ? t('start-confirm-description-with-cycle', { name: resolvedCycle.name })
              : t('start-confirm-description-generic')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {isManualRun && (
            <div className="gba:space-y-2">
              <Label>{t('start-confirm-select-cycle')}</Label>
              <Combobox
                value={selectedCycleId}
                onValueChange={(v: string | string[]) => setSelectedCycleId(Array.isArray(v) ? (v[0] ?? '') : v)}
                options={cycleOptions}
                placeholder={t('placeholder-select-cycle') ?? 'Select cycle'}
                searchPlaceholder={t('table-name') ?? 'Name'}
                emptyText={t('empty-no-cycles') ?? 'No cycles'}
                className="gba:w-full"
                data-testid="performance-manual-run-cycle-select"
              />
            </div>
          )}
          <div className="gba:space-y-3">
            <Label>{t('start-confirm-run-for-label')}</Label>
            <RadioGroup
              value={runFor}
              onValueChange={(v: string) => setRunFor(v as RunForOption)}
              className="gba:flex gba:flex-col gba:gap-2"
              data-testid="performance-evaluation-run-for"
            >
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <RadioGroupItem value="self" id="run-for-employee" />
                <span>{t('start-confirm-run-for-employee')}</span>
              </label>
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <RadioGroupItem value="team" id="run-for-team" />
                <span>{t('start-confirm-run-for-team')}</span>
              </label>
            </RadioGroup>
          </div>

          {runFor === 'self' && (
            <div className="gba:space-y-2">
              <Label>{t('start-confirm-select-employee')}</Label>
              <EmployeeSelect
                value={selectedEmployeeId}
                onValueChange={id => setSelectedEmployeeId(id ?? null)}
                placeholder={
                  employeesLoading
                    ? t('start-confirm-placeholder-loading-employees')
                    : t('start-confirm-placeholder-employee')
                }
                employees={employeeOptionsForSelect}
                loading={employeesLoading}
                onSearch={searchEmployees}
                data-testid="performance-evaluation-start-employee-select"
                className="gba:w-full"
              />
            </div>
          )}

          {runFor === 'team' && (
            <div className="gba:space-y-2">
              <Label>{t('start-confirm-select-teams')}</Label>
              <div className="gba:w-full gba:max-w-full">
                <Combobox
                  mode="multiple"
                  value={selectedTeamIds}
                  onValueChange={(id: string[] | string) => {
                    const next = Array.isArray(id) ? id : typeof id === 'string' && id ? [id] : []
                    setSelectedTeamIds([...new Set(next)])
                  }}
                  options={organizationalUnits.map((unit: OrganizationalUnit) => ({
                    label: unit.name,
                    value: unit.id
                  }))}
                  placeholder={
                    teamsLoading
                      ? t('start-confirm-placeholder-loading')
                      : teamsError
                        ? teamsError.message
                        : t('start-confirm-placeholder-teams')
                  }
                  searchPlaceholder={t('start-confirm-search-teams')}
                  emptyText={t('start-confirm-empty-teams')}
                  disabled={teamsLoading || Boolean(teamsError)}
                  className="gba:w-full gba:max-w-full gba:h-auto gba:[&_button]:gba:max-w-full gba:[&_button]:gba:min-w-0 gba:[&_button]:gba:overflow-hidden gba:[&_button_span]:gba:truncate gba:[&_button]:gba:h-auto"
                />
              </div>
              {teamsError && (
                <p className="gba:text-sm gba:text-destructive" data-testid="performance-evaluation-teams-error">
                  {teamsError.message}
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="performance-evaluation-start-cancel">{t('button-cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            data-testid="performance-evaluation-start-confirm-button"
            disabled={isConfirmDisabled}
          >
            {t('start-confirm-button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
