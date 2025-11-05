/**
 * AllocateAsset Form
 * Form for allocating an asset to an employee
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
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getAssetById, allocateAsset } from '../../apps/assets/data/mockData'
import { v4 as uuidv4 } from 'uuid'

const formSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  employeeName: z.string().min(1, 'Employee name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional(),
  conditionStart: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

// Mock employees - in real implementation, fetch from API
const mockEmployees = [
  { id: 'emp-001', name: 'John Doe', department: 'Engineering' },
  { id: 'emp-002', name: 'Jane Smith', department: 'Marketing' },
  { id: 'emp-003', name: 'Mike Johnson', department: 'Sales' },
  { id: 'emp-004', name: 'Sarah Williams', department: 'HR' },
  { id: 'emp-005', name: 'David Brown', department: 'Finance' }
]

const conditionOptions = [
  'Excellent - Brand new device',
  'Good - Previous user maintained well',
  'Fair - Shows signs of use',
  'Poor - Requires attention'
]

export const AllocateAsset: React.FC<BusinessAppContextProps> = props => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Get assetId from context (passed from AppActionButton)
  const assetId = props.additionalData?.assetId as string
  const asset = assetId ? getAssetById(assetId) : null

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: '',
      employeeName: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      conditionStart: 'Good - Previous user maintained well'
    }
  })

  const onSubmit = async (values: FormValues) => {
    if (!assetId) {
      console.error('No asset ID provided')
      return
    }

    setIsSubmitting(true)
    try {
      // Create allocation
      const allocation = {
        id: uuidv4(),
        assetId: assetId,
        employeeId: values.employeeId,
        employeeName: values.employeeName,
        startDate: values.startDate,
        expectedEndDate: values.expectedEndDate,
        conditionStart: values.conditionStart
      }

      allocateAsset(allocation)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmployeeChange = (employeeId: string) => {
    const employee = mockEmployees.find(e => e.id === employeeId)
    if (employee) {
      form.setValue('employeeId', employee.id)
      form.setValue('employeeName', employee.name)
    }
  }

  if (!asset) {
    return (
      <div className="gba:p-6" data-testid="allocate-asset-error">
        <Card>
          <CardContent className="gba:p-6">
            <p className="gba:text-destructive">Asset not found. Please try again.</p>
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

  return (
    <div className="gba:p-6" data-testid="allocate-asset-form">
      <Card>
        <CardHeader>
          <CardTitle>Allocate Asset to Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
            <p className="gba:text-sm gba:font-medium">
              Asset: {asset.producer} {asset.model}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground">Serial: {asset.serialNumber}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee *</FormLabel>
                    <Select onValueChange={handleEmployeeChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="employee-select">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockEmployees.map(employee => (
                          <SelectItem
                            key={employee.id}
                            value={employee.id}
                            data-testid={`employee-option-${employee.id}`}
                          >
                            {employee.name} - {employee.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select the employee who will receive this asset</FormDescription>
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
                name="conditionStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition at Handover</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="condition-select">
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
                    <FormDescription>Document the asset's condition</FormDescription>
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
