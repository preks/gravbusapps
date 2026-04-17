import React, { useState, useEffect, useRef } from 'react'
import {
  Input,
  Textarea,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { CheckCircle, AlertCircle, Network, Loader2, Code } from 'lucide-react'
import { FlowTemplate } from '../../types/flowTemplate'
import { ExpressionBuilder } from './ExpressionBuilder'
import { HumanReadablePreview } from './HumanReadablePreview'
import { useExpressionValidator } from '../../hooks/useExpressionValidator'
import { useEntitySchemas } from '../../hooks/useEntitySchemas'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ExpressionInputProps {
  value: string
  onChange: (value: string) => void
  mode?: 'auto' | 'expression' | 'text'
  placeholder?: string
  disabled?: boolean
  validateOnChange?: boolean
  onValidationChange?: (isValid: boolean, message?: string) => void
  template?: FlowTemplate // For tree builder
  stepIndex?: number // For tree builder
  useTreeBuilder?: boolean // Use new tree builder instead of simple helper
  multiline?: boolean // Use textarea instead of input
  rows?: number // Number of rows for textarea (default: 4)
  context?: BusinessAppContextProps // Required for catalog fetching in tree builder
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

  // Extract all expressions
  const expressionRegex = /\{\{(.+?)\}\}/g
  const expressions = value.match(expressionRegex) || []

  // Remove all valid expressions to get the remaining text
  let remainingText = value
  expressions.forEach(expr => {
    remainingText = remainingText.replace(expr, '')
  })

  // Check if remaining text contains suspicious characters
  const suspiciousCharPattern = /[@#$%^&*+={}[\]|<>]/

  if (suspiciousCharPattern.test(remainingText)) {
    const suspiciousChars = remainingText.match(suspiciousCharPattern)
    return {
      isValid: false,
      message: `Invalid character${suspiciousChars && suspiciousChars.length > 1 ? 's' : ''}: ${suspiciousChars?.join(', ')}`
    }
  }

  // Check that all expressions have valid syntax
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
 *
 * Features:
 * - Toggle between plain text and expression mode
 * - Syntax highlighting for {{ }}
 * - Real-time validation
 * - Expression helper button
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
  // Determine if value contains expressions
  const hasExpressions = value.includes('{{') && value.includes('}}')

  // Expression mode state
  const [isExpressionMode, setIsExpressionMode] = useState<boolean>(
    mode === 'expression' || (mode === 'auto' && hasExpressions)
  )

  // Entity schemas for validation
  const { schemas: entitySchemas } = useEntitySchemas({
    includeFields: false,
    enableCache: true
  })

  // Validation state
  const [validationState, setValidationState] = useState<ValidationState>(null)
  const [validationMessage, setValidationMessage] = useState<string>('')
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { validateExpression: validateWithHook } = useExpressionValidator(
    template || ({} as FlowTemplate),
    stepIndex !== undefined ? stepIndex : 0,
    entitySchemas || undefined
  )

  // Update expression mode when value changes (auto mode only)
  useEffect(() => {
    if (mode === 'auto') {
      setIsExpressionMode(hasExpressions)
    }
  }, [hasExpressions, mode])

  // Auto-enable validation when tree builder is available
  // Validate if explicitly enabled OR if tree builder is available (regardless of expression mode)
  const shouldValidate = validateOnChange || (useTreeBuilder && template)

  // Comprehensive validation with backend API
  useEffect(() => {
    if (!shouldValidate) {
      setValidationState(null)
      setValidationMessage('')
      return
    }

    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    // Skip validation if empty
    if (!value.trim()) {
      setValidationState(null)
      setValidationMessage('')
      onValidationChange?.(true)
      return
    }

    // Skip validation if no expressions detected (plain text doesn't need validation indicator)
    if (!hasExpressions) {
      setValidationState(null)
      setValidationMessage('')
      onValidationChange?.(true)
      return
    }

    // Set pending state immediately
    setValidationState('pending')

    // Debounce validation call (500ms)
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        // First do strict client-side validation
        const strictValidation = validateExpressionStrict(value)

        if (!strictValidation.isValid) {
          setValidationState('invalid')
          setValidationMessage(strictValidation.message || 'Invalid expression')
          onValidationChange?.(false, strictValidation.message)
          return
        }

        // Then do template-aware validation (if template provided)
        if (template) {
          const templateValidation = await validateWithHook(value)

          if (!templateValidation.isValid) {
            setValidationState('invalid')
            setValidationMessage(templateValidation.message || 'Invalid expression')
            onValidationChange?.(false, templateValidation.message)
            return
          }

          // Call backend API for thorough validation
          const apiUrl = CUSTOM_FLOW_ENGINE_API_URL

          // Create validation template with the expression to validate
          // Preserve ALL steps with their form fields for cross-step validation
          // Note: Only inject expression into title/message to avoid false positives
          // from type mismatches in unrelated form fields
          const validationTemplate = {
            ...template,
            name: template.name || '__validation_test__',
            description: template.description || 'Test template for expression validation',
            steps: template.steps.map(
              (step, idx) =>
                idx === stepIndex
                  ? {
                      ...step,
                      title: value, // Replace title with expression being tested
                      message: value // Also test in message
                      // Keep form fields unchanged - do NOT inject expression into all fields
                      // as it would cause false positive type mismatch errors
                    }
                  : step // Keep other steps unchanged for reference validation
            )
          }

          const response = await fetch(`${apiUrl}/templates/validate-expressions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ template: validationTemplate })
          })

          if (!response.ok) {
            setValidationState('warning')
            setValidationMessage('Validation service unavailable')
            onValidationChange?.(true) // Consider valid if service is down
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
          // No template provided, just use strict validation
          setValidationState('valid')
          setValidationMessage('')
          onValidationChange?.(true)
        }
      } catch (error) {
        console.error('Expression validation error:', error)
        setValidationState('warning')
        setValidationMessage('Validation failed')
        onValidationChange?.(true) // Consider valid if validation fails
      }
    }, 500)

    // Cleanup
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [value, shouldValidate, hasExpressions, entitySchemas])

  // Get validation badge
  const getValidationBadge = () => {
    // Show badge only when validation is active AND there are expressions
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
              onChange={e => onChange(e.target.value)}
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
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder || 'Enter value'}
              disabled={disabled}
              className={isExpressionMode ? 'gba:bg-purple-50 gba:border-purple-300' : ''}
              data-testid={`${testId}-input`}
            />
          )}

          {/* Inline validation badge */}
          {getValidationBadge() && (
            <div className={`gba:absolute gba:right-2 ${multiline ? 'gba:top-2' : 'gba:top-1/2 gba:-translate-y-1/2'}`}>
              {getValidationBadge()}
            </div>
          )}
        </div>

        {/* Builder button - Always show when useTreeBuilder is enabled */}
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

      {/* Mode indicator */}
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

      {/* Human-readable preview for expressions */}
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

      {/* Expression Builder */}
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
