import React, { useCallback, useState } from 'react'
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
  SelectValue
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Form validation schema
const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  department: z.string().min(1, 'Please select a department'),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  description: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

export interface FormExampleProps extends BusinessAppContextProps {
  onSuccess?: (data: FormData) => void
  onCancel?: () => void
  initialData?: Partial<FormData>
  'data-testid'?: string
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  jobTitle: '',
  description: ''
}

const FormExample: React.FC<FormExampleProps> = ({
  userInfo,
  onSuccess,
  onCancel,
  initialData,
  'data-testid': dataTestId = 'form-example'
}) => {
  const [formData] = useState<FormData>({ ...initialFormData, ...initialData })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: formData,
    mode: 'onChange'
  })

  const handleSubmit = useCallback(
    async (data: FormData) => {
      // Simulate form submission
      console.log('Form submitted with data:', data)

      // Return the form data as the result
      return {
        type: 'FormExample',
        ...data,
        submittedAt: new Date().toISOString(),
        submittedBy: userInfo?.id || 'unknown'
      }
    },
    [userInfo]
  )

  const handleSuccess = useCallback(
    (result: any) => {
      console.log('Form submission successful:', result)
      onSuccess?.(result)
    },
    [onSuccess]
  )

  return (
    <AppActionForm
      processType="create"
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common:button.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid={dataTestId}
    >
      <div className="gba:space-y-4" data-testid={`${dataTestId}-form-content`}>
        {/* Personal Information Section */}
        <div className="gba:space-y-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('form:personalInfo', 'Personal Information')}
          </h3>

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('form:firstName', 'First Name')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your first name"
                      data-testid={`${dataTestId}-first-name-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('form:lastName', 'Last Name')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your last name"
                      data-testid={`${dataTestId}-last-name-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('form:email', 'Email Address')} *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      data-testid={`${dataTestId}-email-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('form:phone', 'Phone Number')} *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter your phone number"
                      data-testid={`${dataTestId}-phone-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Professional Information Section */}
        <div className="gba:space-y-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('form:professionalInfo', 'Professional Information')}
          </h3>

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('form:department', 'Department')} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    data-testid={`${dataTestId}-department-select`}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('form:jobTitle', 'Job Title')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your job title"
                      data-testid={`${dataTestId}-job-title-input`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{getTranslationFromI18nKeyAndLabel('form:description', 'Description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter a brief description (optional)"
                    data-testid={`${dataTestId}-description-textarea`}
                    className="gba:min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </AppActionForm>
  )
}

export default FormExample
