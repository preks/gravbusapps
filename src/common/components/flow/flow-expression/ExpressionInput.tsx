import React, { useEffect, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Input,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Code, Loader2, Network } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowTemplate } from '@/common/data/flow/types/flowTemplate'
import { useEntitySchemas } from '@/common/data/flow/hooks/useEntitySchemas'
import { useExpressionValidator } from '@/common/data/flow/hooks/useExpressionValidator'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { ExpressionBuilder } from './ExpressionBuilder'
import { HumanReadablePreview } from './HumanReadablePreview'

interface ExpressionInputProps {
  value: string
  onChange: (value: string) => void
  mode?: 'auto' | 'expression' | 'text'
  placeholder?: string
  disabled?: boolean
  validateOnChange?: boolean
  onValidationChange?: (isValid: boolean, message?: string) => void
  template?: FlowTemplate
  stepIndex?: number
  useTreeBuilder?: boolean
  multiline?: boolean
  rows?: number
  context?: BusinessAppContextProps
  'data-testid'?: string
}

type ValidationState = 'valid' | 'invalid' | 'pending' | 'warning' | null

/**
 * Strict client-side validation for expression input
 */
const validateExpressionStrict = (value: string): { isValid: boolean; message?: string } => {
  if (!value.trim()) {
    return { isValid: true }
  }

  const expressionRegex = /\{\{(.+?)\}\}/g
  const expressions = value.match(expressionRegex) || []

  let remainingText = value
  expressions.forEach(expression => {
    remainingText = remainingText.replace(expression, '')
  })

  const suspiciousCharPattern = /[@#$%^&*+={}[\]|<>]/

  if (suspiciousCharPattern.test(remainingText)) {
    const suspiciousCharacters = remainingText.match(suspiciousCharPattern)
    return {
      isValid: false,
      message: `Invalid character${suspiciousCharacters && suspiciousCharacters.length > 1 ? 's' : ''}: ${suspiciousCharacters?.join(', ')}`
    }
  }

  if (expressions.length === 0 && value.includes('{{')) {
    return {
      isValid: false,
      message: 'Incomplete expression - missing }}'
    }
  }

  if (expressions.length === 0 && value.includes('}}')) {
    return {
      isValid: false,
      message: 'Incomplete expression - missing {{'
    }
  }

  return { isValid: true }
}

/**
 * ExpressionInput - Smart input field that supports JSONPath expressions
 */
export const ExpressionInput: React.FC<ExpressionInputProps> = ({
  value,
  onChange,
  mode = 'auto',
  placeholder,
  disabled = false,
  validateOnChange = false,
  onValidationChange,
  template,
  stepIndex = 0,
  useTreeBuilder = true,
  multiline = false,
  rows = 4,
  context,
  'data-testid': testId = 'expression-input'
}) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const hasExpressions = value.includes('{{') && value.includes('}}')

  const [isExpressionMode, setIsExpressionMode] = useState<boolean>(
    mode === 'expression' || (mode === 'auto' && hasExpressions)
  )

  const { schemas: entitySchemas } = useEntitySchemas({
    includeFields: false,
    enableCache: true
  })

  const [validationState, setValidationState] = useState<ValidationState>(null)
  const [validationMessage, setValidationMessage] = useState<string>('')
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { validateExpression: validateWithHook } = useExpressionValidator(
    template || ({} as FlowTemplate),
    stepIndex !== undefined ? stepIndex : 0,
    entitySchemas || undefined
  )

  useEffect(() => {
    if (mode === 'auto') {
      setIsExpressionMode(hasExpressions)
    }
  }, [hasExpressions, mode])

  const shouldValidate = validateOnChange || (useTreeBuilder && template)

  useEffect(() => {
    if (!shouldValidate) {
      setValidationState(null)
      setValidationMessage('')
      return
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    if (!value.trim()) {
      setValidationState(null)
      setValidationMessage('')
      onValidationChange?.(true)
      return
    }

    if (!hasExpressions) {
      setValidationState(null)
      setValidationMessage('')
      onValidationChange?.(true)
      return
    }

    setValidationState('pending')

    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const strictValidation = validateExpressionStrict(value)

        if (!strictValidation.isValid) {
          setValidationState('invalid')
          setValidationMessage(strictValidation.message || 'Invalid expression')
          onValidationChange?.(false, strictValidation.message)
          return
        }

        if (template) {
          const templateValidation = await validateWithHook(value)

          if (!templateValidation.isValid) {
            setValidationState('invalid')
            setValidationMessage(templateValidation.message || 'Invalid expression')
            onValidationChange?.(false, templateValidation.message)
            return
          }

          const validationTemplate = {
            ...template,
            name: template.name || '__validation_test__',
            description: template.description || 'Test template for expression validation',
            steps: template.steps.map((step, index) =>
              index === stepIndex
                ? {
                    ...step,
                    title: value,
                    message: value
                  }
                : step
            )
          }

          const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/templates/validate-expressions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ template: validationTemplate })
          })

          if (!response.ok) {
            setValidationState('warning')
            setValidationMessage('Validation service unavailable')
            onValidationChange?.(true)
            return
          }

          const result = await response.json()

          if (result.isValid) {
            setValidationState('valid')
            setValidationMessage('')
            onValidationChange?.(true)
          } else {
            const errorMessage = result.errors && result.errors.length > 0 ? result.errors[0] : 'Invalid expression'
            setValidationState('invalid')
            setValidationMessage(errorMessage)
            onValidationChange?.(false, errorMessage)
          }
        } else {
          setValidationState('valid')
          setValidationMessage('')
          onValidationChange?.(true)
        }
      } catch (error) {
        console.error('Expression validation error:', error)
        setValidationState('warning')
        setValidationMessage('Validation failed')
        onValidationChange?.(true)
      }
    }, 500)

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [entitySchemas, hasExpressions, onValidationChange, shouldValidate, stepIndex, template, validateWithHook, value])

  const getValidationBadge = () => {
    if (!shouldValidate || !hasExpressions) return null

    switch (validationState) {
      case 'valid':
        return (
          <Badge variant="default" className="gba:bg-green-100 gba:text-green-800 gba:border-green-200">
            <CheckCircle className="gba:h-3 gba:w-3" />
          </Badge>
        )
      case 'invalid':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="gba:cursor-help">
                  <AlertCircle className="gba:h-3 gba:w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="gba:text-xs">{validationMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case 'warning':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="gba:bg-yellow-100 gba:text-yellow-800 gba:border-yellow-200 gba:cursor-help"
                >
                  <AlertCircle className="gba:h-3 gba:w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="gba:text-xs">{validationMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin" />
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="gba:relative gba:space-y-1" data-testid={testId}>
      <div className="gba:flex gba:items-start gba:gap-2">
        <div className="gba:flex-1 gba:relative">
          {multiline ? (
            <Textarea
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={placeholder || 'Enter value'}
              disabled={disabled}
              rows={rows}
              style={{
                minHeight: `${rows * 1.5}rem`,
                height: 'auto',
                resize: 'vertical'
              }}
              className={`!gba:min-h-0 ${isExpressionMode ? 'gba:bg-purple-50 gba:border-purple-300' : ''}`}
              data-testid={`${testId}-input`}
            />
          ) : (
            <Input
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={placeholder || 'Enter value'}
              disabled={disabled}
              className={isExpressionMode ? 'gba:bg-purple-50 gba:border-purple-300' : ''}
              data-testid={`${testId}-input`}
            />
          )}

          {getValidationBadge() && (
            <div className={`gba:absolute gba:right-2 ${multiline ? 'gba:top-2' : 'gba:top-1/2 gba:-translate-y-1/2'}`}>
              {getValidationBadge()}
            </div>
          )}
        </div>

        {useTreeBuilder && template && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBuilderOpen(true)}
                  disabled={disabled}
                  className="gba:shrink-0"
                  data-testid={`${testId}-builder`}
                >
                  <Network className="gba:h-4 gba:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="gba:text-xs">
                  Expression builder
                  <span className="gba:block gba:text-gray-500 gba:mt-0.5" style={{ fontSize: '10px' }}>
                    See Manual tab for syntax reference
                  </span>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {isExpressionMode && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant="secondary" className="gba:text-xs gba:bg-purple-100 gba:text-purple-800">
            <Code className="gba:h-3 gba:w-3 gba:mr-1" />
            Expression Mode
          </Badge>
          {hasExpressions && (
            <span className="gba:text-xs gba:text-gray-500">
              {(value.match(/\{\{/g) || []).length} expression(s) detected
            </span>
          )}
        </div>
      )}

      {hasExpressions && value.trim() && (
        <div className="gba:mt-2 gba:rounded-lg gba:border gba:border-muted gba:bg-muted/30 gba:p-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1.5">
            <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0">
              Preview
            </Badge>
          </div>
          <HumanReadablePreview value={value} template={template} data-testid={`${testId}-preview`} />
        </div>
      )}

      {useTreeBuilder && template && context && (
        <ExpressionBuilder
          isOpen={isBuilderOpen}
          onOpenChange={setIsBuilderOpen}
          value={value}
          onChange={onChange}
          template={template}
          stepIndex={stepIndex}
          context={context}
          data-testid={`${testId}-builder-modal`}
        />
      )}
    </div>
  )
}
