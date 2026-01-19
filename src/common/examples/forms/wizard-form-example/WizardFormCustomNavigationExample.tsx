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
  Badge,
  WizardFormStep,
  type WizardStep
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Simplified form validation schema for demonstration
const customWizardFormSchema = z.object({
  // Step 1: Basic Info
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select an industry'),

  // Step 2: Contact Details
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),

  // Step 3: Preferences
  communicationMethod: z.string().min(1, 'Please select a communication method'),
  notes: z.string().optional()
})

type CustomWizardFormData = z.infer<typeof customWizardFormSchema>

export interface WizardFormCustomNavigationExampleProps extends BusinessAppContextProps {
  onSuccess?: (data: CustomWizardFormData) => void
  onCancel?: () => void
  initialData?: Partial<CustomWizardFormData>
  'data-testid'?: string
}

const initialCustomWizardFormData: CustomWizardFormData = {
  companyName: '',
  industry: '',
  contactName: '',
  email: '',
  communicationMethod: '',
  notes: ''
}

const WizardFormCustomNavigationExample: React.FC<WizardFormCustomNavigationExampleProps> = ({
  userInfo,
  onSuccess,
  onCancel,
  initialData,
  'data-testid': dataTestId = 'wizard-form-custom-navigation-example'
}) => {
  const [formData] = useState<CustomWizardFormData>({ ...initialCustomWizardFormData, ...initialData })
  const [currentStep, setCurrentStep] = useState(0)

  const form = useForm<CustomWizardFormData>({
    resolver: zodResolver(customWizardFormSchema),
    defaultValues: formData,
    mode: 'onChange'
  })

  const handleSubmit = useCallback(
    async (data: CustomWizardFormData) => {
      console.log('Custom wizard form submitted with data:', data)

      return {
        type: 'WizardFormCustomNavigationExample',
        ...data,
        submittedAt: new Date().toISOString(),
        submittedBy: userInfo?.employeeId || 'unknown',
        currentStepWhenSubmitted: currentStep
      }
    },
    [userInfo, currentStep]
  )

  const handleSuccess = useCallback(
    (result: any) => {
      console.log('Custom wizard form submission successful:', result)
      onSuccess?.(result)
    },
    [onSuccess]
  )

  // Define wizard steps
  const wizardSteps: WizardStep<CustomWizardFormData>[] = useMemo(
    () => [
      {
        id: 'basic-info',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.basicInfo', 'Basic Information'),
        description: getTranslationFromI18nKeyAndLabel('wizard:step.basicInfo.desc', 'Tell us about your company'),
        fields: ['companyName', 'industry'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-basic-info`}>
              <div className="gba:mb-4">
                <Badge variant="outline" className="gba:mb-2">
                  Step 1 of 3
                </Badge>
                <h2 className="gba:text-xl gba:font-semibold">Company Information</h2>
                <p className="gba:text-gray-600">Let's start with some basic details about your company.</p>
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:companyName', 'Company Name')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your company name"
                        data-testid={`${dataTestId}-company-name-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:industry', 'Industry')} *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      data-testid={`${dataTestId}-industry-select`}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'contact-details',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.contactDetails', 'Contact Details'),
        description: getTranslationFromI18nKeyAndLabel('wizard:step.contactDetails.desc', 'Who should we contact?'),
        fields: ['contactName', 'email'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-contact-details`}>
              <div className="gba:mb-4">
                <Badge variant="outline" className="gba:mb-2">
                  Step 2 of 3
                </Badge>
                <h2 className="gba:text-xl gba:font-semibold">Contact Information</h2>
                <p className="gba:text-gray-600">Provide your contact details so we can reach you.</p>
              </div>

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:contactName', 'Contact Name')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter contact person's name"
                        data-testid={`${dataTestId}-contact-name-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:email', 'Email Address')} *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        data-testid={`${dataTestId}-email-input`}
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
      },
      {
        id: 'preferences',
        title: getTranslationFromI18nKeyAndLabel('wizard:step.preferences', 'Preferences'),
        description: getTranslationFromI18nKeyAndLabel('wizard:step.preferences.desc', 'Set your preferences'),
        fields: ['communicationMethod', 'notes'],
        content: (
          <WizardFormStep>
            <div className="gba:space-y-4" data-testid={`${dataTestId}-step-preferences`}>
              <div className="gba:mb-4">
                <Badge variant="outline" className="gba:mb-2">
                  Step 3 of 3
                </Badge>
                <h2 className="gba:text-xl gba:font-semibold">Communication Preferences</h2>
                <p className="gba:text-gray-600">How would you like us to communicate with you?</p>
              </div>

              <FormField
                control={form.control}
                name="communicationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('form:communicationMethod', 'Preferred Communication Method')}{' '}
                      *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      data-testid={`${dataTestId}-communication-method-select`}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select communication method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="slack">Slack</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('form:notes', 'Additional Notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information or special requests (optional)"
                        data-testid={`${dataTestId}-notes-textarea`}
                        className="gba:min-h-[100px]"
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

  // Custom navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep < wizardSteps.length - 1) {
      // Validate current step fields before proceeding
      const currentFields = wizardSteps[currentStep].fields
      form.trigger(currentFields).then(isValid => {
        if (isValid) {
          setCurrentStep(currentStep + 1)
        }
      })
    }
  }, [currentStep, wizardSteps, form])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleStepChange = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex)
  }, [])

  // Check if current step is valid
  const isCurrentStepValid = useMemo(() => {
    const currentFields = wizardSteps[currentStep]?.fields || []
    const formValues = form.getValues()
    const errors = form.formState.errors

    return currentFields.every(field => {
      const value = (formValues as any)[field]
      const hasError = !!(errors as any)[field]
      return value && !hasError
    })
  }, [wizardSteps, currentStep, form.formState.errors, form])

  return (
    <AppActionForm
      processType="create"
      formType="wizard"
      useCustomWizardNavigation={true}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      wizardSteps={wizardSteps}
      currentWizardStep={currentStep}
      onWizardNext={handleNext}
      onWizardBack={handleBack}
      onWizardStepChange={handleStepChange}
      isWizardNextDisabled={!isCurrentStepValid}
      isWizardSubmitDisabled={!isCurrentStepValid}
      showStepNumbers={true}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common:button.submit', 'Complete Setup')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid={dataTestId}
    >
      {/* Content is handled by custom wizard navigation */}
    </AppActionForm>
  )
}

export default WizardFormCustomNavigationExample
