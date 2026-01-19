// Example Action Form - demonstrates AppActionForm usage with form validation

import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Form validation schema with Zod
const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  department: z.string().min(1, 'Please select a department'),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  startDate: z.string().min(1, 'Please select a start date'),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  // Example of number validation
  salary: z.preprocess(
    val => {
      if (val === null || val === undefined || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number({ message: 'Salary must be a valid number' }).min(0, 'Salary must be positive').optional()
  )
})

type FormData = z.infer<typeof formSchema>

export interface AppActionFormExampleProps extends BusinessAppContextProps {
  onSuccess?: (data: FormData) => void
  initialData?: Partial<FormData>
  'data-testid'?: string
}

const AppActionFormExample: React.FC<AppActionFormExampleProps> = ({
  structureId,
  userInfo,
  onSuccess,
  initialData,
  'data-testid': dataTestId = 'action-form-example'
}) => {
  // Initialize form with Zod resolver
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      department: initialData?.department || '',
      jobTitle: initialData?.jobTitle || '',
      startDate: initialData?.startDate || '',
      isActive: initialData?.isActive ?? true,
      description: initialData?.description || '',
      salary: initialData?.salary || undefined
    }
  })

  // Transform and validate form data before submission
  const handleSubmit = useCallback(
    async (data: FormData) => {
      try {
        // Simulate API call or data processing
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Transform data for process payload
        const processPayload = {
          employeeData: {
            personalInfo: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone
            },
            workInfo: {
              department: data.department,
              jobTitle: data.jobTitle,
              startDate: data.startDate,
              isActive: data.isActive,
              salary: data.salary
            },
            additionalInfo: {
              description: data.description || null
            }
          },
          metadata: {
            createdBy: userInfo?.employeeId,
            structureId: structureId,
            timestamp: new Date().toISOString()
          }
        }

        return processPayload
      } catch {
        throw new Error('Failed to process employee data. Please try again.')
      }
    },
    [userInfo?.employeeId, structureId]
  )

  // Handle successful submission
  const handleSuccess = useCallback(
    (result: any) => {
      console.log('Employee created successfully:', result)
      if (onSuccess) {
        onSuccess(form.getValues())
      }
    },
    [form, onSuccess]
  )

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    form.reset()
  }, [form])

  return (
    <AppActionForm
      processType="create"
      form={form}
      resolver={zodResolver(formSchema)}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      formData={form.watch()}
      submitEventType="pse_submit"
      cancelEventType="pse_pause"
      submitButtonText={getTranslationFromI18nKeyAndLabel('Submit', 'Create Employee')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('Cancel', 'Cancel')}
      showCancelButton={true}
      submitButtonVariant="default"
      data-testid={dataTestId}
    >
      <div className="gba:space-y-6" data-testid={`${dataTestId}-content`}>
        {/* Personal Information Section */}
        <div className="gba:space-y-4" data-testid={`${dataTestId}-personal-section`}>
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900" data-testid={`${dataTestId}-personal-title`}>
            {getTranslationFromI18nKeyAndLabel('PersonalInformation', 'Personal Information')}
          </h3>

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-first-name-label`}>
                    {getTranslationFromI18nKeyAndLabel('FirstName', 'First Name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter first name" data-testid={`${dataTestId}-first-name-input`} />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-first-name-error`} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-last-name-label`}>
                    {getTranslationFromI18nKeyAndLabel('LastName', 'Last Name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter last name" data-testid={`${dataTestId}-last-name-input`} />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-last-name-error`} />
                </FormItem>
              )}
            />
          </div>

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-email-label`}>
                    {getTranslationFromI18nKeyAndLabel('Email', 'Email')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter email address"
                      data-testid={`${dataTestId}-email-input`}
                    />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-email-error`} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-phone-label`}>
                    {getTranslationFromI18nKeyAndLabel('Phone', 'Phone')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Enter phone number"
                      data-testid={`${dataTestId}-phone-input`}
                    />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-phone-error`} />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Work Information Section */}
        <div className="gba:space-y-4" data-testid={`${dataTestId}-work-section`}>
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900" data-testid={`${dataTestId}-work-title`}>
            {getTranslationFromI18nKeyAndLabel('WorkInformation', 'Work Information')}
          </h3>

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-department-label`}>
                    {getTranslationFromI18nKeyAndLabel('Department', 'Department')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`${dataTestId}-department-select`}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent data-testid={`${dataTestId}-department-options`}>
                      <SelectItem value="engineering" data-testid={`${dataTestId}-department-engineering`}>
                        Engineering
                      </SelectItem>
                      <SelectItem value="marketing" data-testid={`${dataTestId}-department-marketing`}>
                        Marketing
                      </SelectItem>
                      <SelectItem value="sales" data-testid={`${dataTestId}-department-sales`}>
                        Sales
                      </SelectItem>
                      <SelectItem value="hr" data-testid={`${dataTestId}-department-hr`}>
                        Human Resources
                      </SelectItem>
                      <SelectItem value="finance" data-testid={`${dataTestId}-department-finance`}>
                        Finance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage data-testid={`${dataTestId}-department-error`} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-job-title-label`}>
                    {getTranslationFromI18nKeyAndLabel('JobTitle', 'Job Title')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter job title" data-testid={`${dataTestId}-job-title-input`} />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-job-title-error`} />
                </FormItem>
              )}
            />
          </div>

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-start-date-label`}>
                    {getTranslationFromI18nKeyAndLabel('StartDate', 'Start Date')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid={`${dataTestId}-start-date-input`} />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-start-date-error`} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`${dataTestId}-salary-label`}>
                    {getTranslationFromI18nKeyAndLabel('Salary', 'Salary (Optional)')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="Enter salary"
                      data-testid={`${dataTestId}-salary-input`}
                    />
                  </FormControl>
                  <FormMessage data-testid={`${dataTestId}-salary-error`} />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:rounded-lg gba:border gba:p-4">
                <div className="gba:space-y-0.5">
                  <FormLabel className="gba:text-base" data-testid={`${dataTestId}-active-label`}>
                    {getTranslationFromI18nKeyAndLabel('IsActive', 'Active Employee')}
                  </FormLabel>
                  <div className="gba:text-sm gba:text-gray-600" data-testid={`${dataTestId}-active-description`}>
                    {getTranslationFromI18nKeyAndLabel(
                      'IsActiveDescription',
                      'Employee can access the system and receive assignments'
                    )}
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid={`${dataTestId}-active-switch`}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Additional Information Section */}
        <div className="gba:space-y-4" data-testid={`${dataTestId}-additional-section`}>
          <h3
            className="gba:text-lg gba:font-semibold gba:text-gray-900"
            data-testid={`${dataTestId}-additional-title`}
          >
            {getTranslationFromI18nKeyAndLabel('AdditionalInformation', 'Additional Information')}
          </h3>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid={`${dataTestId}-description-label`}>
                  {getTranslationFromI18nKeyAndLabel('Description', 'Description (Optional)')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter additional notes or description"
                    rows={4}
                    data-testid={`${dataTestId}-description-input`}
                  />
                </FormControl>
                <FormMessage data-testid={`${dataTestId}-description-error`} />
              </FormItem>
            )}
          />
        </div>
      </div>
    </AppActionForm>
  )
}

export default AppActionFormExample
