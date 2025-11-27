import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Alert,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { ArrowLeftIcon, XIcon, FloppyDiskIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedIncrementTypeVersion } from '../types/increment-type-versions'
import IncrementTypeDetails from './IncrementTypeDetails'
import { useVersionOverlapCheck } from '../hooks/useVersionOverlapCheck'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTypesData } from '../hooks/useTimeTypesData'

export interface ConfigureIncrementTypeProps {
  incrementTypeVersion: TransformedIncrementTypeVersion | null
  onBack: () => void
  prefixDataTestId?: string
  incrementTypes?: Array<{ id: string; code: string; name: string; version: number }>
  incrementTypeVersions?: TransformedIncrementTypeVersion[]
  accessToken: string
  refetch: () => void
}

// Validation schema
const incrementTypeConfigSchema = z
  .object({
    incrementType: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.increment_type_required',
          'Increment Type is required'
        )
      ),
    validFrom: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.valid_from_required',
          'Valid From is required'
        )
      ),
    validTo: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.valid_to_required',
          'Valid To is required'
        )
      ),
    activeVersion: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.version_required',
          'Version is required'
        )
      )
  })
  .refine(
    data => {
      if (!data.validFrom || !data.validTo) return true
      return new Date(data.validTo) >= new Date(data.validFrom)
    },
    {
      message: getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.warnings.valid_to_date_cannot_be_earlier_than_valid_from_date',
        'Valid To date cannot be earlier than Valid From date'
      ),
      path: ['validTo']
    }
  )

export type IncrementTypeConfigFormData = z.infer<typeof incrementTypeConfigSchema>

const ConfigureIncrementType: React.FC<ConfigureIncrementTypeProps> = ({
  incrementTypeVersion,
  onBack,
  prefixDataTestId,
  incrementTypes = [],
  incrementTypeVersions = [],
  accessToken,
  refetch
}) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [loading, setLoading] = useState(false)
  const [currentIncrementTypeVersion, setCurrentIncrementTypeVersion] =
    useState<TransformedIncrementTypeVersion | null>(incrementTypeVersion)

  // Fetch time types once at the top level to avoid duplicate queries
  const { timeTypes } = useTimeTypesData({ accessToken })

  // Update currentIncrementTypeVersion when incrementTypeVersion prop changes
  useEffect(() => {
    setCurrentIncrementTypeVersion(incrementTypeVersion)
  }, [incrementTypeVersion])

  const form = useForm<IncrementTypeConfigFormData>({
    resolver: zodResolver(incrementTypeConfigSchema),
    defaultValues: {
      incrementType: currentIncrementTypeVersion?.incrementType?.id ?? '',
      validFrom: currentIncrementTypeVersion?.activeFrom ? currentIncrementTypeVersion.activeFrom.split('T')[0] : '',
      validTo: currentIncrementTypeVersion?.activeTo ? currentIncrementTypeVersion.activeTo.split('T')[0] : '',
      activeVersion: currentIncrementTypeVersion?.activeVersion ?? ''
    },
    mode: 'onChange'
  })

  // Reset form when currentIncrementTypeVersion changes
  useEffect(() => {
    if (currentIncrementTypeVersion) {
      form.reset({
        incrementType: currentIncrementTypeVersion?.incrementType?.id ?? '',
        validFrom: currentIncrementTypeVersion?.activeFrom ? currentIncrementTypeVersion.activeFrom.split('T')[0] : '',
        validTo: currentIncrementTypeVersion?.activeTo ? currentIncrementTypeVersion.activeTo.split('T')[0] : '',
        activeVersion: currentIncrementTypeVersion?.activeVersion ?? ''
      })
    }
  }, [currentIncrementTypeVersion, form])

  // Check for date overlap when creating or editing a version
  const { overlapWarning } = useVersionOverlapCheck({
    currentVersion: currentIncrementTypeVersion,
    allVersions: incrementTypeVersions,
    watch: form.watch,
    entityIdFieldName: 'incrementType',
    activeFromFieldName: 'validFrom',
    activeToFieldName: 'validTo',
    getEntityIdFromVersion: version => version.incrementType?.id || null,
    translationKeys: {
      versionWithoutEndDate: 'master-data:hr.time_attendance.increment_type_versions.warnings.version_without_end_date',
      plannedVersionAfterStart: 'master-data:hr.time_attendance.day_type_versions.warnings.planned_version_after_start',
      periodOverlap: 'master-data:hr.time_attendance.day_type_versions.warnings.period_overlap'
    }
  })

  // Check if save button should be disabled
  const isSaveDisabled = useMemo(() => {
    // Disable during loading
    if (loading) return true

    // Disable if there are overlap warnings
    if (overlapWarning) return true

    // Check if form is valid
    const isValid = form.formState.isValid
    const isDirty = form.formState.isDirty

    const isNewVersion = !currentIncrementTypeVersion?.id || currentIncrementTypeVersion.id === ''

    if (isNewVersion) {
      return !isValid
    }

    // For edit: must have changes (isDirty) and form must be valid
    return !isDirty || !isValid
  }, [loading, overlapWarning, form.formState.isValid, form.formState.isDirty, currentIncrementTypeVersion])

  // Helper function to convert date string (YYYY-MM-DD) to ISO 8601 Instant format
  const convertDateToInstant = (dateString: string): string => {
    if (!dateString) return ''
    // If it's already in ISO format, return as is
    if (dateString.includes('T')) return dateString
    // Convert "YYYY-MM-DD" to "YYYY-MM-DDTHH:mm:ss.000Z"
    return `${dateString}T00:00:00.000Z`
  }

  const handleSaveChanges = async (data: IncrementTypeConfigFormData) => {
    try {
      // Prevent save if there are overlap warnings
      if (overlapWarning) {
        console.warn('Cannot save: Date overlap detected', overlapWarning)
        return
      }

      setLoading(true)

      // Check if this is an update (has valid id) or create (no id or empty id)
      const isUpdate = currentIncrementTypeVersion?.id && currentIncrementTypeVersion.id !== ''

      const payload = {
        changeMode: 'INSERT',
        incrementTypeVersion: {
          ...(isUpdate ? { id: currentIncrementTypeVersion.id, version: currentIncrementTypeVersion.version } : {}),
          incrementType: data.incrementType,
          activeVersion: data.activeVersion,
          activeFrom: convertDateToInstant(data.validFrom),
          activeTo: convertDateToInstant(data.validTo)
        }
      }

      const response = await restClient.post(
        `/employee-time/${isUpdate ? 'updateIncrementTypeVersion' : 'createIncrementTypeVersion'}`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      const newIncrementTypeVersion = response?.incrementTypeVersion

      refetch()

      if (!isUpdate && newIncrementTypeVersion?.id) {
        setCurrentIncrementTypeVersion({
          id: newIncrementTypeVersion.id,
          version: newIncrementTypeVersion.version || 0,
          activeFrom: newIncrementTypeVersion.activeFrom || null,
          activeTo: newIncrementTypeVersion.activeTo || null,
          activeVersion: newIncrementTypeVersion.activeVersion || null,
          incrementType: currentIncrementTypeVersion?.incrementType || newIncrementTypeVersion.incrementType || null
        } as TransformedIncrementTypeVersion)
      }

      form.reset(form.getValues(), { keepValues: true })
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onBack()
  }

  return (
    <div data-testid={`${prefixDataTestId || ''}-ConfigureIncrementType`} className="gba:space-y-6 gba:mt-4">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={`${prefixDataTestId || ''}-back-to-overview-button`}
          >
            <ArrowLeftIcon size={16} />
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.back_to_overview',
              'Back to Overview'
            )}
          </Button>
          <div>
            <h1 className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
              {currentIncrementTypeVersion?.id && currentIncrementTypeVersion.id !== ''
                ? `${getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.configure_increment_type_version',
                    'Configure Increment Type Version'
                  )}: ${currentIncrementTypeVersion.activeVersion || currentIncrementTypeVersion.id}`
                : getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.create_increment_type_version',
                    'Create Increment Type Version Configuration'
                  )}
            </h1>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {currentIncrementTypeVersion?.id && currentIncrementTypeVersion.id !== ''
                ? getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.edit_description',
                    'Edit increment type version configuration'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.create_description',
                    'Create new increment type version configuration'
                  )}
            </p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <XIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('master-data:forms.common.buttons.cancel', 'Cancel')}
          </Button>
          <Button onClick={form.handleSubmit(handleSaveChanges)} disabled={isSaveDisabled}>
            <FloppyDiskIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.actions.save_changes',
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Overlap Warning */}
      {overlapWarning && (
        <Alert variant="destructive" data-testid={`${prefixDataTestId || ''}-overlap-warning`}>
          <AlertTitle>
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.date_overlap_detected',
              'Date Overlap Detected'
            )}
          </AlertTitle>
          <AlertDescription>{overlapWarning}</AlertDescription>
        </Alert>
      )}

      {/* Increment Type Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.increment_type_configuration',
              'Increment Type Configuration'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="gba:space-y-6">
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-4 gba:gap-4">
                <FormField
                  control={form.control}
                  name="incrementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_type_versions.single_increment_type',
                          'Increment Type'
                        )}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!currentIncrementTypeVersion?.incrementType}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.time_attendance.increment_type_versions.select_increment_type',
                                'Select increment type'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {incrementTypes.map(incrementTypeItem => (
                            <SelectItem key={incrementTypeItem.id} value={incrementTypeItem.id}>
                              {incrementTypeItem.code} - {incrementTypeItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_table.valid_from',
                          'Valid From'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-valid-from-input`}
                          type="date"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_table.valid_from',
                            'Valid From'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_table.valid_to',
                          'Valid To'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-valid-to-input`}
                          type="date"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_table.valid_to',
                            'Valid To'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activeVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'flow:formio.form_builder.component_settings.data_source.version',
                          'Version'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-version-input`}
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'flow:formio.form_builder.component_settings.data_source.version',
                            'Version'
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="details">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.details',
              'Details'
            )}
          </TabsTrigger>
          <TabsTrigger value="usage">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.increment_type_versions.usage', 'Usage')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <IncrementTypeDetails
            incrementTypeVersionId={
              currentIncrementTypeVersion?.id && currentIncrementTypeVersion.id !== ''
                ? currentIncrementTypeVersion.id
                : null
            }
            timeTypes={timeTypes}
            accessToken={accessToken}
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.increment_type_versions.usage',
                  'Usage'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-center gba:py-12">
                <p className="gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.usage_content',
                    'Usage content will be implemented here.'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ConfigureIncrementType
