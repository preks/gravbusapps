import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Alert,
  AlertTitle,
  AlertDescription,
  DateInput,
  Combobox
} from '@newwork/nw-design-system'
import { ArrowLeftIcon, XIcon, FloppyDiskIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import DayTypeSetup from './DayTypeSetup'
import { TransformedDayTypeVersion } from '../types/day-type-versions'
import { FieldTypeOption } from '../types/day-type-version-details'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ConfigureDayTypeProps {
  dayTypeVersion: TransformedDayTypeVersion | null
  onBack: () => void
  prefixDataTestId?: string
  dayTypes?: Array<{ id: string; code: string; name: string; version: number }>
  dayTypeVersions?: TransformedDayTypeVersion[]
  incrementTypes?: Array<{ id: string; code: string; name: string; version: number }>
  breakTypes?: Array<{ id: string; code: string; name: string; version: number }>
  roundingRules?: Array<{ id: string; code: string; name: string; version: number }>
  accessToken: string
  refetch: () => void
  fieldTypeOptions: FieldTypeOption[]
}

// Validation schema - messages will be translated at runtime
const dayTypeConfigSchema = z
  .object({
    dayType: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.day_type_required',
          'Day Type is required'
        )
      ),
    breakRule: z.string(),
    incrementType: z.string(),
    roundingRule: z.string(),
    color: z.string(),
    activeFrom: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.valid_from_required',
          'Valid From is required'
        )
      ),
    activeTo: z.string(),
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
      if (!data.activeFrom || !data.activeTo) return true
      return new Date(data.activeTo) >= new Date(data.activeFrom)
    },
    {
      message: getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_types.version.valid_to_date_cannot_be_earlier_than_valid_from_date',
        'End date cannot be earlier than start date'
      ),
      path: ['activeTo']
    }
  )

export type DayTypeConfigFormData = z.infer<typeof dayTypeConfigSchema>

// Available colors with hex values from design system
const availableColors = [
  { key: 'emerald-600', hex: '#059669' },
  { key: 'orange-500', hex: '#ea580c' },
  { key: 'blue-600', hex: '#2563eb' },
  { key: 'rose-600', hex: '#dc2626' },
  { key: 'gray-900', hex: '#111827' },
  { key: 'gray-500', hex: '#6b7280' },
  { key: 'violet-600', hex: '#7c3aed' },
  { key: 'cyan-600', hex: '#0891b2' },
  { key: 'green-600', hex: '#16a34a' },
  { key: 'yellow-600', hex: '#ca8a04' },
  { key: 'rose-700', hex: '#be123c' },
  { key: 'purple-600', hex: '#9333ea' }
]

const ConfigureDayType: React.FC<ConfigureDayTypeProps> = ({
  dayTypeVersion,
  onBack,
  prefixDataTestId,
  dayTypes = [],
  dayTypeVersions = [],
  incrementTypes = [],
  breakTypes = [],
  roundingRules = [],
  accessToken,
  refetch,
  fieldTypeOptions
}) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [loading, setLoading] = useState(false)
  const [currentDayTypeVersion, setCurrentDayTypeVersion] = useState<TransformedDayTypeVersion | null>(dayTypeVersion)
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

  // Update currentDayTypeVersion when dayTypeVersion prop changes
  useEffect(() => {
    setCurrentDayTypeVersion(dayTypeVersion)
  }, [dayTypeVersion])

  const form = useForm<DayTypeConfigFormData>({
    resolver: zodResolver(dayTypeConfigSchema),
    defaultValues: {
      dayType: currentDayTypeVersion?.dayType?.id ?? '',
      incrementType: currentDayTypeVersion?.incrementType?.id ?? '',
      roundingRule: currentDayTypeVersion?.roundingRule?.id ?? '',
      breakRule: currentDayTypeVersion?.breakType?.id ?? '',
      color: currentDayTypeVersion?.color ?? '',
      activeFrom: currentDayTypeVersion?.activeFrom ? currentDayTypeVersion.activeFrom.split('T')[0] : '',
      activeTo: currentDayTypeVersion?.activeTo ? currentDayTypeVersion.activeTo.split('T')[0] : '',
      activeVersion: currentDayTypeVersion?.activeVersion ?? ''
    },
    mode: 'onChange'
  })

  // Reset form when currentDayTypeVersion changes
  useEffect(() => {
    if (currentDayTypeVersion) {
      form.reset({
        dayType: currentDayTypeVersion?.dayType?.id ?? '',
        incrementType: currentDayTypeVersion?.incrementType?.id ?? '',
        roundingRule: currentDayTypeVersion?.roundingRule?.id ?? '',
        breakRule: currentDayTypeVersion?.breakType?.id ?? '',
        color: currentDayTypeVersion?.color ?? '',
        activeFrom: currentDayTypeVersion?.activeFrom ? currentDayTypeVersion.activeFrom.split('T')[0] : '',
        activeTo: currentDayTypeVersion?.activeTo ? currentDayTypeVersion.activeTo.split('T')[0] : '',
        activeVersion: currentDayTypeVersion?.activeVersion ?? ''
      })
    }
  }, [currentDayTypeVersion, form])

  // Check if save button should be disabled
  const isSaveDisabled = useMemo(() => {
    // Disable during loading
    if (loading) return true

    // Disable if there are overlap warnings
    if (overlapWarning) return true

    // Check if form is valid
    const isValid = form.formState.isValid
    const isDirty = form.formState.isDirty

    const isNewVersion = !currentDayTypeVersion?.id || currentDayTypeVersion.id === ''

    if (isNewVersion) {
      return !isValid
    }

    // For edit: must have changes (isDirty) and form must be valid
    return !isDirty || !isValid
  }, [loading, overlapWarning, form.formState.isValid, form.formState.isDirty, currentDayTypeVersion])

  // Find versions that overlap with the version's date range
  const findOverlappingVersions = useCallback(
    (dayTypeId: string, newActiveFrom: Date, newActiveTo: Date | null): TransformedDayTypeVersion[] => {
      if (!dayTypeId) return []

      return dayTypeVersions.filter(version => {
        if (version.dayType?.id !== dayTypeId || version.id === currentDayTypeVersion?.id) return false
        if (!version.activeFrom) return false

        const versionActiveFrom = new Date(version.activeFrom)
        const versionActiveTo = version.activeTo ? new Date(version.activeTo) : null

        // Two periods overlap if: newActiveFrom <= versionActiveTo AND newActiveTo >= versionActiveFrom
        // Handle cases where one or both periods have no end date (infinite)
        const newStartsBeforeVersionEnds = !versionActiveTo || newActiveFrom <= versionActiveTo
        const newEndsAfterVersionStarts = !newActiveTo || newActiveTo >= versionActiveFrom

        return newStartsBeforeVersionEnds && newEndsAfterVersionStarts
      })
    },
    [dayTypeVersions, currentDayTypeVersion]
  )

  // Find version without end date (infinite version) for a given dayType
  const findVersionWithoutEndDate = useCallback(
    (dayTypeId: string): TransformedDayTypeVersion | null => {
      if (!dayTypeId) return null

      const versionsForDayType = dayTypeVersions.filter(
        version => version.dayType?.id === dayTypeId && version.id !== currentDayTypeVersion?.id && !version.activeTo
      )

      if (versionsForDayType.length === 0) return null

      // Sort by activeFrom descending (most recent first)
      const sortedVersions = [...versionsForDayType].sort((a, b) => {
        const dateA = new Date(a.activeFrom || '').getTime()
        const dateB = new Date(b.activeFrom || '').getTime()
        return dateB - dateA
      })
      return sortedVersions[0] || null
    },
    [dayTypeVersions, currentDayTypeVersion]
  )

  // Find next planned version after a given date for a given dayType
  const findNextPlannedVersion = useCallback(
    (dayTypeId: string, afterDate: string): TransformedDayTypeVersion | null => {
      if (!dayTypeId || !afterDate) return null

      const afterDateObj = new Date(afterDate)

      const versionsForDayType = dayTypeVersions.filter(version => {
        if (version.dayType?.id !== dayTypeId || version.id === currentDayTypeVersion?.id) return false
        if (!version.activeFrom) return false

        const versionActiveFrom = new Date(version.activeFrom)
        return versionActiveFrom > afterDateObj
      })

      if (versionsForDayType.length === 0) return null

      // Sort by activeFrom ascending (earliest first)
      const sortedVersions = [...versionsForDayType].sort((a, b) => {
        const dateA = new Date(a.activeFrom || '').getTime()
        const dateB = new Date(b.activeFrom || '').getTime()
        return dateA - dateB
      })
      return sortedVersions[0] || null
    },
    [dayTypeVersions, currentDayTypeVersion]
  )

  // Check for date overlap when creating or editing a version
  useEffect(() => {
    const dayTypeId = form.watch('dayType')
    const activeFrom = form.watch('activeFrom')
    const activeTo = form.watch('activeTo')

    if (!dayTypeId || !activeFrom) {
      setOverlapWarning(null)
      return
    }

    const newActiveFrom = new Date(activeFrom)
    const newActiveTo = activeTo ? new Date(activeTo) : null

    // Case 1: Check if there's a version without end date (infinite version)
    const versionWithoutEndDate = findVersionWithoutEndDate(dayTypeId)
    if (versionWithoutEndDate) {
      const versionActiveFrom = new Date(versionWithoutEndDate.activeFrom || '')
      // If version starts after the infinite version starts, there will be overlap
      if (newActiveFrom >= versionActiveFrom) {
        const versionActiveFromStr = formatDate(versionActiveFrom.toISOString().split('T')[0])
        setOverlapWarning(
          getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types_version.warnings.version_without_end_date',
            `A version without an end date exists for this day type. The existing version starts on ${versionActiveFromStr} and has no end date. Please close the existing version first by setting an end date, then create the version.`,
            { startDate: versionActiveFromStr }
          )
        )
        return
      }
    }

    // Case 2: Check if there's a planned version after the version's start date
    // Only show warning if version doesn't have end date OR end date is after planned version's start
    const nextPlannedVersion = findNextPlannedVersion(dayTypeId, activeFrom)
    if (nextPlannedVersion) {
      const nextVersionActiveFrom = new Date(nextPlannedVersion.activeFrom || '')
      // If version doesn't have end date OR version's end date is after or equal to next version's start date
      if (!newActiveTo || newActiveTo >= nextVersionActiveFrom) {
        const nextVersionActiveFromStr = formatDate(nextVersionActiveFrom.toISOString().split('T')[0])
        setOverlapWarning(
          getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types_version.warnings.planned_version_after_start',
            `A version is already planned after the start date of this version. The planned version starts on {${nextVersionActiveFromStr}. Please set an end date for this version before the planned version starts, or modify the planned version.`,
            { plannedStartDate: nextVersionActiveFromStr }
          )
        )
        return
      }
    }

    // Case 3: Check for actual overlap with existing versions
    const overlappingVersions = findOverlappingVersions(dayTypeId, newActiveFrom, newActiveTo)
    if (overlappingVersions.length > 0) {
      // Find the version that ends latest among overlapping versions
      const latestOverlappingVersion = overlappingVersions.reduce((latest, current) => {
        const latestEnd = latest.activeTo ? new Date(latest.activeTo).getTime() : Infinity
        const currentEnd = current.activeTo ? new Date(current.activeTo).getTime() : Infinity
        return currentEnd > latestEnd ? current : latest
      }, overlappingVersions[0])

      if (latestOverlappingVersion.activeTo) {
        const latestActiveTo = new Date(latestOverlappingVersion.activeTo)
        // Calculate suggested start date (one day after latest activeTo)
        const suggestedDate = new Date(latestActiveTo)
        suggestedDate.setDate(suggestedDate.getDate() + 1)
        const suggestedDateStr = suggestedDate.toISOString().split('T')[0]

        setOverlapWarning(
          getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types.version.a_version_already_exists_for_this_period',
            `A version already exists for this period. The existing version ends on ${formatDate(latestActiveTo.toISOString().split('T')[0])}. Please either modify the existing version or create the version starting from ${formatDate(suggestedDateStr)}.`,
            {
              endDate: formatDate(latestActiveTo.toISOString().split('T')[0]),
              suggestedDate: formatDate(suggestedDateStr)
            }
          )
        )
        return
      }
    }

    // No warnings
    setOverlapWarning(null)
  }, [
    form.watch('dayType'),
    form.watch('activeFrom'),
    form.watch('activeTo'),
    currentDayTypeVersion,
    findOverlappingVersions,
    findVersionWithoutEndDate,
    findNextPlannedVersion
  ])

  // Helper function to convert date string (YYYY-MM-DD) to ISO 8601 Instant format
  const convertDateToInstant = (dateString: string): string => {
    if (!dateString) return ''
    // If it's already in ISO format, return as is
    if (dateString.includes('T')) return dateString
    // Convert "YYYY-MM-DD" to "YYYY-MM-DDTHH:mm:ss.000Z"
    return `${dateString}T00:00:00.000Z`
  }

  // Helper function to convert empty strings to null
  const toNullIfEmpty = (value: string | undefined | null): string | null => {
    return value === '' || value === undefined ? null : value
  }

  const handleSaveChanges = async (data: DayTypeConfigFormData) => {
    try {
      // Prevent save if there are overlap warnings
      if (overlapWarning) {
        console.warn('Cannot save: Date overlap detected', overlapWarning)
        return
      }

      setLoading(true)

      // Check if this is an update (has valid id) or create (no id or empty id)
      const isUpdate = currentDayTypeVersion?.id && currentDayTypeVersion.id !== ''

      const payload = {
        changeMode: 'INSERT',
        dayTypeVersion: {
          ...(isUpdate ? { id: currentDayTypeVersion.id, version: currentDayTypeVersion.version } : {}),
          dayType: data.dayType,
          breakType: toNullIfEmpty(data.breakRule),
          incrementType: toNullIfEmpty(data.incrementType),
          roundingRule: toNullIfEmpty(data.roundingRule),
          color: toNullIfEmpty(data.color),
          activeVersion: data.activeVersion,
          activeFrom: convertDateToInstant(data.activeFrom),
          activeTo: toNullIfEmpty(convertDateToInstant(data.activeTo))
        }
      }

      const response = await restClient.post(
        `/employee-time/${isUpdate ? 'updateDayTypeVersion' : 'createDayTypeVersion'}`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      const newDayTypeVersion = response?.dayTypeVersion

      refetch()

      if (!isUpdate && newDayTypeVersion?.id) {
        setCurrentDayTypeVersion({
          id: newDayTypeVersion.id,
          version: newDayTypeVersion.version || 0,
          color: newDayTypeVersion.color || '',
          activeFrom: newDayTypeVersion.activeFrom || null,
          activeTo: newDayTypeVersion.activeTo || null,
          status: 'inactive',
          activeVersion: newDayTypeVersion.activeVersion || null,
          dayTypeVersionDetail: [],
          roundingRule: newDayTypeVersion.roundingRule || null,
          incrementType: newDayTypeVersion.incrementType || null,
          breakType: newDayTypeVersion.breakType || null,
          dayType: currentDayTypeVersion?.dayType || newDayTypeVersion.dayType || null
        } as TransformedDayTypeVersion)
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
    <div data-testid={`${prefixDataTestId || ''}-ConfigureDayType`} className="gba:space-y-6 gba:mt-4">
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
              {currentDayTypeVersion?.id && currentDayTypeVersion.id !== ''
                ? `${getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_type_versions.configure_day_type_version', 'Configure Day Type Version')}: ${currentDayTypeVersion.activeVersion || currentDayTypeVersion.id}`
                : getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.day_type_versions.create_day_type_version',
                    'Create Day Type Version Configuration'
                  )}
            </h1>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {currentDayTypeVersion?.id && currentDayTypeVersion.id !== ''
                ? getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.day_type_versions.edit_description',
                    'Edit day type version configuration'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.day_type_versions.create_description',
                    'Create new day type version configuration'
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
              'master-data:hr.time_attendance.day_type_versions.date_overlap_detected',
              'Date Overlap Detected'
            )}
          </AlertTitle>
          <AlertDescription>{overlapWarning}</AlertDescription>
        </Alert>
      )}

      {/* Day Type Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.day_type_configuration',
              'Day Type Configuration'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="gba:space-y-6">
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-4 gba:gap-4">
                <FormField
                  control={form.control}
                  name="dayType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {`${getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.day_types.single_day_type',
                          'Day Type'
                        )}*`}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!currentDayTypeVersion?.dayType}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.time_attendance.day_type_versions.select_day_type',
                                'Select day type'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dayTypes.map(dayTypeItem => (
                            <SelectItem key={dayTypeItem.id} value={dayTypeItem.id}>
                              {dayTypeItem.code} - {dayTypeItem.name}
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
                  name="activeFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {`${getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_table.valid_from',
                          'Valid From'
                        )}*`}
                      </FormLabel>
                      <FormControl>
                        <DateInput
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
                  name="activeTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_table.valid_to',
                          'Valid To'
                        )}
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          {...field}
                          type="date"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_table.valid_to',
                            'Valid To'
                          )}
                          data-testid={`${prefixDataTestId || ''}-valid-to-input`}
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
                        {`${getTranslationFromI18nKeyAndLabel(
                          'flow:formio.form_builder.component_settings.data_source.version',
                          'Version'
                        )}*`}
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
                <FormField
                  control={form.control}
                  name="breakRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.break_types.break_rule',
                          'Break Rule'
                        )}
                      </FormLabel>
                      <Combobox
                        options={breakTypes.map(rule => ({ value: rule.id, label: rule.name }))}
                        value={field.value}
                        onValueChange={value => field.onChange(value)}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.break_types.actions.select_break_rule',
                          'Select break rule'
                        )}
                        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.break_types.actions.search_placeholder',
                          'Search break rules...'
                        )}
                        emptyText={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.break_types.no_break_rules_found',
                          'No break rules found'
                        )}
                        className="w-full"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="incrementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_types.premium_pay_rule',
                          'Premium Pay Rule'
                        )}
                      </FormLabel>
                      <Combobox
                        options={incrementTypes.map(rule => ({ value: rule.id, label: rule.name }))}
                        value={field.value}
                        onValueChange={value => field.onChange(value)}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_types.actions.select_premium_pay_rule',
                          'Select premium pay rule'
                        )}
                        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_types.actions.search_placeholder',
                          'Search premium pay rules...'
                        )}
                        emptyText={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_types.no_premium_pay_rules_found',
                          'No premium pay rules found'
                        )}
                        className="w-full"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roundingRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.rounding_rules.rounding_rule',
                          'Rounding Rule'
                        )}
                      </FormLabel>
                      <Combobox
                        options={roundingRules.map(rule => ({ value: rule.id, label: rule.name }))}
                        value={field.value}
                        onValueChange={value => field.onChange(value)}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.rounding_rules.actions.select_rounding_rule',
                          'Select rounding rule'
                        )}
                        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.rounding_rules.actions.search_placeholder',
                          'Search rounding rules...'
                        )}
                        emptyText={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.rounding_rules.no_rounding_rules_found',
                          'No rounding rules found'
                        )}
                        className="w-full"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'flow:formio.form_builder.component_settings.color.label',
                          'Color'
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.time_attendance.day_type_versions.actions.select_color',
                                'Select color'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color.key} value={color.hex}>
                              <div className="gba:flex gba:items-center gba:justify-center">
                                <div
                                  className="gba:w-6 gba:h-6 gba:rounded-md gba:border"
                                  style={{ backgroundColor: color.hex }}
                                />
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
      <Tabs defaultValue="setup" className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="setup">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.setup_configuration',
              'Setup Configuration'
            )}
          </TabsTrigger>
          <TabsTrigger value="usage">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.usage_and_schedules',
              'Usage & Schedules'
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <DayTypeSetup
            dayTypeVersionId={
              currentDayTypeVersion?.id && currentDayTypeVersion.id !== '' ? currentDayTypeVersion.id : null
            }
            accessToken={accessToken}
            prefixDataTestId={prefixDataTestId}
            fieldTypeOptions={fieldTypeOptions}
          />
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.usage_and_schedules',
                  'Usage & Schedules'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-center gba:py-12">
                <p className="gba:text-muted-foreground">Usage & Schedules content will be implemented here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ConfigureDayType
