/**
 * AllocateAsset Form
 * Form for allocating an asset to an employee
 */

import React, { useState, useEffect } from 'react'
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
import { useAssetService } from '../../apps/assets/services/useAssetService'
import { useEmployeeSearch } from './hooks/useEmployeeSearch'

const formSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional(),
  startAssetConditionRef: z.string().optional(),
  notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

export const AllocateAsset: React.FC<BusinessAppContextProps> = props => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [asset, setAsset] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Get assetId from context (passed from AppActionButton)
  const assetId = props.additionalData?.assetId as string

  // Initialize services
  const { getAsset, allocateAsset } = useAssetService(props)
  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    searchEmployees
  } = useEmployeeSearch(props.accessToken)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      startAssetConditionRef: '',
      notes: ''
    }
  })

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
      // Create allocation
      await allocateAsset({
        assetId: assetId,
        employeeId: values.employeeId,
        startDate: values.startDate,
        expectedEndDate: values.expectedEndDate || undefined,
        startAssetConditionRef: values.startAssetConditionRef || undefined,
        notes: values.notes || undefined
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
      console.error('Error allocating asset:', error)
      setError('Failed to allocate asset')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmployeeSearch = (value: string) => {
    setSearchQuery(value)
    if (value.length >= 2 || value.length === 0) {
      searchEmployees(value)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:flex gba:justify-center gba:items-center" data-testid="allocate-asset-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error && !asset) {
    return (
      <div className="gba:p-6" data-testid="allocate-asset-error">
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
      <div className="gba:p-6" data-testid="allocate-asset-success">
        <Card>
          <CardContent className="gba:p-6">
            <p className="gba:text-success">Asset allocated successfully!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredEmployees = employees.filter(
    emp => !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="gba:p-6" data-testid="allocate-asset-form">
      <Card>
        <CardHeader>
          <CardTitle>Allocate Asset to Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
            <p className="gba:text-sm gba:font-medium">
              Asset: {asset.assetBrand?.value} {asset.model}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground">Serial: {asset.serialNumber}</p>
          </div>

          {error && (
            <div className="gba:mb-4 gba:p-3 gba:bg-destructive/10 gba:text-destructive gba:rounded-md gba:text-sm">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={employeesLoading}>
                      <FormControl>
                        <SelectTrigger data-testid="employee-select">
                          <SelectValue placeholder={employeesLoading ? 'Loading employees...' : 'Select an employee'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="gba:p-2">
                          <Input
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={e => handleEmployeeSearch(e.target.value)}
                            className="gba:mb-2"
                          />
                        </div>
                        {filteredEmployees.length === 0 ? (
                          <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                            {employeesLoading ? 'Loading...' : 'No employees found'}
                          </div>
                        ) : (
                          filteredEmployees.map(employee => (
                            <SelectItem
                              key={employee.id}
                              value={employee.id}
                              data-testid={`employee-option-${employee.id}`}
                            >
                              <div className="gba:flex gba:flex-col">
                                <span className="gba:font-medium">{employee.name}</span>
                                {(employee.jobTitle || employee.department) && (
                                  <span className="gba:text-xs gba:text-muted-foreground">
                                    {[employee.jobTitle, employee.department].filter(Boolean).join(' • ')}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select the employee who will receive this asset</FormDescription>
                    {employeesError && <p className="gba:text-sm gba:text-destructive">{employeesError}</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocation Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="start-date-input" />
                    </FormControl>
                    <FormDescription>When the asset will be handed over</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Return Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="expected-end-date-input" />
                    </FormControl>
                    <FormDescription>Expected date for asset return (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this allocation..."
                        className="gba:min-h-[80px]"
                        {...field}
                        data-testid="notes-textarea"
                      />
                    </FormControl>
                    <FormDescription>Optional notes about the allocation</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:flex gba:gap-2 gba:pt-4">
                <Button type="submit" disabled={isSubmitting} data-testid="allocate-submit-button">
                  {isSubmitting ? 'Allocating...' : 'Allocate Asset'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.close()}
                  data-testid="allocate-cancel-button"
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

export default AllocateAsset
