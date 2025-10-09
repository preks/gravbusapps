import React, { useState } from 'react'
import {
  Card,
  Button,
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Badge
} from '@newwork/nw-design-system'
import { User, CheckCircle, XCircle, MessageSquare, FileText, PlayCircle, ExternalLink } from 'lucide-react'
import { useForm } from 'react-hook-form'

interface StepSimulationFormProps {
  step: any
  stepIndex: number
  simulationMode: boolean
  userPerspective: string
  onStepComplete: (stepIndex: number, data: any) => void
  'data-testid'?: string
}

export const StepSimulationForm: React.FC<StepSimulationFormProps> = ({
  step,
  stepIndex,
  simulationMode,
  userPerspective,
  onStepComplete,
  'data-testid': testId = 'step-simulation-form'
}) => {
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<'APPROVED' | 'REJECTED' | 'COMPLETED' | null>(null)

  const form = useForm<Record<string, any>>({
    defaultValues: {}
  })

  const getStepTypeIcon = (stepType: string) => {
    switch (stepType) {
      case 'TASK':
        return <User className="gba:w-4 gba:h-4" />
      case 'APPROVAL':
        return <CheckCircle className="gba:w-4 gba:h-4" />
      case 'INFORMATION':
        return <MessageSquare className="gba:w-4 gba:h-4" />
      case 'ACKNOWLEDGE':
        return <FileText className="gba:w-4 gba:h-4" />
      default:
        return <PlayCircle className="gba:w-4 gba:h-4" />
    }
  }

  const getStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'TASK':
        return 'var(--color-primary-500)'
      case 'APPROVAL':
        return 'var(--color-warning-500)'
      case 'INFORMATION':
        return 'var(--color-info-500)'
      case 'ACKNOWLEDGE':
        return 'var(--color-success-500)'
      default:
        return 'var(--color-surface-disabled)'
    }
  }

  const renderInputField = (input: any, index: number) => {
    const fieldName = input.name || `input_${index}`

    switch (input.type) {
      case 'TEXTAREA':
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{input.label}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={input.placeholder}
                    rows={4}
                    {...field}
                    data-testid={`${testId}-input-${index}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'SELECT':
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{input.label}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid={`${testId}-input-${index}`}>
                      <SelectValue placeholder={input.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {input.options?.map((option: any, optIndex: number) => (
                      <SelectItem key={optIndex} value={typeof option === 'string' ? option : option.value}>
                        {typeof option === 'string' ? option : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'CHECKBOX':
        if (input.options && input.options.length > 0) {
          return (
            <FormField
              key={index}
              control={form.control}
              name={fieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{input.label}</FormLabel>
                  <div className="gba:space-y-2">
                    {input.options.map((option: any, optIndex: number) => (
                      <div key={optIndex} className="gba:flex gba:items-center gba:space-x-2">
                        <Checkbox
                          id={`${fieldName}-${optIndex}`}
                          checked={field.value?.includes(option.value) || false}
                          onCheckedChange={checked => {
                            const currentValue = field.value || []
                            if (checked) {
                              field.onChange([...currentValue, option.value])
                            } else {
                              field.onChange(currentValue.filter((v: any) => v !== option.value))
                            }
                          }}
                        />
                        <Label htmlFor={`${fieldName}-${optIndex}`}>{option.label}</Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )
        }
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0">
                <FormControl>
                  <Checkbox checked={field.value || false} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="gba:space-y-1 gba:leading-none">
                  <FormLabel>{input.label}</FormLabel>
                </div>
              </FormItem>
            )}
          />
        )

      case 'RADIO':
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className="gba:space-y-3">
                <FormLabel>{input.label}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="gba:flex gba:flex-col gba:space-y-1"
                  >
                    {input.options?.map((option: any, optIndex: number) => (
                      <div key={optIndex} className="gba:flex gba:items-center gba:space-x-2">
                        <RadioGroupItem
                          value={typeof option === 'string' ? option : option.value}
                          id={`${fieldName}-${optIndex}`}
                        />
                        <Label htmlFor={`${fieldName}-${optIndex}`}>
                          {typeof option === 'string' ? option : option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'DATE':
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{input.label}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder={input.placeholder}
                    {...field}
                    data-testid={`${testId}-input-${index}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'MULTISELECT':
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{input.label}</FormLabel>
                <div className="gba:space-y-2">
                  {input.options?.map((option: any, optIndex: number) => (
                    <div key={optIndex} className="gba:flex gba:items-center gba:space-x-2">
                      <Checkbox
                        id={`${fieldName}-${optIndex}`}
                        checked={field.value?.includes(option.value) || false}
                        onCheckedChange={checked => {
                          const currentValue = field.value || []
                          if (checked) {
                            field.onChange([...currentValue, option.value])
                          } else {
                            field.onChange(currentValue.filter((v: any) => v !== option.value))
                          }
                        }}
                        data-testid={`${testId}-input-${index}-option-${optIndex}`}
                      />
                      <Label htmlFor={`${fieldName}-${optIndex}`}>
                        {typeof option === 'string' ? option : option.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'TEXT':
      default:
        return (
          <FormField
            key={index}
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{input.label}</FormLabel>
                <FormControl>
                  <Input placeholder={input.placeholder} {...field} data-testid={`${testId}-input-${index}`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
    }
  }

  const handleSimulateStep = async (result: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    setIsSimulating(true)
    setSimulationResult(result)

    try {
      // Validate form if there are inputs
      if (step.form && step.form.length > 0) {
        const isValid = await form.trigger()
        if (!isValid) {
          setIsSimulating(false)
          setSimulationResult(null)
          return
        }
      }

      const formData = form.getValues()

      const simulationData = {
        stepIndex,
        formData,
        completedBy: userPerspective,
        completedAt: new Date().toISOString(),
        result
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      onStepComplete(stepIndex, simulationData)
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setIsSimulating(false)
    }
  }

  const getActionButtons = () => {
    if (!simulationMode) {
      return null
    }

    switch (step.type) {
      case 'APPROVAL':
        return (
          <div className="gba:flex gba:gap-3">
            <Button
              variant="destructive"
              onClick={() => handleSimulateStep('REJECTED')}
              disabled={isSimulating}
              className="gba:gap-2"
              data-testid={`${testId}-reject-button`}
            >
              <XCircle className="gba:w-4 gba:h-4" />
              Reject
            </Button>
            <Button
              variant="default"
              onClick={() => handleSimulateStep('APPROVED')}
              disabled={isSimulating}
              className="gba:gap-2"
              style={{ backgroundColor: 'var(--color-success-500)', color: 'var(--color-on-primary)' }}
              data-testid={`${testId}-approve-button`}
            >
              <CheckCircle className="gba:w-4 gba:h-4" />
              Approve
            </Button>
          </div>
        )

      default:
        return (
          <Button
            variant="default"
            onClick={() => handleSimulateStep('COMPLETED')}
            disabled={isSimulating}
            className="gba:gap-2"
            data-testid={`${testId}-complete-button`}
          >
            <CheckCircle className="gba:w-4 gba:h-4" />
            {isSimulating ? 'Simulating...' : 'Complete Step'}
          </Button>
        )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }} data-testid={testId}>
      {/* Step Info */}
      <div>
        <div
          className="gba:flex gba:items-center"
          style={{
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)'
          }}
        >
          <div style={{ color: getStepTypeColor(step.type) }}>{getStepTypeIcon(step.type)}</div>
          <Badge
            variant="outline"
            style={{
              backgroundColor: getStepTypeColor(step.type),
              color: 'var(--color-on-primary)',
              border: 'none'
            }}
          >
            {step.type}
          </Badge>
        </div>

        {step.message && (
          <div
            className="gba:p-4 gba:rounded-lg gba:border"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border-default)'
            }}
          >
            <p
              className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {step.message}
            </p>
          </div>
        )}

        {/* Related Links */}
        {step.links && step.links.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h5
              className="gba:flex gba:items-center"
              style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                lineHeight: '1.25rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-lg)',
                gap: 'var(--spacing-sm)'
              }}
            >
              <FileText style={{ width: '1rem', height: '1rem' }} />
              Related Links
            </h5>

            <div className="gba:grid" style={{ gap: 'var(--spacing-sm)' }}>
              {step.links.map((link: any, index: number) => (
                <div
                  key={index}
                  className="gba:group gba:rounded-lg gba:border gba:transition-all gba:duration-200 gba:hover:shadow-sm"
                  style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-surface-primary)',
                    borderColor: 'var(--color-border-default)'
                  }}
                >
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:flex gba:items-center gba:group-hover:underline"
                      style={{
                        gap: 'var(--spacing-md)',
                        color: 'var(--color-primary-600)',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        lineHeight: '1.25rem'
                      }}
                    >
                      <div
                        className="gba:flex-shrink-0 gba:rounded-full"
                        style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          backgroundColor: 'var(--color-primary-600)'
                        }}
                      ></div>
                      <span className="gba:flex-1">{link.name || link.url}</span>
                      <ExternalLink
                        className="gba:opacity-60 gba:group-hover:opacity-100"
                        style={{ width: '1rem', height: '1rem' }}
                      />
                    </a>
                  ) : (
                    <div
                      className="gba:flex gba:items-center"
                      style={{
                        gap: 'var(--spacing-md)',
                        fontSize: '0.875rem',
                        lineHeight: '1.25rem'
                      }}
                    >
                      <div
                        className="gba:flex-shrink-0 gba:rounded-full"
                        style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          backgroundColor: 'var(--color-text-secondary)'
                        }}
                      ></div>
                      <span className="gba:flex-1" style={{ color: 'var(--color-text-primary)' }}>
                        {link.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Inputs */}
      {step.form && step.form.length > 0 && (
        <Card
          style={{
            boxShadow: 'var(--shadow-sm)',
            border: `1px solid var(--color-border-default)`,
            backgroundColor: 'var(--color-surface-primary)'
          }}
        >
          <div style={{ padding: 'var(--spacing-2xl)' }}>
            <h4
              className="gba:flex gba:items-center"
              style={{
                fontSize: '1.125rem',
                fontWeight: '500',
                lineHeight: '1.75rem',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-xl)',
                gap: 'var(--spacing-sm)'
              }}
            >
              <FileText style={{ width: '1rem', height: '1rem' }} />
              Form Fields
            </h4>

            <Form {...form}>
              <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {step.form.map((input: any, index: number) => renderInputField(input, index))}
              </form>
            </Form>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {simulationMode && !simulationResult && (
        <div className="gba:flex gba:justify-center" style={{ paddingTop: 'var(--spacing-xl)' }}>
          {getActionButtons()}
        </div>
      )}

      {/* Simulation Result */}
      {simulationResult && (
        <div
          className="gba:p-4 gba:rounded-lg gba:border"
          style={{
            backgroundColor: simulationResult === 'REJECTED' ? 'var(--color-danger-50)' : 'var(--color-success-50)',
            borderColor: simulationResult === 'REJECTED' ? 'var(--color-danger-300)' : 'var(--color-success-300)'
          }}
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            {simulationResult === 'REJECTED' ? (
              <XCircle className="gba:w-5 gba:h-5" style={{ color: 'var(--color-danger-600)' }} />
            ) : (
              <CheckCircle className="gba:w-5 gba:h-5" style={{ color: 'var(--color-success-600)' }} />
            )}
            <span
              className="gba:font-medium"
              style={{
                color: simulationResult === 'REJECTED' ? 'var(--color-danger-700)' : 'var(--color-success-700)'
              }}
            >
              Step {simulationResult === 'REJECTED' ? 'Rejected' : 'Completed'} Successfully
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
