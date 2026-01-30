/**
 * BuildPlanReview - Component for reviewing and confirming a build plan
 *
 * Shows:
 * - Analysis summary
 * - List of components to be built
 * - Clarifying questions (if any)
 * - Confirm/Cancel actions
 */

import React, { useState, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  cn
} from '@newwork/nw-design-system'
import {
  Monitor,
  Bot,
  Code2,
  Workflow,
  Database,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  type LucideIcon
} from 'lucide-react'
import type { BuildPlan, ComponentType, ClarifyingQuestion } from '../types/orchestrator'

export interface BuildPlanReviewProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onCancel: () => void
  onReanalyze?: (answers: Record<string, string>) => void
  isLoading?: boolean
  'data-testid'?: string
}

// Icon mapping for component types
const typeIcons: Record<ComponentType, LucideIcon> = {
  screen: Monitor,
  agent: Bot,
  function: Code2,
  flow: Workflow,
  data_model: Database
}

// Labels for component types
const typeLabels: Record<ComponentType, string> = {
  screen: 'Screen',
  agent: 'Task Expert',
  function: 'Function',
  flow: 'Flow',
  data_model: 'Data Model'
}

// Complexity badge variants
const complexityVariants: Record<string, 'success' | 'warning' | 'destructive'> = {
  simple: 'success',
  moderate: 'warning',
  complex: 'destructive'
}

/**
 * BuildPlanReview component
 */
export const BuildPlanReview: React.FC<BuildPlanReviewProps> = ({
  plan,
  onConfirm,
  onCancel,
  onReanalyze,
  isLoading = false,
  'data-testid': testId = 'build-plan-review'
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [skippedComponents, setSkippedComponents] = useState<Set<string>>(new Set())

  const hasQuestions = plan.questions && plan.questions.length > 0
  const allQuestionsAnswered = !hasQuestions || plan.questions!.every(q => !q.required || answers[q.id])

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [])

  const toggleComponentSkip = useCallback((componentId: string) => {
    setSkippedComponents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(componentId)) {
        newSet.delete(componentId)
      } else {
        newSet.add(componentId)
      }
      return newSet
    })
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(skippedComponents))
  }, [onConfirm, skippedComponents])

  const handleReanalyze = useCallback(() => {
    onReanalyze?.(answers)
  }, [onReanalyze, answers])

  // Group components by type
  const componentsByType = plan.components.reduce(
    (acc, comp) => {
      if (!acc[comp.type]) acc[comp.type] = []
      acc[comp.type].push(comp)
      return acc
    },
    {} as Record<ComponentType, typeof plan.components>
  )

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-5 gba:h-5 gba:text-info" />
            <CardTitle>Build Plan Analysis</CardTitle>
          </div>
          <CardDescription>{plan.analysis.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {/* Intent and Complexity */}
            <div className="gba:flex gba:items-center gba:gap-4">
              <div>
                <span className="gba:text-sm gba:text-muted-foreground">Goal:</span>
                <p className="gba:text-foreground">{plan.analysis.intent}</p>
              </div>
              <Badge variant={complexityVariants[plan.analysis.complexity] || 'default'}>
                {plan.analysis.complexity} complexity
              </Badge>
            </div>

            {/* Notes */}
            {plan.analysis.notes && plan.analysis.notes.length > 0 && (
              <div className="gba:p-3 gba:bg-muted gba:rounded-lg">
                <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2">Notes:</p>
                <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                  {plan.analysis.notes.map((note, i) => (
                    <li key={i} className="gba:text-sm gba:text-muted-foreground">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Estimated time */}
            <p className="gba:text-sm gba:text-muted-foreground">
              Estimated build time: ~{Math.ceil(plan.estimated_duration_seconds / 60)} minute
              {plan.estimated_duration_seconds > 60 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clarifying Questions */}
      {hasQuestions && (
        <Card>
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-2">
              <AlertCircle className="gba:w-5 gba:h-5 gba:text-warning" />
              <CardTitle>Clarifying Questions</CardTitle>
            </div>
            <CardDescription>Please answer these questions to refine the build plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-6">
              {plan.questions!.map(question => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={answers[question.id] || ''}
                  onChange={value => handleAnswerChange(question.id, value)}
                />
              ))}

              <Button onClick={handleReanalyze} disabled={!allQuestionsAnswered || isLoading}>
                <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                Re-analyze with Answers
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Components to Build */}
      <Card>
        <CardHeader>
          <CardTitle>Components to Build ({plan.components.length})</CardTitle>
          <CardDescription>Review and optionally skip components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {(Object.keys(componentsByType) as ComponentType[]).map(type => (
              <div key={type}>
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  {React.createElement(typeIcons[type], {
                    className: 'gba:w-4 gba:h-4 gba:text-muted-foreground'
                  })}
                  <span className="gba:font-medium gba:text-foreground">{typeLabels[type]}s</span>
                  <Badge variant="secondary">{componentsByType[type].length}</Badge>
                </div>
                <ul className="gba:space-y-2 gba:ml-6">
                  {componentsByType[type].map(comp => (
                    <li key={comp.id} className="gba:flex gba:items-center gba:justify-between">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn('gba:h-6 gba:w-6 gba:p-0', skippedComponents.has(comp.id) && 'gba:opacity-50')}
                          onClick={() => toggleComponentSkip(comp.id)}
                        >
                          <CheckCircle2
                            className={cn(
                              'gba:w-4 gba:h-4',
                              skippedComponents.has(comp.id) ? 'gba:text-muted-foreground' : 'gba:text-success'
                            )}
                          />
                        </Button>
                        <span
                          className={cn(
                            'gba:text-foreground',
                            skippedComponents.has(comp.id) && 'gba:line-through gba:text-muted-foreground'
                          )}
                        >
                          {comp.name}
                        </span>
                      </div>
                      <span className="gba:text-sm gba:text-muted-foreground gba:max-w-xs gba:truncate">
                        {comp.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="gba:flex gba:items-center gba:justify-end gba:gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading || (hasQuestions && !allQuestionsAnswered)}>
          {isLoading ? (
            <>
              <span className="gba:animate-spin gba:mr-2">...</span>
              Building...
            </>
          ) : (
            <>
              <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
              Start Build ({plan.components.length - skippedComponents.size} components)
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Question field component
 */
interface QuestionFieldProps {
  question: ClarifyingQuestion
  value: string
  onChange: (value: string) => void
}

const QuestionField: React.FC<QuestionFieldProps> = ({ question, value, onChange }) => {
  if (question.options && question.options.length > 0) {
    return (
      <div className="gba:space-y-2">
        <Label className="gba:flex gba:items-center gba:gap-1">
          {question.question}
          {question.required && <span className="gba:text-destructive">*</span>}
        </Label>
        {question.context && <p className="gba:text-sm gba:text-muted-foreground">{question.context}</p>}
        <RadioGroup value={value} onValueChange={onChange}>
          {question.options.map((option, i) => (
            <div key={i} className="gba:flex gba:items-center gba:space-x-2">
              <RadioGroupItem value={option} id={`${question.id}-${i}`} />
              <Label htmlFor={`${question.id}-${i}`} className="gba:font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className="gba:space-y-2">
      <Label htmlFor={question.id} className="gba:flex gba:items-center gba:gap-1">
        {question.question}
        {question.required && <span className="gba:text-destructive">*</span>}
      </Label>
      {question.context && <p className="gba:text-sm gba:text-muted-foreground">{question.context}</p>}
      <Input
        id={question.id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter your answer..."
      />
    </div>
  )
}

export default BuildPlanReview
