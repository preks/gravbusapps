import { SetStateAction, Dispatch, useCallback, useMemo, ReactNode, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { FieldValues } from 'react-hook-form'
import {
  CompensationBandPolicy,
  CompensationBandPolicyMutationPayload
} from '@/business-apps/mdm/apps/compensation-data/utils/CompensationBandPolicy.types'
import { CompensationBand } from '@/business-apps/mdm/apps/compensation-data/utils/CompensationBand.types'
import { JobLevel } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'
import { JobFamily } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types'
import { GeoZone } from '@/business-apps/mdm/apps/organizational-data/types/GeoZone.types.ts'
import {
  compensationBandPolicySchema,
  CompensationBandPolicyFormValues,
  validateCompensationBandPolicyPriority
} from '@/business-apps/mdm/apps/compensation-data/validation/CompensationBandPolicy.validation'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { ComboboxField, NumberField } from '@/business-apps/mdm/components/form-fields/FormFields'
import { useCompensationBandPolicyQueries } from '@/business-apps/mdm/apps/compensation-data/queries/CompensationBandPolicyQueries.ts'
import { toast } from '@newwork/nw-design-system'

interface CompensationBandPolicyFormProps extends BusinessAppContextProps {
  childAddButton?: ReactNode
  compensationBandPolicy?: Partial<CompensationBandPolicy>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  compensationBands: CompensationBand[]
  jobLevels: JobLevel[]
  jobFamilies: JobFamily[]
  geoZones: GeoZone[]
}

export default function CompensationBandPolicyForm({
  childAddButton,
  compensationBandPolicy,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  open,
  setOpen,
  compensationBands,
  jobLevels,
  jobFamilies,
  geoZones
}: Readonly<CompensationBandPolicyFormProps>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compensationBandSearch, setCompensationBandSearch] = useState('')
  const [jobLevelSearch, setJobLevelSearch] = useState('')
  const [jobFamilySearch, setJobFamilySearch] = useState('')
  const [geoZoneSearch, setGeoZoneSearch] = useState('')

  const { createCompensationBandPolicy, updateCompensationBandPolicy } = useCompensationBandPolicyQueries(accessToken)

  const dialogOpen = open ?? internalOpen
  const setDialogOpen = setOpen || setInternalOpen

  const filteredCompensationBands = useMemo(() => {
    if (!compensationBandSearch) return compensationBands
    const term = compensationBandSearch.toLowerCase()
    return compensationBands.filter(cb => cb.name?.toLowerCase().includes(term))
  }, [compensationBands, compensationBandSearch])

  const filteredJobLevels = useMemo(() => {
    if (!jobLevelSearch) return jobLevels
    const term = jobLevelSearch.toLowerCase()
    return jobLevels.filter(jl => jl.name?.toLowerCase().includes(term) || jl.code?.toLowerCase().includes(term))
  }, [jobLevels, jobLevelSearch])

  const filteredJobFamilies = useMemo(() => {
    if (!jobFamilySearch) return jobFamilies
    const term = jobFamilySearch.toLowerCase()
    return jobFamilies.filter(jf => jf.name?.toLowerCase().includes(term) || jf.code?.toLowerCase().includes(term))
  }, [jobFamilies, jobFamilySearch])

  const filteredGeoZones = useMemo(() => {
    if (!geoZoneSearch) return geoZones
    const term = geoZoneSearch.toLowerCase()
    return geoZones.filter(gz => gz.name?.toLowerCase().includes(term))
  }, [geoZones, geoZoneSearch])

  const handleCompensationBandSearch = useCallback((query: string) => setCompensationBandSearch(query), [])
  const handleJobLevelSearch = useCallback((query: string) => setJobLevelSearch(query), [])
  const handleJobFamilySearch = useCallback((query: string) => setJobFamilySearch(query), [])
  const handleGeoZoneSearch = useCallback((query: string) => setGeoZoneSearch(query), [])

  const handleSubmit = async (values: FieldValues) => {
    // Validate form data with Zod schema
    const validationResult = compensationBandPolicySchema.safeParse(values)
    if (!validationResult.success) {
      console.error('Invalid form data:', validationResult.error)
      throw new Error(
        'Invalid form data: ' +
          validationResult.error.issues.map(e => 'field: ' + e.path.join('.') + ' - ' + e.message).join(', ')
      )
    }

    const validatedValues = validationResult.data

    // Additional priority validation
    const priorityError = validateCompensationBandPolicyPriority(validatedValues.priority)
    if (priorityError) {
      throw new Error(priorityError)
    }

    const payload: CompensationBandPolicyMutationPayload = {
      changeMode: 'INSERT',
      compensationBandPolicy: {
        compensationBandId: validatedValues.compensationBand?.id || '',
        jobLevelId: validatedValues.jobLevel?.id || '',
        jobFamilyId: validatedValues.jobFamily?.id || '',
        geoZoneId: validatedValues.geoZone?.id || '',
        priority: validatedValues.priority,
        ...(compensationBandPolicy ? { id: compensationBandPolicy.id, version: compensationBandPolicy.version } : {})
      }
    }

    setLoading(true)
    setError(null)

    try {
      await (compensationBandPolicy ? updateCompensationBandPolicy : createCompensationBandPolicy)(payload)
      toast.success(
        compensationBandPolicy
          ? 'Compensation band policy updated successfully!'
          : 'Compensation band policy created successfully!'
      )
      refetch()
      setOpen?.(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(
    (): CompensationBandPolicyFormValues => ({
      compensationBand: compensationBandPolicy?.compensationBand || null,
      jobLevel: compensationBandPolicy?.jobLevel || null,
      jobFamily: compensationBandPolicy?.jobFamily || null,
      geoZone: compensationBandPolicy?.geoZone || null,
      priority: compensationBandPolicy?.priority || 100
    }),
    [compensationBandPolicy]
  )

  return (
    <ErrorBoundary>
      <FormWrapperModal
        childAddButton={childAddButton}
        title={compensationBandPolicy ? 'Edit Compensation Band Policy' : 'Create Compensation Band Policy'}
        description={
          compensationBandPolicy
            ? 'Update the compensation band policy information'
            : 'Create a new compensation band policy'
        }
        onSubmit={handleSubmit}
        onCancel={onCancel}
        defaultValues={defaultValues}
        isEditing={!!compensationBandPolicy}
        loading={loading}
        dataTestId={`${prefixDataTestId}-form-modal`}
        isDrawerActive={isDrawerActive}
        open={dialogOpen}
        setOpen={setDialogOpen}
        errorMessage={error ?? ''}
      >
        <ComboboxField<CompensationBandPolicyFormValues>
          name="compensationBand"
          label="Compensation Band"
          required
          options={filteredCompensationBands.map(cb => ({ value: cb.id, label: cb.name }))}
          placeholder="Select a Compensation Band"
          searchPlaceholder="Search compensation bands..."
          emptyText="No compensation bands found"
          dataTestId={`${prefixDataTestId}-compensation-band-combobox`}
          onSearch={handleCompensationBandSearch}
          onValueChange={(selectedId, field) => {
            const selectedRecord = compensationBands.find(cb => cb.id === selectedId)
            field.onChange(selectedRecord || null)
          }}
        />

        <ComboboxField<CompensationBandPolicyFormValues>
          name="jobLevel"
          label="Job Level"
          required
          options={filteredJobLevels.map(jl => ({
            value: jl.id,
            label: `${jl.name} (${jl.code}) - Level ${jl.hierarchyOrder}`
          }))}
          placeholder="Select a Job Level"
          searchPlaceholder="Search job levels..."
          emptyText="No job levels found"
          dataTestId={`${prefixDataTestId}-job-level-combobox`}
          onSearch={handleJobLevelSearch}
          onValueChange={(selectedId, field) => {
            const selectedRecord = jobLevels.find(jl => jl.id === selectedId)
            field.onChange(selectedRecord || null)
          }}
        />

        <ComboboxField<CompensationBandPolicyFormValues>
          name="jobFamily"
          label="Job Family"
          required
          options={filteredJobFamilies.map(jf => ({ value: jf.id, label: `${jf.name} (${jf.code})` }))}
          placeholder="Select a Job Family"
          searchPlaceholder="Search job families..."
          emptyText="No job families found"
          dataTestId={`${prefixDataTestId}-job-family-combobox`}
          onSearch={handleJobFamilySearch}
          onValueChange={(selectedId, field) => {
            const selectedRecord = jobFamilies.find(jf => jf.id === selectedId)
            field.onChange(selectedRecord || null)
          }}
        />

        <ComboboxField<CompensationBandPolicyFormValues>
          name="geoZone"
          label="Geo Zone"
          required
          options={filteredGeoZones.map(gz => ({ value: gz.id, label: gz.name }))}
          placeholder="Select a Geo Zone"
          searchPlaceholder="Search geo zones..."
          emptyText="No geo zones found"
          dataTestId={`${prefixDataTestId}-geo-zone-combobox`}
          onSearch={handleGeoZoneSearch}
          onValueChange={(selectedId, field) => {
            const selectedRecord = geoZones.find(gz => gz.id === selectedId)
            field.onChange(selectedRecord || null)
          }}
        />

        <NumberField<CompensationBandPolicyFormValues>
          name="priority"
          label="Priority"
          required
          placeholder="e.g., 100"
          min={100}
          step={100}
          max={1000}
          validate={(value: number) => {
            const error = validateCompensationBandPolicyPriority(value)
            return error || true
          }}
          dataTestId={`${prefixDataTestId}-priority-input`}
        />
      </FormWrapperModal>
    </ErrorBoundary>
  )
}
