// Example Action Wizard Form - demonstrates AppActionForm with wizard steps
// ✨ Applying rules: 📋 03-develop-react-components-tsx: React component standards, 📋 10-app-actions: AppActionForm wizard patterns

import React, { useCallback, useMemo } from 'react'
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
  type WizardStep,
  Switch
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Wizard form validation schema with Zod
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
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'intern'], {
    errorMap: () => ({ message: 'Please select employment type' })
  }),
  salary: z.preprocess(
    val => {
      if (val === null || val === undefined || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number({ message: 'Salary must be a valid number' }).min(0, 'Salary must be positive').optional()
  ),

  // Step 3: Preferences and Settings
  workLocation: z.enum(['office', 'remote', 'hybrid'], {
    errorMap: () => ({ message: 'Please select work location' })
  }),
  communicationPreferences: z.array(z.string()).min(1, 'Please select at least one communication preference'),
  newsletter: z.boolean().optional(),
  notifications: z.boolean().default(true),

  // Step 4: Additional Information
  skills: z.string().optional(),
  previousExperience: z.string().optional(),
  references: z.string().optional(),
  additionalNotes: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(10, 'Emergency contact phone is required'),
    relationship: z.string().min(1, 'Relationship is required')
  })
})

type WizardFormData = z.infer<typeof wizardFormSchema>

export interface AppActionFormWizardExampleProps extends BusinessAppContextProps {
  onSuccess?: (data: WizardFormData) => void
  initialData?: Partial<WizardFormData>
  'data-testid'?: string
}

const AppActionFormWizardExample: React.FC<AppActionFormWizardExampleProps> = ({
  structureId,
  userInfo,
  onSuccess,
  initialData,
  'data-testid': dataTestId = 'wizard-form-example'
}) => {
  // Initialize form with Zod resolver
  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      // Step 1: Personal Information
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      dateOfBirth: initialData?.dateOfBirth || '',

      // Step 2: Professional Information
      jobTitle: initialData?.jobTitle || '',
      department: initialData?.department || '',
      startDate: initialData?.startDate || '',
      employmentType: initialData?.employmentType || undefined,
      salary: initialData?.salary || undefined,

      // Step 3: Preferences and Settings
      workLocation: initialData?.workLocation || undefined,
      communicationPreferences: initialData?.communicationPreferences || [],
      newsletter: initialData?.newsletter || false,
      notifications: initialData?.notifications || true,

      // Step 4: Additional Information
      skills: initialData?.skills || '',
      previousExperience: initialData?.previousExperience || '',
      references: initialData?.references || '',
      additionalNotes: initialData?.additionalNotes || '',
      emergencyContact: {
        name: initialData?.emergencyContact?.name || '',
        phone: initialData?.emergencyContact?.phone || '',
        relationship: initialData?.emergencyContact?.relationship || ''
      }
    }
  })

  // Define wizard steps
  const wizardSteps: WizardStep<WizardFormData>[] = useMemo(
    () => [
      {
        id: 'personal',
        title: getTranslationFromI18nKeyAndLabel('PersonalInformation', 'Personal Information'),
        description: getTranslationFromI18nKeyAndLabel('PersonalInfoDescription', 'Enter your basic personal details'),
        fields: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'],
        content: (
          <WizardFormStep
            title={getTranslationFromI18nKeyAndLabel('PersonalInformation', 'Personal Information')}
            data-testid={`${dataTestId}-step-personal`}
          >
            <div className="gba:space-y-4">
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
                        <Input
                          {...field}
                          placeholder="Enter first name"
                          data-testid={`${dataTestId}-first-name-input`}
                        />
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid={`${dataTestId}-email-label`}>
                      {getTranslationFromI18nKeyAndLabel('Email', 'Email Address')}
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

              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid={`${dataTestId}-phone-label`}>
                        {getTranslationFromI18nKeyAndLabel('Phone', 'Phone Number')}
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

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid={`${dataTestId}-dob-label`}>
                        {getTranslationFromI18nKeyAndLabel('DateOfBirth', 'Date of Birth')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid={`${dataTestId}-dob-input`} />
                      </FormControl>
                      <FormMessage data-testid={`${dataTestId}-dob-error`} />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'professional',
        title: getTranslationFromI18nKeyAndLabel('ProfessionalInformation', 'Professional Information'),
        description: getTranslationFromI18nKeyAndLabel(
          'ProfessionalInfoDescription',
          'Enter your work-related details'
        ),
        fields: ['jobTitle', 'department', 'startDate', 'employmentType', 'salary'],
        content: (
          <WizardFormStep
            title={getTranslationFromI18nKeyAndLabel('ProfessionalInformation', 'Professional Information')}
            data-testid={`${dataTestId}-step-professional`}
          >
            <div className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
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
                          <SelectItem value="engineering" data-testid={`${dataTestId}-dept-engineering`}>
                            Engineering
                          </SelectItem>
                          <SelectItem value="marketing" data-testid={`${dataTestId}-dept-marketing`}>
                            Marketing
                          </SelectItem>
                          <SelectItem value="sales" data-testid={`${dataTestId}-dept-sales`}>
                            Sales
                          </SelectItem>
                          <SelectItem value="hr" data-testid={`${dataTestId}-dept-hr`}>
                            Human Resources
                          </SelectItem>
                          <SelectItem value="finance" data-testid={`${dataTestId}-dept-finance`}>
                            Finance
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage data-testid={`${dataTestId}-department-error`} />
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
                name="employmentType"
                render={({ field }) => (
                  <FormItem className="gba:space-y-3">
                    <FormLabel data-testid={`${dataTestId}-employment-type-label`}>
                      {getTranslationFromI18nKeyAndLabel('EmploymentType', 'Employment Type')}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="gba:flex gba:flex-col gba:space-y-1"
                        data-testid={`${dataTestId}-employment-type-group`}
                      >
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem
                            value="full-time"
                            id="full-time"
                            data-testid={`${dataTestId}-employment-full-time`}
                          />
                          <Label htmlFor="full-time" data-testid={`${dataTestId}-employment-full-time-label`}>
                            Full-time
                          </Label>
                        </div>
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem
                            value="part-time"
                            id="part-time"
                            data-testid={`${dataTestId}-employment-part-time`}
                          />
                          <Label htmlFor="part-time" data-testid={`${dataTestId}-employment-part-time-label`}>
                            Part-time
                          </Label>
                        </div>
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem
                            value="contract"
                            id="contract"
                            data-testid={`${dataTestId}-employment-contract`}
                          />
                          <Label htmlFor="contract" data-testid={`${dataTestId}-employment-contract-label`}>
                            Contract
                          </Label>
                        </div>
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem value="intern" id="intern" data-testid={`${dataTestId}-employment-intern`} />
                          <Label htmlFor="intern" data-testid={`${dataTestId}-employment-intern-label`}>
                            Intern
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage data-testid={`${dataTestId}-employment-type-error`} />
                  </FormItem>
                )}
              />
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'preferences',
        title: getTranslationFromI18nKeyAndLabel('Preferences', 'Preferences & Settings'),
        description: getTranslationFromI18nKeyAndLabel('PreferencesDescription', 'Configure your work preferences'),
        fields: ['workLocation', 'communicationPreferences', 'newsletter', 'notifications'],
        content: (
          <WizardFormStep
            title={getTranslationFromI18nKeyAndLabel('Preferences', 'Preferences & Settings')}
            data-testid={`${dataTestId}-step-preferences`}
          >
            <div className="gba:space-y-6">
              <FormField
                control={form.control}
                name="workLocation"
                render={({ field }) => (
                  <FormItem className="gba:space-y-3">
                    <FormLabel data-testid={`${dataTestId}-work-location-label`}>
                      {getTranslationFromI18nKeyAndLabel('WorkLocation', 'Preferred Work Location')}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="gba:flex gba:flex-col gba:space-y-1"
                        data-testid={`${dataTestId}-work-location-group`}
                      >
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem value="office" id="office" data-testid={`${dataTestId}-location-office`} />
                          <Label htmlFor="office" data-testid={`${dataTestId}-location-office-label`}>
                            Office
                          </Label>
                        </div>
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem value="remote" id="remote" data-testid={`${dataTestId}-location-remote`} />
                          <Label htmlFor="remote" data-testid={`${dataTestId}-location-remote-label`}>
                            Remote
                          </Label>
                        </div>
                        <div className="gba:flex gba:items-center gba:space-x-2">
                          <RadioGroupItem value="hybrid" id="hybrid" data-testid={`${dataTestId}-location-hybrid`} />
                          <Label htmlFor="hybrid" data-testid={`${dataTestId}-location-hybrid-label`}>
                            Hybrid
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage data-testid={`${dataTestId}-work-location-error`} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="communicationPreferences"
                render={() => (
                  <FormItem>
                    <div className="gba:mb-4">
                      <FormLabel className="gba:text-base" data-testid={`${dataTestId}-comm-prefs-label`}>
                        {getTranslationFromI18nKeyAndLabel('CommunicationPreferences', 'Communication Preferences')}
                      </FormLabel>
                      <div
                        className="gba:text-sm gba:text-gray-600"
                        data-testid={`${dataTestId}-comm-prefs-description`}
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'CommPrefsDescription',
                          'Select how you prefer to be contacted'
                        )}
                      </div>
                    </div>
                    <div className="gba:space-y-2" data-testid={`${dataTestId}-comm-prefs-options`}>
                      {['email', 'phone', 'slack', 'teams'].map(item => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="communicationPreferences"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={checked => {
                                      return checked
                                        ? field.onChange([...field.value, item])
                                        : field.onChange(field.value?.filter((value: string) => value !== item))
                                    }}
                                    data-testid={`${dataTestId}-comm-pref-${item}`}
                                  />
                                </FormControl>
                                <FormLabel
                                  className="gba:font-normal"
                                  data-testid={`${dataTestId}-comm-pref-${item}-label`}
                                >
                                  {item.charAt(0).toUpperCase() + item.slice(1)}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage data-testid={`${dataTestId}-comm-prefs-error`} />
                  </FormItem>
                )}
              />

              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="newsletter"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:rounded-lg gba:border gba:p-4">
                      <div className="gba:space-y-0.5">
                        <FormLabel className="gba:text-base" data-testid={`${dataTestId}-newsletter-label`}>
                          {getTranslationFromI18nKeyAndLabel('Newsletter', 'Newsletter Subscription')}
                        </FormLabel>
                        <div
                          className="gba:text-sm gba:text-gray-600"
                          data-testid={`${dataTestId}-newsletter-description`}
                        >
                          {getTranslationFromI18nKeyAndLabel(
                            'NewsletterDescription',
                            'Receive company updates and news'
                          )}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid={`${dataTestId}-newsletter-switch`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifications"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:rounded-lg gba:border gba:p-4">
                      <div className="gba:space-y-0.5">
                        <FormLabel className="gba:text-base" data-testid={`${dataTestId}-notifications-label`}>
                          {getTranslationFromI18nKeyAndLabel('Notifications', 'Push Notifications')}
                        </FormLabel>
                        <div
                          className="gba:text-sm gba:text-gray-600"
                          data-testid={`${dataTestId}-notifications-description`}
                        >
                          {getTranslationFromI18nKeyAndLabel(
                            'NotificationsDescription',
                            'Receive task and system notifications'
                          )}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid={`${dataTestId}-notifications-switch`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'additional',
        title: getTranslationFromI18nKeyAndLabel('AdditionalInformation', 'Additional Information'),
        description: getTranslationFromI18nKeyAndLabel(
          'AdditionalInfoDescription',
          'Provide additional details and emergency contact'
        ),
        fields: ['skills', 'previousExperience', 'references', 'additionalNotes', 'emergencyContact'],
        content: (
          <WizardFormStep
            title={getTranslationFromI18nKeyAndLabel('AdditionalInformation', 'Additional Information')}
            data-testid={`${dataTestId}-step-additional`}
          >
            <div className="gba:space-y-6">
              <div className="gba:space-y-4">
                <h4
                  className="gba:text-base gba:font-medium gba:text-gray-900"
                  data-testid={`${dataTestId}-professional-details-title`}
                >
                  {getTranslationFromI18nKeyAndLabel('ProfessionalDetails', 'Professional Details')}
                </h4>

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid={`${dataTestId}-skills-label`}>
                        {getTranslationFromI18nKeyAndLabel('Skills', 'Skills (Optional)')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="List your key skills and competencies"
                          rows={3}
                          data-testid={`${dataTestId}-skills-input`}
                        />
                      </FormControl>
                      <FormMessage data-testid={`${dataTestId}-skills-error`} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="previousExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid={`${dataTestId}-experience-label`}>
                        {getTranslationFromI18nKeyAndLabel('PreviousExperience', 'Previous Experience (Optional)')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe your relevant work experience"
                          rows={3}
                          data-testid={`${dataTestId}-experience-input`}
                        />
                      </FormControl>
                      <FormMessage data-testid={`${dataTestId}-experience-error`} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="references"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid={`${dataTestId}-references-label`}>
                        {getTranslationFromI18nKeyAndLabel('References', 'References (Optional)')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Provide professional references"
                          rows={2}
                          data-testid={`${dataTestId}-references-input`}
                        />
                      </FormControl>
                      <FormMessage data-testid={`${dataTestId}-references-error`} />
                    </FormItem>
                  )}
                />
              </div>

              <div className="gba:space-y-4">
                <h4
                  className="gba:text-base gba:font-medium gba:text-gray-900"
                  data-testid={`${dataTestId}-emergency-contact-title`}
                >
                  {getTranslationFromI18nKeyAndLabel('EmergencyContact', 'Emergency Contact')}
                </h4>

                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyContact.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid={`${dataTestId}-emergency-name-label`}>
                          {getTranslationFromI18nKeyAndLabel('EmergencyContactName', 'Contact Name')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter emergency contact name"
                            data-testid={`${dataTestId}-emergency-name-input`}
                          />
                        </FormControl>
                        <FormMessage data-testid={`${dataTestId}-emergency-name-error`} />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid={`${dataTestId}-emergency-phone-label`}>
                          {getTranslationFromI18nKeyAndLabel('EmergencyContactPhone', 'Contact Phone')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="Enter emergency contact phone"
                            data-testid={`${dataTestId}-emergency-phone-input`}
                          />
                        </FormControl>
                        <FormMessage data-testid={`${dataTestId}-emergency-phone-error`} />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid={`${dataTestId}-emergency-relationship-label`}>
                        {getTranslationFromI18nKeyAndLabel('EmergencyContactRelationship', 'Relationship')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid={`${dataTestId}-emergency-relationship-select`}>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid={`${dataTestId}-emergency-relationship-options`}>
                          <SelectItem value="spouse" data-testid={`${dataTestId}-relationship-spouse`}>
                            Spouse
                          </SelectItem>
                          <SelectItem value="parent" data-testid={`${dataTestId}-relationship-parent`}>
                            Parent
                          </SelectItem>
                          <SelectItem value="sibling" data-testid={`${dataTestId}-relationship-sibling`}>
                            Sibling
                          </SelectItem>
                          <SelectItem value="child" data-testid={`${dataTestId}-relationship-child`}>
                            Child
                          </SelectItem>
                          <SelectItem value="friend" data-testid={`${dataTestId}-relationship-friend`}>
                            Friend
                          </SelectItem>
                          <SelectItem value="other" data-testid={`${dataTestId}-relationship-other`}>
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage data-testid={`${dataTestId}-emergency-relationship-error`} />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid={`${dataTestId}-notes-label`}>
                      {getTranslationFromI18nKeyAndLabel('AdditionalNotes', 'Additional Notes (Optional)')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Any additional information you'd like to provide"
                        rows={3}
                        data-testid={`${dataTestId}-notes-input`}
                      />
                    </FormControl>
                    <FormMessage data-testid={`${dataTestId}-notes-error`} />
                  </FormItem>
                )}
              />
            </div>
          </WizardFormStep>
        )
      }
    ],
    [form.control, dataTestId]
  )

  // Transform and validate form data before submission
  const handleSubmit = useCallback(
    async (data: WizardFormData) => {
      try {
        // Simulate API call or data processing
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Transform data for process payload
        const processPayload = {
          employeeOnboarding: {
            personalInformation: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              dateOfBirth: data.dateOfBirth
            },
            professionalInformation: {
              jobTitle: data.jobTitle,
              department: data.department,
              startDate: data.startDate,
              employmentType: data.employmentType,
              salary: data.salary
            },
            preferences: {
              workLocation: data.workLocation,
              communicationPreferences: data.communicationPreferences,
              newsletter: data.newsletter,
              notifications: data.notifications
            },
            additionalInformation: {
              skills: data.skills,
              previousExperience: data.previousExperience,
              references: data.references,
              additionalNotes: data.additionalNotes,
              emergencyContact: data.emergencyContact
            }
          },
          metadata: {
            completedBy: userInfo?.employeeId,
            structureId: structureId,
            completedAt: new Date().toISOString(),
            wizardSteps: wizardSteps.map(step => step.id)
          }
        }

        return processPayload
      } catch {
        throw new Error('Failed to complete employee onboarding. Please try again.')
      }
    },
    [userInfo?.employeeId, structureId, wizardSteps]
  )

  // Handle successful submission
  const handleSuccess = useCallback(
    (result: any) => {
      console.log('Employee onboarding completed successfully:', result)
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
      formType="wizard"
      form={form}
      resolver={zodResolver(wizardFormSchema)}
      wizardSteps={wizardSteps}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      formData={form.watch()}
      submitEventType="pse_submit"
      cancelEventType="pse_pause"
      showStepIndicator={true}
      allowStepJumping={false}
      submitButtonText={getTranslationFromI18nKeyAndLabel('CompleteOnboarding', 'Complete Onboarding')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('Cancel', 'Cancel')}
      showCancelButton={true}
      submitButtonVariant="default"
      data-testid={dataTestId}
    >
      {/* Content is handled by wizardSteps */}
    </AppActionForm>
  )
}

export default AppActionFormWizardExample
