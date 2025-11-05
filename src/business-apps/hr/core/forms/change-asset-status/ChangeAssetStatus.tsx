/**
 * ChangeAssetStatus Form
 * Form for changing asset status (Under Repair/Retire)
 */

import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AssetStatus } from '../../apps/assets/types'
import { AssetProcessClient } from '../../apps/assets/services/AssetProcessClient'
import { useAssetService } from '../../apps/assets/services/useAssetService'

const formSchema = z.object({
  status: z.enum([AssetStatus.UNDER_REPAIR, AssetStatus.RETIRED]),
  notes: z.string().min(10, 'Please provide details (minimum 10 characters)'),
  effectiveDate: z.string().min(1, 'Effective date is required')
})

type FormValues = z.infer<typeof formSchema>

export const ChangeAssetStatus: React.FC<BusinessAppContextProps> = props => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [asset, setAsset] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get assetId from context (passed from AppActionButton)
  const assetId = props.additionalData?.assetId as string

  // Initialize services
  const { getAsset } = useAssetService(props)
  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(props.accessToken)
    return client
  }, [props.accessToken])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: AssetStatus.RETIRED,
      notes: '',
      effectiveDate: new Date().toISOString().split('T')[0]
    }
  })

  const selectedStatus = form.watch('status')

  // Load asset data
  useEffect(() => {
    const loadAsset = async () => {
      if (!assetId) {
        setError('No asset ID provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const assetData = await getAsset(assetId)
        setAsset(assetData)
      } catch (err) {
        console.error('Error loading asset:', err)
        setError('Failed to load asset data')
      } finally {
        setIsLoading(false)
      }
    }

    loadAsset()
  }, [assetId, getAsset])

  const onSubmit = async (values: FormValues) => {
    if (!assetId || !asset) {
      console.error('No asset ID or asset data')
      return
    }

    setIsSubmitting(true)
    try {
      // Update asset status via Process API
      await assetProcessClient.updateAsset({
        id: assetId,
        version: asset.version,
        assetStatus: values.status,
        notes: values.notes
      })

      setSubmitSuccess(true)

      // Dispatch process completion event to refresh data
      window.dispatchEvent(
        new CustomEvent('com.newwork.process.processCompletion', {
          detail: { resolution: 'success' }
        })
      )

      // Close form after a short delay
      setTimeout(() => {
        window.close()
      }, 1500)
    } catch (error) {
      console.error('Error updating asset status:', error)
      setError('Failed to update asset status')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:flex gba:justify-center gba:items-center" data-testid="change-status-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="gba:p-6" data-testid="change-status-error">
        <Card>
          <CardContent className="gba:p-6">
            <p className="gba:text-destructive">{error || 'Asset not found. Please try again.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="gba:p-6" data-testid="change-status-success">
        <Card>
          <CardContent className="gba:p-6">
            <p className="gba:text-success">Asset status updated successfully!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:p-6" data-testid="change-asset-status-form">
      <Card>
        <CardHeader>
          <CardTitle>Change Asset Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
            <p className="gba:text-sm gba:font-medium">
              Asset: {asset.assetBrand?.value} {asset.model}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground">Serial: {asset.serialNumber}</p>
            <p className="gba:text-xs gba:text-muted-foreground">Current Status: {asset.assetStatus}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="status-select">
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AssetStatus.UNDER_REPAIR} data-testid="status-under-repair">
                          Under Repair
                        </SelectItem>
                        <SelectItem value={AssetStatus.RETIRED} data-testid="status-retired">
                          Retired
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {selectedStatus === AssetStatus.UNDER_REPAIR
                        ? 'Asset will be marked as under maintenance/repair'
                        : 'Asset will be permanently retired from service'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="effective-date-input" />
                    </FormControl>
                    <FormDescription>Date when this status change takes effect</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details/Reason *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          selectedStatus === AssetStatus.UNDER_REPAIR
                            ? 'Describe the issue requiring repair...'
                            : 'Reason for retirement...'
                        }
                        className="gba:min-h-[100px]"
                        {...field}
                        data-testid="notes-textarea"
                      />
                    </FormControl>
                    <FormDescription>Provide detailed information about this status change</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:flex gba:gap-2 gba:pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant={selectedStatus === AssetStatus.RETIRED ? 'destructive' : 'default'}
                  data-testid="status-submit-button"
                >
                  {isSubmitting
                    ? 'Updating...'
                    : `Mark as ${selectedStatus === AssetStatus.UNDER_REPAIR ? 'Under Repair' : 'Retired'}`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.close()}
                  data-testid="status-cancel-button"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChangeAssetStatus
