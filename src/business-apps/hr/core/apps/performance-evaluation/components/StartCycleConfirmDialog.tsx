import React, { useEffect, useState } from 'react'
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
  RadioGroupItem
} from '@newwork/nw-design-system'
import type { PerformanceCycle } from '../types'
import {
  useOrganizationalUnits,
  type OrganizationalUnit
} from '@/business-apps/hr/core/apps/performance-evaluation/hooks/useOrganizationalUnits'

export type RunForOption = 'self' | 'team'

export interface StartCycleConfirmOptions {
  runFor: RunForOption
  teamIds: string[]
}

interface StartCycleConfirmDialogProps {
  open: boolean
  cycle: PerformanceCycle | null
  accessToken: string
  onConfirm: (options: StartCycleConfirmOptions) => void
  onCancel: () => void
}

export const StartCycleConfirmDialog: React.FC<StartCycleConfirmDialogProps> = ({
  open,
  cycle,
  accessToken,
  onConfirm,
  onCancel
}) => {
  const [runFor, setRunFor] = useState<RunForOption>('self')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const { organizationalUnits, loading, error } = useOrganizationalUnits(accessToken, open && runFor === 'team')

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setRunFor('self')
      setSelectedTeamIds([])
    }
  }, [open])

  const handleConfirm = () => {
    onConfirm({ runFor, teamIds: runFor === 'team' ? selectedTeamIds : [] })
  }

  const isConfirmDisabled = runFor === 'team' ? selectedTeamIds.length === 0 || loading : false

  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent data-testid="performance-evaluation-start-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>Start Performance Evaluation</AlertDialogTitle>
          <AlertDialogDescription>
            {cycle
              ? `Are you sure you want to start the performance evaluation for "${cycle.name}"? This will initiate the evaluation flow.`
              : 'Are you sure you want to start this performance evaluation?'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-3">
            <Label>Run evaluation for</Label>
            <RadioGroup
              value={runFor}
              onValueChange={(v: string) => setRunFor(v as RunForOption)}
              className="gba:flex gba:flex-col gba:gap-2"
              data-testid="performance-evaluation-run-for"
            >
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <RadioGroupItem value="self" id="run-for-self" />
                <span>Myself</span>
              </label>
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <RadioGroupItem value="team" id="run-for-team" />
                <span>Team</span>
              </label>
            </RadioGroup>
          </div>

          {runFor === 'team' && (
            <div className="gba:space-y-2">
              <Label>Select Teams *</Label>
              <div className="gba:w-full gba:max-w-full">
                <Combobox
                  mode="multiple"
                  value={selectedTeamIds}
                  onValueChange={(ids: string[] | string) => {
                    const next = Array.isArray(ids) ? ids : ids ? [ids] : []
                    setSelectedTeamIds(next)
                  }}
                  options={organizationalUnits.map((unit: OrganizationalUnit) => ({
                    label: unit.name,
                    value: unit.id
                  }))}
                  placeholder={
                    loading ? 'Loading teams...' : error ? error.message : 'Select teams to start evaluation for'
                  }
                  searchPlaceholder="Search teams..."
                  emptyText="No teams found"
                  disabled={loading || Boolean(error)}
                  className="gba:w-full gba:max-w-full gba:h-auto gba:[&_button]:gba:max-w-full gba:[&_button]:gba:min-w-0 gba:[&_button]:gba:overflow-hidden gba:[&_button_span]:gba:truncate gba:[&_button]:gba:h-auto gba:[&_button>div]:gba:flex-wrap gba:[&_button>div]:gba:gap-2"
                />
              </div>
              {error && (
                <p className="gba:text-sm gba:text-destructive" data-testid="performance-evaluation-teams-error">
                  {error.message}
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="performance-evaluation-start-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            data-testid="performance-evaluation-start-confirm-button"
            disabled={isConfirmDisabled}
          >
            Start Evaluation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
