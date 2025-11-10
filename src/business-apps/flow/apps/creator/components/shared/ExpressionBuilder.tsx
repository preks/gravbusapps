import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Badge,
  ToggleGroup,
  ToggleGroupItem,
  Separator,
  Card,
  CardContent,
  CardHeader
} from '@newwork/nw-design-system'
import { Network, Type, CheckCircle, AlertCircle, Copy, X, Loader2 } from 'lucide-react'
import { FlowTemplate } from '../../types/flowTemplate'
import { TreeNode as TreeNodeType } from '../../types/expressionTree'
import { TreeNavigator } from './TreeNavigator'
import { QuickActions } from './QuickActions'
import { buildExpressionTree, pathToExpression } from '../../utils/expressionTreeBuilder'
import { useExpressionValidator } from '../../hooks/useExpressionValidator'
import { env } from '@/common/env/EnvUtils'

interface ExpressionBuilderProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  template: FlowTemplate
  stepIndex: number
  'data-testid'?: string
}

/**
 * Strict client-side validation for expression builder
 * Checks for common errors like invalid text outside expressions
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
  // Allow: letters, numbers, spaces, basic punctuation (. , ! ? : ; - _ / \)
  // Disallow: @ # $ % ^ & * ( ) + = { } [ ] | < >
  const suspiciousCharPattern = /[@#$%^&*+={}[\]|<>]/

  if (suspiciousCharPattern.test(remainingText)) {
    const suspiciousChars = remainingText.match(suspiciousCharPattern)
    return {
      isValid: false,
      message: `Invalid character${suspiciousChars && suspiciousChars.length > 1 ? 's' : ''} outside expression: ${suspiciousChars?.join(', ')}`
    }
  }

  // Check that all expressions have valid syntax
  if (expressions.length === 0 && value.includes('{{')) {
    return {
      isValid: false,
      message: 'Incomplete expression - missing closing }}'
    }
  }

  if (expressions.length === 0 && value.includes('}}')) {
    return {
      isValid: false,
      message: 'Incomplete expression - missing opening {{'
    }
  }

  return { isValid: true }
}

/**
 * ExpressionBuilder - Hybrid tree + text expression builder
 *
 * Features:
 * - Tree mode: Visual navigation through available data
 * - Text mode: Manual expression editing with documentation
 * - Quick actions: Common patterns and field suggestions
 * - Real-time expression building
 */
export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  isOpen,
  onOpenChange,
  value,
  onChange,
  template,
  stepIndex,
  'data-testid': testId = 'expression-builder'
}) => {
  const [mode, setMode] = useState<'tree' | 'text'>('tree')
  const [localValue, setLocalValue] = useState(value)
  const [recentExpressions, setRecentExpressions] = useState<string[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = useState<number>(0)

  // Validation state
  const { validateExpression } = useExpressionValidator()
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message?: string } | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced validation effect with backend API call
  useEffect(() => {
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    // Skip validation if empty
    if (!localValue.trim()) {
      setValidationResult({ isValid: true })
      return
    }

    // Set validating state immediately
    setValidationResult(null)

    // Debounce validation call (500ms)
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        // First do strict client-side validation
        const clientValidation = validateExpressionStrict(localValue)

        if (!clientValidation.isValid) {
          setValidationResult(clientValidation)
          return
        }

        // Then do template-aware validation
        const templateValidation = await validateExpression(localValue, template)

        if (!templateValidation.isValid) {
          setValidationResult(templateValidation)
          return
        }

        // Then call backend API for thorough validation
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'http://localhost:3001'

        // Create a complete template with ALL steps for cross-step validation
        const testTemplate = {
          ...template,
          name: template.name || '__validation_test__',
          description: template.description || 'Test template for expression validation',
          steps: template.steps.map(
            (step: any, idx: number) =>
              idx === stepIndex
                ? {
                    ...step,
                    title: localValue, // Test the expression in the current step
                    message: localValue,
                    form: step.form || [] // Preserve form fields
                  }
                : step // Keep other steps unchanged for cross-step validation
          )
        }

        const response = await fetch(`${apiUrl}/api/templates/validate-expressions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ template: testTemplate })
        })

        if (!response.ok) {
          setValidationResult({
            isValid: false,
            message: 'Validation service unavailable'
          })
          return
        }

        const result = await response.json()

        if (result.isValid) {
          setValidationResult({ isValid: true })
        } else {
          // Extract most relevant error message
          const errorMessage = result.errors && result.errors.length > 0 ? result.errors[0] : 'Invalid expression'
          setValidationResult({
            isValid: false,
            message: errorMessage
          })
        }
      } catch (error) {
        console.error('Expression validation error:', error)
        setValidationResult({
          isValid: false,
          message: 'Failed to validate expression'
        })
      }
    }, 500)

    // Cleanup
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [localValue, template, stepIndex, validateExpression])

  // Track cursor position
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value)
    setCursorPosition(e.target.selectionStart || 0)
  }

  const handleInputClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart || 0)
  }

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart || 0)
  }

  // Build tree structure
  const treeData = buildExpressionTree(template, stepIndex)

  /**
   * Insert expression at current cursor position
   */
  const insertAtCursor = (textToInsert: string) => {
    const currentValue = localValue
    const position = inputRef.current?.selectionStart || cursorPosition || currentValue.length

    // Insert at cursor position
    const newValue = currentValue.slice(0, position) + textToInsert + currentValue.slice(position)
    setLocalValue(newValue)

    // Update cursor position to end of inserted text
    const newCursorPosition = position + textToInsert.length
    setCursorPosition(newCursorPosition)

    // Focus input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 0)
  }

  const handleNodeSelect = (node: TreeNodeType) => {
    if (node.type === 'field') {
      // Build expression from path
      const expression = pathToExpression(node.path)
      insertAtCursor(expression)
    }
  }

  const handleInsert = (expression: string) => {
    insertAtCursor(expression)
  }

  const handleApply = () => {
    onChange(localValue)

    // Add to recent expressions
    if (localValue && !recentExpressions.includes(localValue)) {
      setRecentExpressions(prev => [localValue, ...prev].slice(0, 5))
    }

    onOpenChange(false)
  }

  const handleClear = () => {
    setLocalValue('')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(localValue)
  }

  // Determine if expression is valid for "Insert" button
  const isValid = validationResult?.isValid ?? false

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="nw:sm:max-w-[1280px] nw:max-h-[90vh] nw:flex nw:flex-col"
        style={{ width: '90vw' }}
        data-testid={testId}
      >
        {/* Sticky Header */}
        <DialogHeader className="nw:flex-shrink-0">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Network className="gba:h-5 gba:w-5" />
            Expression Builder
          </DialogTitle>
          <DialogDescription>
            Build expressions visually by clicking through the tree, or switch to text mode to type manually.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="nw:flex-1 nw:overflow-y-auto nw:px-6">
          <div className="gba:space-y-4 gba:py-2">
            {/* Mode toggle */}
            <div className="gba:flex gba:items-center gba:justify-between">
              <ToggleGroup type="single" value={mode} onValueChange={val => val && setMode(val as 'tree' | 'text')}>
                <ToggleGroupItem
                  value="tree"
                  aria-label="Tree mode"
                  className="gba:gap-2 gba:px-6 gba:py-2"
                  data-testid={`${testId}-mode-tree`}
                >
                  <Network className="gba:h-4 gba:w-4" />
                  Tree Builder
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="text"
                  aria-label="Text mode"
                  className="gba:gap-2 gba:px-6 gba:py-2"
                  data-testid={`${testId}-mode-text`}
                >
                  <Type className="gba:h-4 gba:w-4" />
                  Manual
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="gba:flex gba:items-center gba:gap-2">
                {!localValue.trim() ? (
                  <Badge variant="secondary" className="gba:text-xs">
                    Empty
                  </Badge>
                ) : validationResult === null ? (
                  <Badge variant="secondary" className="gba:text-xs">
                    <Loader2 className="gba:h-3 gba:w-3 gba:mr-1 gba:animate-spin" />
                    Validating...
                  </Badge>
                ) : validationResult.isValid ? (
                  <Badge variant="default" className="gba:bg-green-100 gba:text-green-800 gba:text-xs">
                    <CheckCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gba:text-xs" title={validationResult.message}>
                    <AlertCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                    {validationResult.message || 'Invalid'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Expression input */}
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:justify-between">
                <label className="gba:text-sm gba:font-medium">Current Expression</label>
                <Button variant="ghost" size="sm" onClick={handleCopy} data-testid={`${testId}-copy`}>
                  <Copy className="gba:h-3 gba:w-3 gba:mr-1" />
                  Copy
                </Button>
              </div>
              <div className="gba:space-y-1">
                <div className="gba:relative">
                  <Textarea
                    ref={inputRef}
                    value={localValue}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onKeyUp={handleInputKeyUp}
                    placeholder="Click fields in the tree to build expression..."
                    rows={4}
                    className={`gba:min-h-0 gba:font-mono gba:text-sm gba:bg-purple-50 gba:pr-10 gba:resize-y ${
                      validationResult && !validationResult.isValid ? 'gba:border-red-500' : ''
                    }`}
                    data-testid={`${testId}-input`}
                  />
                  {localValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocalValue('')}
                      className="gba:absolute gba:right-1 gba:top-2 gba:h-7 gba:w-7 gba:p-0 hover:gba:bg-gray-200"
                      data-testid={`${testId}-clear-input`}
                    >
                      <X className="gba:h-4 gba:w-4 gba:text-gray-500" />
                    </Button>
                  )}
                </div>
                {/* Validation messages */}
                {validationResult && !validationResult.isValid && validationResult.message && (
                  <div
                    className="gba:flex gba:items-start gba:gap-1.5 gba:text-xs gba:text-red-600"
                    data-testid={`${testId}-error`}
                  >
                    <AlertCircle className="gba:h-3 gba:w-3 gba:mt-0.5 gba:shrink-0" />
                    <span>{validationResult.message}</span>
                  </div>
                )}
                {validationResult && validationResult.isValid && localValue.trim() && (
                  <div className="gba:text-xs gba:text-gray-500">
                    Note: Field names are validated at runtime when the workflow executes
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Content area - changes based on mode */}
            {mode === 'tree' ? (
              <div className="gba:grid gba:grid-cols-2 gba:gap-4" style={{ minHeight: '400px' }}>
                {/* Left: Tree Navigator */}
                <TreeNavigator nodes={treeData} onSelect={handleNodeSelect} data-testid={`${testId}-navigator`} />

                {/* Right: Quick Actions */}
                <QuickActions
                  template={template}
                  stepIndex={stepIndex}
                  onInsert={handleInsert}
                  recentExpressions={recentExpressions}
                  data-testid={`${testId}-actions`}
                />
              </div>
            ) : (
              /* Text mode - Documentation */
              <div>
                <Card>
                  <CardHeader>
                    <h3 className="gba:text-lg gba:font-semibold">Expression Syntax Reference</h3>
                    <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
                      Use expressions to dynamically reference workflow data, previous steps, and external sources.
                    </p>
                  </CardHeader>
                  <CardContent className="gba:space-y-6 gba:text-sm">
                    {/* Workflow Data Section */}
                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Workflow Data</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Access information about the current workflow execution
                      </p>
                      <div className="gba:space-y-2">
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.initiator}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → User name who started the workflow
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.name}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Name of the workflow
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.workflowId}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Unique workflow instance ID
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.status}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Current workflow status
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.correlationId}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → External correlation ID
                          </span>
                        </code>
                      </div>
                    </div>

                    {/* Previous Steps Section */}
                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Previous Step Data</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Reference form data and metadata from previous workflow steps
                      </p>
                      <div className="gba:space-y-2">
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.formData.fieldName}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Form field value from step 0
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.status}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Execution status of step 0
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.executedBy}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → User who completed step 0
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.timestamp}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → When step 0 was completed
                          </span>
                        </code>
                      </div>
                    </div>

                    {/* Mixed Text Section */}
                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Mixed Text & Expressions</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Combine static text with dynamic expressions
                      </p>
                      <div className="gba:space-y-2">
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'Hello {{$workflow.initiator}}, welcome!'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Personalized greeting
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'Request from {{$steps.step_0.formData.requester}} is ready'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Dynamic message with form data
                          </span>
                        </code>
                      </div>
                    </div>

                    {/* Future Features Section */}
                    <div className="gba:border-t gba:pt-4">
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base gba:text-gray-500">Coming Soon</h4>
                      <p className="gba:text-xs gba:text-gray-500 gba:mb-3 gba:italic">
                        These features are planned for future releases
                      </p>
                      <div className="gba:space-y-3 gba:opacity-50">
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm">Catalog Data</h5>
                          <code className="gba:block gba:p-2 gba:bg-gray-50 gba:rounded gba:text-xs">
                            {'{{$catalog.asset-management[0].name}}'}
                            <br />
                            {'{{$catalog.employees[emp-001].email}}'}
                          </code>
                        </div>
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm">Entity References</h5>
                          <code className="gba:block gba:p-2 gba:bg-gray-50 gba:rounded gba:text-xs">
                            {'{{$entity.ticket.TKT-123.subject}}'}
                            <br />
                            {'{{$entity.employee.{{$workflow.initiator}}.email}}'}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Tips Section */}
                    <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:p-4">
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-sm gba:text-blue-900">💡 Tips</h4>
                      <ul className="gba:space-y-1 gba:text-xs gba:text-blue-800">
                        <li>
                          • Use the <strong>Tree Builder</strong> tab to explore available fields visually
                        </li>
                        <li>• Expressions are validated in real-time as you type</li>
                        <li>• Field names are verified when the workflow executes</li>
                        <li>• Combine multiple expressions in a single text field</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="nw:flex-shrink-0 nw:border-t nw:pt-4">
          <Button variant="outline" onClick={handleClear} data-testid={`${testId}-clear`}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!isValid || !localValue.trim() || validationResult === null}
            data-testid={`${testId}-insert`}
          >
            Insert Expression
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
