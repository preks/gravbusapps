import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary.tsx'
import {
  JobPosition,
  jobPositionFormSchema,
  JobPositionFormValues
} from '@/business-apps/hr/core/forms/job-position/utils/JobPosition.types.ts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext.ts'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils.ts'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react'
import { FieldValues } from 'react-hook-form'
import { JobPositionFormFields } from './components/JobPositionFormFields.tsx'
import useJobPositions from './hooks/useJobPositions.ts'

// ─── Props Interface ────────────────────────────────────────────────────────

interface JobPositionFormProps {
  childAddButton?: ReactNode
  jobPosition?: Partial<JobPosition>
  onCancel?: () => void
  /** Called after a successful create or update (before the modal closes). */
  onMutationSuccess?: () => void
  prefixDataTestId?: string
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobPositionForm({
  childAddButton,
  jobPosition,
  onCancel,
  onMutationSuccess,
  prefixDataTestId = 'job-position',
  isDrawerActive = false,
  open,
  setOpen,
  accessToken,
  userInfo,
  additionalData
}: JobPositionFormProps & BusinessAppContextProps) {
  const structureId = getCurrentActiveStructureId()
  const [internalOpen, setInternalOpen] = useState(true)

  const {
    referenceDataLoading,
    error: dataError,
    createJobPosition,
    updateJobPosition,
    mutationLoading,
    refetch
  } = useJobPositions({ accessToken, userInfo, additionalData })

  const defaultValues = useMemo(
    (): JobPositionFormValues => ({
      name: jobPosition?.name || '',
      siteLocation: jobPosition?.siteLocation ?? null,
      department: jobPosition?.department ?? null,
      jobFamily: jobPosition?.jobFamily,
      jobFunction: jobPosition?.jobFunction,
      jobLevel: jobPosition?.jobLevel,
      jobProfile: jobPosition?.jobProfile
    }),
    [jobPosition]
  )

  const handleSubmit = async (values: FieldValues) => {
    const result = jobPositionFormSchema.safeParse(values)
    if (!result.success) {
      throw new Error(
        'Invalid form data: ' +
          result.error.issues.map(e => 'field: ' + e.path.join('.') + ' - ' + e.message).join(', ')
      )
    }

    try {
      if (jobPosition?.id) {
        await updateJobPosition(result.data, jobPosition.id, jobPosition.version)
      } else {
        await createJobPosition(result.data)
      }
      onMutationSuccess?.()
      setOpen?.(false)
    } finally {
      /* empty */
    }
  }

  if (!structureId) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive">
        Error: No structure ID found. Please ensure you are in a valid organizational context.
      </div>
    )
  }

  if (referenceDataLoading) {
    return <div className="gba:p-6 gba:text-center gba:text-muted-foreground">Loading job position data...</div>
  }

  if (dataError) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-destructive">Error loading job position data: {dataError}</div>
        <button
          onClick={refetch}
          className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-primary gba:text-primary-foreground gba:rounded-md"
        >
          Retry
        </button>
      </div>
    )
  }

  const dialogOpen = open ?? internalOpen
  const setDialogOpen = setOpen || setInternalOpen

  return (
    <ErrorBoundary>
      <FormWrapperModal
        childAddButton={childAddButton}
        title={jobPosition?.id ? 'Edit Job Position' : 'Create Job Position'}
        description={
          jobPosition?.id
            ? 'Update the job position information'
            : 'Job Position is attributed to a site location and a department.\nIt can be defined via Job Family, Job Function and Job Level, which ultimately results in a Job Profile.'
        }
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={defaultValues}
        isEditing={!!jobPosition?.id}
        loading={mutationLoading}
        dataTestId={`${prefixDataTestId}-form-modal`}
        isDrawerActive={isDrawerActive}
        open={dialogOpen}
        setOpen={setDialogOpen}
        errorMessage={dataError ?? ''}
      >
        <JobPositionFormFields
          prefixDataTestId={prefixDataTestId}
          accessToken={accessToken}
          isEditing={!!jobPosition?.id}
        />
      </FormWrapperModal>
    </ErrorBoundary>
  )
}
