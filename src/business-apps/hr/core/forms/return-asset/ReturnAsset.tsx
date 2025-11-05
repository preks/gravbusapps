/**
 * ReturnAsset Form
 * Form for returning an asset to stock
 */

import React, { useState } from 'react'
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
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getAssetById, getCurrentAllocation, deallocateAsset } from '../../apps/assets/data/mockData'

const formSchema = z.object({
  endDate: z.string().min(1, 'Return date is required'),
  conditionEnd: z.string().optional(),
  notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

const conditionOptions = [
  'Excellent - Like new',
  'Good - Well maintained',
  'Fair - Shows signs of use',
  'Poor - Requires repair',
  'Damaged - Needs replacement'
]

export const ReturnAsset: React.FC<BusinessAppContextProps> = props => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Get assetId from context (passed from AppActionButton)
  const assetId = props.additionalData?.assetId as string
  const asset = assetId ? getAssetById(assetId) : null
  const currentAllocation = assetId ? getCurrentAllocation(assetId) : null

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      endDate: new Date().toISOString().split('T')[0],
      conditionEnd: 'Good - Well maintained',
      notes: ''
    }
  })

  const onSubmit = async (values: FormValues) => {
    if (!assetId || !currentAllocation) {
      console.error('No asset ID or allocation found')
      return
    }

    setIsSubmitting(true)
    try {
      // Deallocate asset
      deallocateAsset(currentAllocation.id, values.endDate, values.conditionEnd)

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
      console.error('Error returning asset:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!asset) {
    return (
      <div className="gba:p-6" data-testid="return-asset-error">
        <Card>
          <CardContent className="gba:p-6">
            <p className="gba:text-destructive">Asset not found. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentAllocation) {
    return (
      <div className="gba:p-6" data-testid="return-asset-not-allocated">
        <Card>
          <CardContent className="gba:p-6">
            <Alert variant="warning">
              <AlertDescription>This asset is not currently allocated to any employee.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="gba:p-6" data-testid="return-asset-success">
        <Card>
          <CardContent className="gba:p-6">
            <p className="gba:text-success">Asset returned to stock successfully!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:p-6" data-testid="return-asset-form">
      <Card>
        <CardHeader>
          <CardTitle>Return Asset to Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:mb-4 gba:space-y-2">
            <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
              <p className="gba:text-sm gba:font-medium">
                Asset: {asset.producer} {asset.model}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground">Serial: {asset.serialNumber}</p>
            </div>
            <div className="gba:p-4 gba:bg-info-secondary gba:rounded-lg">
              <p className="gba:text-sm gba:font-medium">Currently allocated to:</p>
              <p className="gba:text-sm">{currentAllocation.employeeName}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                Since: {new Date(currentAllocation.startDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="end-date-input" />
                    </FormControl>
                    <FormDescription>Date when the asset was returned</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conditionEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition at Return</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="condition-end-select">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conditionOptions.map(condition => (
                          <SelectItem key={condition} value={condition} data-testid={`condition-option-${condition}`}>
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Document the asset's condition upon return</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any damage, missing accessories, or other observations..."
                        className="gba:min-h-[80px]"
                        {...field}
                        data-testid="notes-textarea"
                      />
                    </FormControl>
                    <FormDescription>Optional: Document any issues or observations</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:flex gba:gap-2 gba:pt-4">
                <Button type="submit" disabled={isSubmitting} data-testid="return-submit-button">
                  {isSubmitting ? 'Processing...' : 'Return Asset to Stock'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.close()}
                  data-testid="return-cancel-button"
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

export default ReturnAsset
