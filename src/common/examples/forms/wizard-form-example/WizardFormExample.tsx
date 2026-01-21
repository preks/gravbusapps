import React, { useCallback, useState, useMemo } from 'react'
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
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  WizardFormStep,
  type WizardStep
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Form validation schema
const wizardFormSchema = z.object({
  // Step 1: Personal Information
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  dateOfBirth: z.string().min(1, 'Please enter your date of birth'),

  // Step 2: Professional Information
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  department: z.string().min(1, 'Please select a department'),
  startDate: z.string().min(1, 'Please enter your start date'),
  employmentType: z.string().min(1, 'Please select employment type'),
  salary: z.string().min(1, 'Please enter salary'),

  // Step 3: Preferences
  workLocation: z.string().min(1, 'Please select work location'),
  communicationPreferences: z.array(z.string()).min(1, 'Please select at least one communication preference'),
  newsletter: z.boolean().optional(),

  // Step 4: Additional Information
  skills: z.string().optional(),
  previousExperience: z.string().optional(),
  references: z.string().optional(),
  additionalNotes: z.string().optional()
})

type WizardFormData = z.infer<typeof wizardFormSchema>

export interface WizardFormExampleProps extends BusinessAppContextProps {
  onSuccess?: (data: WizardFormData) => void
  onCancel?: () => void
  initialData?: Partial<WizardFormData>
  'data-testid'?: string
}

const initialWizardFormData: WizardFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  jobTitle: '',
  department: '',
  startDate: '',
  employmentType: '',
  salary: '',
  workLocation: '',
  communicationPreferences: [],
  newsletter: false,
  skills: '',
  previousExperience: '',
  references: '',
  additionalNotes: ''
}

const WizardFormExample: React.FC<WizardFormExampleProps> = ({
  userInfo,
  onSuccess,
  onCancel,
  initialData,
  'data-testid': dataTestId = 'wizard-form-example'
}) => {
  const [formData] = useState<WizardFormData>({ ...initialWizardFormData, ...initialData })

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: formData,
    mode: 'onChange'
  })

  const handleSubmit = useCallback(
    async (data: WizardFormData) => {
      // Simulate wizard form submission
      console.log('Wizard form submitted with data:', data)

      // Return the form data as the result
      return {
        type: 'WizardFormExample',
        ...data,
        submittedAt: new Date().toISOString(),
        submittedBy: userInfo?.id || 'unknown'
      }
    },
    [userInfo]
  )

  const handleSuccess = useCallback(
    (result: any) => {
      console.log('Wizard form submission successful:', result)
      onSuccess?.(result)
    },
    [onSuccess]
  )

  // Define wizard steps
  const wizardSteps: WizardStep<WizardFormData>[] = useMemo(
    () => [
      {
        id: 'personal-info',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.personalInfo', 'Personal Information'),
        description: getTranslationFromI18nKeyAndLabel('wizard:step.personalInfo.desc', 'Enter your personal details'),
        fields: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-personal-info`}>
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

              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
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

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getTranslationFromI18nKeyAndLabel('form:dateOfBirth', 'Date of Birth')} *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid={`${dataTestId}-date-of-birth-input`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'professional-info',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.professionalInfo', 'Professional Information'),
        description: getTranslationFromI18nKeyAndLabel(
          'wizard:step.professionalInfo.desc',
          'Enter your professional details'
        ),
        fields: ['jobTitle', 'department', 'startDate', 'employmentType', 'salary'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-professional-info`}>
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getTranslationFromI18nKeyAndLabel('form:startDate', 'Start Date')} *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid={`${dataTestId}-start-date-input`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('form:employmentType', 'Employment Type')} *
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="gba:flex gba:flex-col gba:space-y-1"
                          data-testid={`${dataTestId}-employment-type-radio`}
                        >
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <RadioGroupItem value="fulltime" id="fulltime" />
                            <Label htmlFor="fulltime">Full-time</Label>
                          </div>
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <RadioGroupItem value="parttime" id="parttime" />
                            <Label htmlFor="parttime">Part-time</Label>
                          </div>
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <RadioGroupItem value="contract" id="contract" />
                            <Label htmlFor="contract">Contract</Label>
                          </div>
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <RadioGroupItem value="intern" id="intern" />
                            <Label htmlFor="intern">Internship</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{getTranslationFromI18nKeyAndLabel('form:salary', 'Salary')} *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter annual salary"
                          data-testid={`${dataTestId}-salary-input`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'preferences',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.preferences', 'Preferences'),
        description: getTranslationFromI18nKeyAndLabel('wizard:step.preferences.desc', 'Set your work preferences'),
        fields: ['workLocation', 'communicationPreferences', 'newsletter'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-preferences`}>
              <FormField
                control={form.control}
                name="workLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:workLocation', 'Work Location')} *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      data-testid={`${dataTestId}-work-location-select`}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select work location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="communicationPreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('form:communicationPreferences', 'Communication Preferences')}{' '}
                      *
                    </FormLabel>
                    <div className="gba:space-y-2" data-testid={`${dataTestId}-communication-preferences`}>
                      {['email', 'slack', 'teams', 'phone', 'inPerson'].map(option => (
                        <div key={option} className="gba:flex gba:items-center gba:space-x-2">
                          <Checkbox
                            id={option}
                            checked={field.value?.includes(option)}
                            onCheckedChange={checked => {
                              const updatedValue = checked
                                ? [...(field.value || []), option]
                                : (field.value || []).filter(value => value !== option)
                              field.onChange(updatedValue)
                            }}
                          />
                          <Label htmlFor={option} className="gba:text-sm gba:font-normal">
                            {option.charAt(0).toUpperCase() + option.slice(1).replace(/([A-Z])/g, ' $1')}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newsletter"
                render={({ field }) => (
                  <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid={`${dataTestId}-newsletter-checkbox`}
                      />
                    </FormControl>
                    <div className="gba:space-y-1 gba:leading-none">
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel('form:newsletter', 'Subscribe to Newsletter')}
                      </FormLabel>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        Receive updates and company news via email
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'additional-info',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.additionalInfo', 'Additional Information'),
        description: getTranslationFromI18nKeyAndLabel(
          'wizard:step.additionalInfo.desc',
          'Provide additional details (optional)'
        ),
        fields: ['skills', 'previousExperience', 'references', 'additionalNotes'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-additional-info`}>
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:skills', 'Skills')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List your key skills (optional)"
                        data-testid={`${dataTestId}-skills-textarea`}
                        className="gba:min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="previousExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('form:previousExperience', 'Previous Experience')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your previous experience (optional)"
                        data-testid={`${dataTestId}-previous-experience-textarea`}
                        className="gba:min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="references"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:references', 'References')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide reference contacts (optional)"
                        data-testid={`${dataTestId}-references-textarea`}
                        className="gba:min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('form:additionalNotes', 'Additional Notes')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information you'd like to share (optional)"
                        data-testid={`${dataTestId}-additional-notes-textarea`}
                        className="gba:min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </WizardFormStep>
        )
      }
    ],
    [form, dataTestId]
  )

  return (
    <AppActionForm
      processType="create"
      formType="wizard"
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      wizardSteps={wizardSteps}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common:button.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid={dataTestId}
    >
      {/* Content is handled by WizardForm */}
      <div></div>
    </AppActionForm>
  )
}

export default WizardFormExample
