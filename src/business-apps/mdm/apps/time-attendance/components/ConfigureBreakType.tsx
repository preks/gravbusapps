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
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedBreakTypeVersion } from '../types/break-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useVersionOverlapCheck } from '../hooks/useVersionOverlapCheck'
import BreakTypeDetails from './BreakTypeDetails'

export interface ConfigureBreakTypeProps {
  breakTypeVersion: TransformedBreakTypeVersion | null
  onBack: () => void
  prefixDataTestId?: string
  breakTypes?: Array<{ id: string; code: string; name: string; version: number }>
  breakTypeVersions?: TransformedBreakTypeVersion[]
  accessToken: string
  refetch: () => void
}

// Validation schema
const breakTypeConfigSchema = z
  .object({
    breakType: z.string().min(1, 'Break Type is required'),
    validFrom: z.string().min(1, 'Valid From is required'),
    validTo: z.string().optional(),
    activeVersion: z.string().min(1, 'Version is required'),
    minBreakTime: z.string().optional(),
    maxBreakTime: z.string().optional(),
    minWorkTime: z.string().optional(),
    minRemainderTime: z.string().optional()
  })
  .refine(
    data => {
      if (!data.validFrom || !data.validTo) return true
      return new Date(data.validTo) >= new Date(data.validFrom)
    },
    {
      message: getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.break_types.version.valid_to_date_cannot_be_earlier_than_valid_from_date',
        'Valid To date cannot be earlier than Valid From date'
      ),
      path: ['validTo']
    }
  )

export type BreakTypeConfigFormData = z.infer<typeof breakTypeConfigSchema>

const ConfigureBreakType: React.FC<ConfigureBreakTypeProps> = ({
  breakTypeVersion,
  onBack,
  prefixDataTestId,
  breakTypes = [],
  breakTypeVersions = [],
  accessToken,
  refetch
}) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [loading, setLoading] = useState(false)
  const [currentBreakTypeVersion, setCurrentBreakTypeVersion] = useState<TransformedBreakTypeVersion | null>(
    breakTypeVersion
  )

  // Update currentBreakTypeVersion when breakTypeVersion prop changes
  useEffect(() => {
    setCurrentBreakTypeVersion(breakTypeVersion)
  }, [breakTypeVersion])

  const form = useForm<BreakTypeConfigFormData>({
    resolver: zodResolver(breakTypeConfigSchema),
    defaultValues: {
      breakType: currentBreakTypeVersion?.breakType?.id ?? '',
      validFrom: currentBreakTypeVersion?.activeFrom ? currentBreakTypeVersion.activeFrom.split('T')[0] : '',
      validTo: currentBreakTypeVersion?.activeTo ? currentBreakTypeVersion.activeTo.split('T')[0] : '',
      activeVersion: currentBreakTypeVersion?.activeVersion ?? '',
      minBreakTime: currentBreakTypeVersion?.minBreakTime ?? '',
      maxBreakTime: currentBreakTypeVersion?.maxBreakTime ?? '',
      minWorkTime: currentBreakTypeVersion?.minWorkTime ?? '',
      minRemainderTime: currentBreakTypeVersion?.minRemainderTime ?? ''
    },
    mode: 'onChange'
  })

  // Reset form when currentBreakTypeVersion changes
  useEffect(() => {
    if (currentBreakTypeVersion) {
      form.reset({
        breakType: currentBreakTypeVersion?.breakType?.id ?? '',
        validFrom: currentBreakTypeVersion?.activeFrom ? currentBreakTypeVersion.activeFrom.split('T')[0] : '',
        validTo: currentBreakTypeVersion?.activeTo ? currentBreakTypeVersion.activeTo.split('T')[0] : '',
        activeVersion: currentBreakTypeVersion?.activeVersion ?? '',
        minBreakTime: currentBreakTypeVersion?.minBreakTime ?? '',
        maxBreakTime: currentBreakTypeVersion?.maxBreakTime ?? '',
        minWorkTime: currentBreakTypeVersion?.minWorkTime ?? '',
        minRemainderTime: currentBreakTypeVersion?.minRemainderTime ?? ''
      })
    }
  }, [currentBreakTypeVersion, form])

  // Check for date overlap when creating a new version
  const { overlapWarning } = useVersionOverlapCheck({
    currentVersion: currentBreakTypeVersion,
    allVersions: breakTypeVersions,
    watch: form.watch,
    entityIdFieldName: 'breakType',
    activeFromFieldName: 'validFrom',
    activeToFieldName: 'validTo',
    getEntityIdFromVersion: version => version.breakType?.id || null
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

    const isNewVersion = !currentBreakTypeVersion?.id

    if (isNewVersion) {
      return !isValid
    }

    // For edit: must have changes (isDirty) and form must be valid
    return !isDirty || !isValid
  }, [loading, overlapWarning, form.formState.isValid, form.formState.isDirty, currentBreakTypeVersion])

  // Helper function to convert date string (YYYY-MM-DD) to ISO 8601 Instant format
  const convertDateToInstant = (dateString: string | undefined): string => {
    if (!dateString) return ''
    // If it's already in ISO format, return as is
    if (dateString.includes('T')) return dateString
    // Convert "YYYY-MM-DD" to "YYYY-MM-DDTHH:mm:ss.000Z"
    return `${dateString}T00:00:00.000Z`
  }

  const handleSaveChanges = async (data: BreakTypeConfigFormData) => {
    try {
      // Prevent save if there are overlap warnings
      if (overlapWarning) {
        console.warn('Cannot save: Date overlap detected', overlapWarning)
        return
      }

      setLoading(true)

      // Check if this is an update (has valid id) or create (no id or empty id)
      const isUpdate = currentBreakTypeVersion?.id && currentBreakTypeVersion.id !== ''

      const payload = {
        changeMode: 'INSERT',
        breakTypeVersion: {
          ...(isUpdate ? { id: currentBreakTypeVersion.id, version: currentBreakTypeVersion.version } : {}),
          breakType: data.breakType,
          activeVersion: data.activeVersion,
          activeFrom: convertDateToInstant(data.validFrom),
          activeTo: convertDateToInstant(data.validTo),
          minBreakTime: data.minBreakTime || null,
          maxBreakTime: data.maxBreakTime || null,
          minWorkTime: data.minWorkTime || null,
          minRemainderTime: data.minRemainderTime || null
        }
      }

      const response = await restClient.post(
        `/employee-time/${isUpdate ? 'updateBreakTypeVersion' : 'createBreakTypeVersion'}`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      const newBreakTypeVersion = response?.breakTypeVersion

      refetch()

      if (!isUpdate && newBreakTypeVersion?.id) {
        setCurrentBreakTypeVersion({
          id: newBreakTypeVersion.id,
          version: newBreakTypeVersion.version || 0,
          activeFrom: newBreakTypeVersion.activeFrom || null,
          activeTo: newBreakTypeVersion.activeTo || null,
          activeVersion: newBreakTypeVersion.activeVersion || null,
          status: 'inactive',
          breaks: 0,
          minBreakTime: newBreakTypeVersion.minBreakTime || null,
          maxBreakTime: newBreakTypeVersion.maxBreakTime || null,
          minWorkTime: newBreakTypeVersion.minWorkTime || null,
          minRemainderTime: newBreakTypeVersion.minRemainderTime || null,
          breakType: currentBreakTypeVersion?.breakType || newBreakTypeVersion.breakType || null
        } as TransformedBreakTypeVersion)
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
    <div data-testid={`${prefixDataTestId || ''}-ConfigureBreakType`} className="gba:space-y-6 gba:mt-4">
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
            Back to Overview
          </Button>
          <div>
            <h1 className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
              {currentBreakTypeVersion?.id && currentBreakTypeVersion.id !== ''
                ? `Edit Break Type Version`
                : 'Create Break Type Version '}
            </h1>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(handleSaveChanges)} disabled={isSaveDisabled}>
            {currentBreakTypeVersion?.id && currentBreakTypeVersion.id !== '' ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>

      {/* Overlap Warning */}
      {overlapWarning && (
        <Alert variant="destructive" data-testid={`${prefixDataTestId || ''}-overlap-warning`}>
          <AlertTitle>Date Overlap Detected</AlertTitle>
          <AlertDescription>{overlapWarning}</AlertDescription>
        </Alert>
      )}

      {/* Break Type Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Break Type Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form} schema={breakTypeConfigSchema}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="gba:space-y-6">
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-4 gba:gap-4">
                <FormField
                  control={form.control}
                  name="breakType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!currentBreakTypeVersion?.breakType}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select break type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {breakTypes.map(breakTypeItem => (
                            <SelectItem key={breakTypeItem.id} value={breakTypeItem.id}>
                              {breakTypeItem.code} - {breakTypeItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="validFrom"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid From</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-valid-from-input`}
                          type="date"
                          placeholder="Valid From"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="validTo"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid To</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-valid-to-input`}
                          type="date"
                          placeholder="Valid To"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="activeVersion"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-version-input`}
                          placeholder="Version"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minBreakTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Break Length</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-min-break-time-input`}
                          type="time"
                          placeholder="00:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxBreakTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max. Break Length</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-max-break-time-input`}
                          type="time"
                          placeholder="00:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minWorkTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Work Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-min-work-time-input`}
                          type="time"
                          placeholder="00:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minRemainderTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Remainder</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid={`${prefixDataTestId || ''}-min-remainder-time-input`}
                          type="time"
                          placeholder="00:00"
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
          <TabsTrigger value="details">Break Details</TabsTrigger>
          <TabsTrigger value="usage">Usage & Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <BreakTypeDetails
            breakTypeVersionId={
              currentBreakTypeVersion?.id && currentBreakTypeVersion.id !== '' ? currentBreakTypeVersion.id : null
            }
            accessToken={accessToken}
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage & Schedules</CardTitle>
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

export default ConfigureBreakType
