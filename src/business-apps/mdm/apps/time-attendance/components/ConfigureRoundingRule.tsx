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
import { TransformedRoundingRuleVersion } from '../types/rounding-rule-versions'
import RoundingRuleSetup from './RoundingRuleSetup'

export interface ConfigureRoundingRuleProps {
  roundingRuleVersion: TransformedRoundingRuleVersion | null
  onBack: () => void
  prefixDataTestId?: string
  roundingRules?: Array<{ id: string; code: string; name: string; version: number }>
  roundingRuleVersions?: TransformedRoundingRuleVersion[]
  accessToken: string
  refetch: () => void
}

// Validation schema
const roundingRuleConfigSchema = z
  .object({
    roundingRule: z.string().min(1, 'Rounding Rule is required'),
    validFrom: z.string().min(1, 'Valid From is required'),
    validTo: z.string().min(1, 'Valid To is required'),
    activeVersion: z.string().min(1, 'Version is required')
  })
  .refine(
    data => {
      if (!data.validFrom || !data.validTo) return true
      return new Date(data.validTo) >= new Date(data.validFrom)
    },
    {
      message: 'Valid To date cannot be earlier than Valid From date',
      path: ['validTo']
    }
  )

export type RoundingRuleConfigFormData = z.infer<typeof roundingRuleConfigSchema>

const ConfigureRoundingRule: React.FC<ConfigureRoundingRuleProps> = ({
  roundingRuleVersion,
  onBack,
  prefixDataTestId,
  roundingRules = [],
  roundingRuleVersions = [],
  accessToken,
  refetch
}) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [loading, setLoading] = useState(false)
  const [currentRoundingRuleVersion, setCurrentRoundingRuleVersion] = useState<TransformedRoundingRuleVersion | null>(
    roundingRuleVersion
  )
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

  // Update currentRoundingRuleVersion when roundingRuleVersion prop changes
  useEffect(() => {
    setCurrentRoundingRuleVersion(roundingRuleVersion)
  }, [roundingRuleVersion])

  const form = useForm<RoundingRuleConfigFormData>({
    resolver: zodResolver(roundingRuleConfigSchema),
    defaultValues: {
      roundingRule: currentRoundingRuleVersion?.roundingRule?.id ?? '',
      validFrom: currentRoundingRuleVersion?.activeFrom ? currentRoundingRuleVersion.activeFrom.split('T')[0] : '',
      validTo: currentRoundingRuleVersion?.activeTo ? currentRoundingRuleVersion.activeTo.split('T')[0] : '',
      activeVersion: currentRoundingRuleVersion?.activeVersion ?? ''
    },
    mode: 'onChange'
  })

  // Reset form when currentRoundingRuleVersion changes
  useEffect(() => {
    if (currentRoundingRuleVersion) {
      form.reset({
        roundingRule: currentRoundingRuleVersion?.roundingRule?.id ?? '',
        validFrom: currentRoundingRuleVersion?.activeFrom ? currentRoundingRuleVersion.activeFrom.split('T')[0] : '',
        validTo: currentRoundingRuleVersion?.activeTo ? currentRoundingRuleVersion.activeTo.split('T')[0] : '',
        activeVersion: currentRoundingRuleVersion?.activeVersion ?? ''
      })
    }
  }, [currentRoundingRuleVersion, form])

  // Check if save button should be disabled
  const isSaveDisabled = useMemo(() => {
    // Disable during loading
    if (loading) return true

    // Check if form is valid
    const isValid = form.formState.isValid
    const isDirty = form.formState.isDirty

    const isNewVersion =
      !currentRoundingRuleVersion || !currentRoundingRuleVersion.id || currentRoundingRuleVersion.id === ''

    if (isNewVersion) {
      return !isValid
    }

    // For edit: must have changes (isDirty) and form must be valid
    return !isDirty || !isValid
  }, [loading, form.formState.isValid, form.formState.isDirty, currentRoundingRuleVersion])

  // Find the latest version for a given roundingRule
  const findLatestVersion = useCallback(
    (roundingRuleId: string): TransformedRoundingRuleVersion | null => {
      if (!roundingRuleId) return null

      // Filter versions for this roundingRule
      const versionsForRoundingRule = roundingRuleVersions.filter(
        version => version.roundingRule?.id === roundingRuleId && version.id !== currentRoundingRuleVersion?.id
      )

      if (versionsForRoundingRule.length === 0) return null

      // Sort by activeTo descending (most recent first) or by activeFrom if activeTo is null
      const sortedVersions = [...versionsForRoundingRule].sort((a, b) => {
        const dateA = a.activeTo ? new Date(a.activeTo).getTime() : new Date(a.activeFrom || '').getTime()
        const dateB = b.activeTo ? new Date(b.activeTo).getTime() : new Date(b.activeFrom || '').getTime()
        return dateB - dateA // Descending order
      })

      return sortedVersions[0] || null
    },
    [roundingRuleVersions, currentRoundingRuleVersion]
  )

  // Check for date overlap when creating a new version
  useEffect(() => {
    const isNewVersion =
      !currentRoundingRuleVersion || !currentRoundingRuleVersion.id || currentRoundingRuleVersion.id === ''
    if (!isNewVersion) {
      setOverlapWarning(null)
      return
    }

    const roundingRuleId = form.watch('roundingRule')
    const validFrom = form.watch('validFrom')

    if (!roundingRuleId || !validFrom) {
      setOverlapWarning(null)
      return
    }

    const latestVersion = findLatestVersion(roundingRuleId)
    if (!latestVersion || !latestVersion.activeTo) {
      setOverlapWarning(null)
      return
    }

    const newValidFrom = new Date(validFrom)
    const latestValidTo = new Date(latestVersion.activeTo)

    // Check if new validFrom is before or equal to latest validTo (overlap)
    if (newValidFrom <= latestValidTo) {
      // Calculate suggested start date (one day after latest validTo)
      const suggestedDate = new Date(latestValidTo)
      suggestedDate.setDate(suggestedDate.getDate() + 1)
      const suggestedDateStr = suggestedDate.toISOString().split('T')[0]

      setOverlapWarning(
        `A version already exists for this period. The existing version ends on ${latestValidTo.toLocaleDateString()}. ` +
          `Please either modify the existing version or create the new version starting from ${suggestedDateStr}.`
      )
    } else {
      setOverlapWarning(null)
    }
  }, [form.watch('roundingRule'), form.watch('validFrom'), currentRoundingRuleVersion, findLatestVersion])

  // Helper function to convert date string (YYYY-MM-DD) to ISO 8601 Instant format
  const convertDateToInstant = (dateString: string): string => {
    if (!dateString) return ''
    // If it's already in ISO format, return as is
    if (dateString.includes('T')) return dateString
    // Convert "YYYY-MM-DD" to "YYYY-MM-DDTHH:mm:ss.000Z"
    return `${dateString}T00:00:00.000Z`
  }

  const handleSaveChanges = async (data: RoundingRuleConfigFormData) => {
    try {
      setLoading(true)

      // Check if this is an update (has valid id) or create (no id or empty id)
      const isUpdate = currentRoundingRuleVersion?.id && currentRoundingRuleVersion.id !== ''

      const payload = {
        changeMode: 'INSERT',
        roundingRuleVersion: {
          ...(isUpdate ? { id: currentRoundingRuleVersion.id, version: currentRoundingRuleVersion.version } : {}),
          roundingRule: data.roundingRule,
          activeVersion: data.activeVersion,
          activeFrom: convertDateToInstant(data.validFrom),
          activeTo: convertDateToInstant(data.validTo)
        }
      }

      const response = await restClient.post(
        `/employee-time/${isUpdate ? 'updateRoundingRuleVersion' : 'createRoundingRuleVersion'}`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      const newRoundingRuleVersion = response?.roundingRuleVersion

      refetch()

      if (!isUpdate && newRoundingRuleVersion?.id) {
        setCurrentRoundingRuleVersion({
          id: newRoundingRuleVersion.id,
          version: newRoundingRuleVersion.version || 0,
          activeFrom: newRoundingRuleVersion.activeFrom || null,
          activeTo: newRoundingRuleVersion.activeTo || null,
          activeVersion: newRoundingRuleVersion.activeVersion || null,
          roundingRule: currentRoundingRuleVersion?.roundingRule || newRoundingRuleVersion.roundingRule || null
        } as TransformedRoundingRuleVersion)
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
    <div data-testid={`${prefixDataTestId || ''}-ConfigureRoundingRule`} className="gba:space-y-6 gba:mt-4">
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
              {currentRoundingRuleVersion?.id && currentRoundingRuleVersion.id !== ''
                ? `Rounding Rule Configuration: ${currentRoundingRuleVersion.roundingRule?.code || currentRoundingRuleVersion.id} - ${currentRoundingRuleVersion.roundingRule?.name || ''}`
                : 'Create Rounding Rule Version Configuration'}
            </h1>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {currentRoundingRuleVersion?.id && currentRoundingRuleVersion.id !== ''
                ? 'Edit rounding rule version configuration'
                : 'Create new rounding rule version configuration'}
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
            Save Rules
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

      {/* Rounding Rule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Rounding Rule Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="gba:space-y-6">
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-4 gba:gap-4">
                <FormField
                  control={form.control}
                  name="roundingRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rounding Rule</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!currentRoundingRuleVersion?.roundingRule}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select rounding rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roundingRules.map(roundingRuleItem => (
                            <SelectItem key={roundingRuleItem.id} value={roundingRuleItem.id}>
                              {roundingRuleItem.code} - {roundingRuleItem.name}
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="setup" className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <RoundingRuleSetup
            roundingRuleVersionId={
              currentRoundingRuleVersion?.id && currentRoundingRuleVersion.id !== ''
                ? currentRoundingRuleVersion.id
                : null
            }
            accessToken={accessToken}
            prefixDataTestId={prefixDataTestId}
          />
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-center gba:py-12">
                <p className="gba:text-muted-foreground">Usage content will be implemented here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ConfigureRoundingRule
