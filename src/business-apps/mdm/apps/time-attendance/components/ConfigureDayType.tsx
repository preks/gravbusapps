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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
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

export interface ConfigureDayTypeProps {
  dayTypeVersion: TransformedDayTypeVersion | null
  onBack: () => void
  prefixDataTestId?: string
  dayTypes?: Array<{ id: string; code: string; name: string; version: number }>
  incrementTypes?: Array<{ id: string; code: string; name: string; version: number }>
  breakTypes?: Array<{ id: string; code: string; name: string; version: number }>
  roundingRules?: Array<{ id: string; code: string; name: string; version: number }>
  accessToken: string
  refetch: () => void
  fieldTypeOptions: FieldTypeOption[]
}

// Validation schema
const dayTypeConfigSchema = z.object({
  dayType: z.string().min(1, 'Day Type is required'),
  breakRule: z.string().min(1, 'Break Rule is required'),
  incrementType: z.string().min(1, 'Premium Pay Rule is required'),
  roundingRule: z.string().min(1, 'Rounding Rule is required'),
  color: z.string().min(1, 'Color is required'),
  validFrom: z.string().min(1, 'Valid From is required'),
  validTo: z.string().min(1, 'Valid To is required'),
  activeVersion: z.string().min(1, 'Version is required')
})

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
      color: currentDayTypeVersion?.color ?? ''
    },
    mode: 'onChange'
  })

  // Check if save button should be disabled
  const isSaveDisabled = useMemo(() => {
    // Disable during loading
    if (loading) return true

    // Check if form is valid
    const isValid = form.formState.isValid
    const isDirty = form.formState.isDirty

    const isNewVersion = !currentDayTypeVersion || !currentDayTypeVersion.id || currentDayTypeVersion.id === ''

    if (isNewVersion) {
      return !isValid
    }

    // For edit: must have changes (isDirty) and form must be valid
    return !isDirty || !isValid
  }, [loading, form.formState.isValid, form.formState.isDirty, currentDayTypeVersion])

  // Helper function to convert date string (YYYY-MM-DD) to ISO 8601 Instant format
  const convertDateToInstant = (dateString: string): string => {
    if (!dateString) return ''
    // If it's already in ISO format, return as is
    if (dateString.includes('T')) return dateString
    // Convert "YYYY-MM-DD" to "YYYY-MM-DDTHH:mm:ss.000Z"
    return `${dateString}T00:00:00.000Z`
  }

  const handleSaveChanges = async (data: DayTypeConfigFormData) => {
    try {
      setLoading(true)

      // Check if this is an update (has valid id) or create (no id or empty id)
      const isUpdate = currentDayTypeVersion?.id && currentDayTypeVersion.id !== ''

      const payload = {
        changeMode: 'INSERT',
        dayTypeVersion: {
          ...(isUpdate ? { id: currentDayTypeVersion.id, version: currentDayTypeVersion.version } : {}),
          dayType: data.dayType,
          breakType: data.breakRule,
          incrementType: data.incrementType,
          roundingRule: data.roundingRule,
          color: data.color,
          activeVersion: data.activeVersion,
          activeFrom: convertDateToInstant(data.validFrom),
          activeTo: convertDateToInstant(data.validTo)
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
            Back to Overview
          </Button>
          <div>
            <h1 className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
              {currentDayTypeVersion?.id && currentDayTypeVersion.id !== ''
                ? `Configure Day Type Version: ${currentDayTypeVersion.dayType?.code || currentDayTypeVersion.id}`
                : 'Create Day Type Version Configuration'}
            </h1>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {currentDayTypeVersion?.id && currentDayTypeVersion.id !== ''
                ? 'Edit day type version configuration'
                : 'Create new day type version configuration'}
            </p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <XIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(handleSaveChanges)} disabled={isSaveDisabled}>
            <FloppyDiskIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Day Type Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Day Type Configuration</CardTitle>
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
                      <FormLabel>Day Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!currentDayTypeVersion?.dayType}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select day type" />
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
                  name="validFrom"
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
                  control={form.control}
                  name="validTo"
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
                  control={form.control}
                  name="activeVersion"
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
                  name="breakRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Rule</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select break rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {breakTypes.map(rule => (
                            <SelectItem key={rule.id} value={rule.id}>
                              {rule.code} - {rule.name}
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
                  name="incrementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Premium Pay Rule</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select premium pay rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {incrementTypes.map(rule => (
                            <SelectItem key={rule.id} value={rule.id}>
                              {rule.code} - {rule.name}
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
                  name="roundingRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rounding Rule</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select rounding rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roundingRules.map(rule => (
                            <SelectItem key={rule.id} value={rule.id}>
                              {rule.code} - {rule.name}
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
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
          <TabsTrigger value="setup">Setup Configuration</TabsTrigger>
          <TabsTrigger value="usage">Usage & Schedules</TabsTrigger>
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

export default ConfigureDayType
