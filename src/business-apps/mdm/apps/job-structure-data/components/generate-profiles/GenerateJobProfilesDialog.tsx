import { useState, useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  Progress,
  Separator
} from '@newwork/nw-design-system'
import { GridFourIcon } from '@phosphor-icons/react'
import { PartialJobFunction } from '../../utils/JobFunction.types'
import { JobLevel } from '../../utils/JobLevel.types'
import { JobProfile } from '../../utils/JobProfile.types'
import { useGenerateProfiles } from './useGenerateProfiles'
import ProfileMatrix from './ProfileMatrix'
import SelectedProfilesTable from './SelectedProfilesTable'

interface GenerateJobProfilesDialogProps {
  accessToken: string
  jobFunctions: PartialJobFunction[]
  jobLevels: JobLevel[]
  existingProfiles: JobProfile[]
  refetch: () => Promise<void> | void
  dataTestId?: string
}

export default function GenerateJobProfilesDialog({
  accessToken,
  jobFunctions,
  jobLevels,
  existingProfiles,
  refetch,
  dataTestId
}: Readonly<GenerateJobProfilesDialogProps>) {
  const [open, setOpen] = useState(false)

  const {
    selectedCombinations,
    validationErrors,
    getCreatableCombinations,
    isSaving,
    saveProgress,

    toggleCell,
    toggleRow,
    toggleColumn,
    selectAll,
    updateTitle,
    saveProfiles,
    resetSelection,

    isCellSelected,
    isCellExisting,
    isRowFullySelected,
    isColumnFullySelected,

    makePairKey
  } = useGenerateProfiles(accessToken, jobFunctions, jobLevels, existingProfiles, refetch)

  const creatableCount = getCreatableCombinations().length

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSaving) return
      setOpen(nextOpen)
      if (!nextOpen) {
        resetSelection()
      }
    },
    [resetSelection, isSaving]
  )

  const handleCreate = useCallback(async () => {
    const result = await saveProfiles()
    if (result.failed === 0) {
      setOpen(false)
      resetSelection()
    }
  }, [saveProfiles, resetSelection])

  const hasNoReferenceData = jobFunctions.length === 0 || jobLevels.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={e => e.stopPropagation()} data-testid={`${dataTestId}-generate-profiles`}>
          <GridFourIcon className="gba:mr-1" /> Generate Profiles
        </Button>
      </DialogTrigger>
      <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-hidden gba:flex gba:flex-col">
        <DialogTitle>Generate Job Profiles</DialogTitle>
        <DialogDescription>
          Select Function + Level combinations to batch-create job profiles. Existing profiles are shown as disabled.
        </DialogDescription>

        {hasNoReferenceData ? (
          <div className="gba:text-center gba:py-8 gba:text-sm gba:text-muted-foreground">
            <p>You need at least one Job Function and one Job Level before you can generate profiles.</p>
            <p className="gba:mt-1">Create them in the respective tabs first.</p>
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:gap-4 gba:min-h-0 gba:flex-1">
            <ProfileMatrix
              jobFunctions={jobFunctions}
              jobLevels={jobLevels}
              isCellSelected={isCellSelected}
              isCellExisting={isCellExisting}
              isRowFullySelected={isRowFullySelected}
              isColumnFullySelected={isColumnFullySelected}
              onToggleCell={toggleCell}
              onToggleRow={toggleRow}
              onToggleColumn={toggleColumn}
              onSelectAll={selectAll}
              selectedCount={selectedCombinations.length}
              dataTestId={dataTestId}
            />

            <Separator />

            <SelectedProfilesTable
              combinations={selectedCombinations}
              validationErrors={validationErrors}
              onUpdateTitle={updateTitle}
              makePairKey={makePairKey}
              dataTestId={dataTestId}
            />

            {isSaving && saveProgress && (
              <div className="gba:flex gba:flex-col gba:gap-2">
                <Progress value={(saveProgress.current / saveProgress.total) * 100} />
                <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                  Creating profile {saveProgress.current} of {saveProgress.total}...
                </p>
              </div>
            )}

            <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2 gba:shrink-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creatableCount === 0 || isSaving}
                data-testid={`${dataTestId}-create-profiles`}
              >
                {isSaving ? 'Creating...' : `Create ${creatableCount} Profile${creatableCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
