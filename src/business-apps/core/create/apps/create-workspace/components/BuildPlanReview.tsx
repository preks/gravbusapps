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
import { Button, Input, Label, RadioGroup, RadioGroupItem, cn } from '@newwork/nw-design-system'
import { Monitor, Bot, Code2, Workflow, Database, CheckCircle2, Edit2, type LucideIcon } from 'lucide-react'
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

  const handleEditComponent = useCallback((componentId: string) => {
    // TODO: Implement when backend supports plan editing
    console.log('Edit component:', componentId)
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
      {/* Summary Header - Compact single line */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pb-6 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-baseline gba:gap-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">Build Plan</h2>
          <span className="gba:text-sm gba:text-muted-foreground">
            {plan.components.length} component{plan.components.length !== 1 ? 's' : ''}
          </span>
          <span className="gba:text-sm gba:text-muted-foreground">•</span>
          <span className="gba:text-sm gba:text-muted-foreground">
            ~{Math.ceil(plan.estimated_duration_seconds / 60)} min
          </span>
          <span className="gba:text-sm gba:text-muted-foreground">•</span>
          <span className="gba:text-sm gba:text-muted-foreground">{plan.analysis.complexity}</span>
        </div>

        {/* Edit Plan button - Coming soon */}
        <Button variant="outline" size="sm" disabled title="Coming soon - Plan editing" className="gba:text-xs">
          <Edit2 className="gba:w-3 gba:h-3 gba:mr-1.5" />
          Edit Plan
        </Button>
      </div>

      {/* Goal - Clean and minimal */}
      <div className="gba:space-y-2">
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">Goal</h3>
        <p className="gba:text-base gba:text-foreground gba:leading-relaxed">{plan.analysis.intent}</p>
      </div>

      {/* Notes - Only if present */}
      {plan.analysis.notes && plan.analysis.notes.length > 0 && (
        <div className="gba:space-y-2">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
            Notes
          </h3>
          <ul className="gba:space-y-1">
            {plan.analysis.notes.map((note, i) => (
              <li key={i} className="gba:text-sm gba:text-muted-foreground gba:flex gba:gap-2">
                <span className="gba:text-muted-foreground">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarifying Questions - Minimal */}
      {hasQuestions && (
        <div className="gba:space-y-4 gba:py-6 gba:border-t gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              Clarifying Questions
            </h3>
            <span className="gba:text-xs gba:text-muted-foreground">Required before building</span>
          </div>
          <div className="gba:space-y-4">
            {plan.questions!.map(question => (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id] || ''}
                onChange={value => handleAnswerChange(question.id, value)}
              />
            ))}
            <Button onClick={handleReanalyze} disabled={!allQuestionsAnswered || isLoading} variant="outline">
              Re-analyze with Answers
            </Button>
          </div>
        </div>
      )}

      {/* Components - Flat list, more scannable */}
      <div className="gba:space-y-6 gba:pt-2">
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
          Components ({plan.components.length})
        </h3>

        <div className="gba:space-y-6">
          {(Object.keys(componentsByType) as ComponentType[]).map(type => (
            <div key={type} className="gba:space-y-3">
              {/* Type header */}
              <div className="gba:flex gba:items-center gba:gap-2">
                {React.createElement(typeIcons[type], {
                  className: 'gba:w-4 gba:h-4 gba:text-muted-foreground'
                })}
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{typeLabels[type]}s</span>
                <span className="gba:text-xs gba:text-muted-foreground">({componentsByType[type].length})</span>
              </div>

              {/* Components list - cleaner */}
              <div className="gba:space-y-2 gba:pl-6">
                {componentsByType[type].map(comp => (
                  <div
                    key={comp.id}
                    className={cn(
                      'gba:flex gba:items-start gba:gap-3 gba:py-2 gba:group gba:relative',
                      skippedComponents.has(comp.id) && 'gba:opacity-40'
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className="gba:mt-0.5 gba:shrink-0 gba:cursor-pointer"
                      onClick={() => toggleComponentSkip(comp.id)}
                    >
                      <CheckCircle2
                        className={cn(
                          'gba:w-4 gba:h-4 gba:transition-colors',
                          skippedComponents.has(comp.id)
                            ? 'gba:text-muted-foreground'
                            : 'gba:text-foreground group-hover:gba:text-foreground/70'
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="gba:flex-1 gba:min-w-0">
                      <div
                        className={cn(
                          'gba:text-sm gba:font-medium gba:text-foreground gba:mb-0.5',
                          skippedComponents.has(comp.id) && 'gba:line-through'
                        )}
                      >
                        {comp.name}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">
                        {comp.description}
                      </div>
                    </div>

                    {/* Edit button - appears on hover */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-7 gba:px-2 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                      onClick={e => {
                        e.stopPropagation()
                        handleEditComponent(comp.id)
                      }}
                      disabled
                      title="Coming soon - Plan editing"
                    >
                      <Edit2 className="gba:w-3 gba:h-3 gba:mr-1" />
                      <span className="gba:text-xs">Edit</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions - Sticky bottom bar */}
      <div className="gba:sticky gba:bottom-0 gba:left-0 gba:right-0 gba:flex gba:items-center gba:justify-between gba:pt-6 gba:pb-2 gba:bg-background gba:border-t gba:border-border gba:mt-8">
        <div className="gba:text-sm gba:text-muted-foreground">
          {plan.components.length - skippedComponents.size} of {plan.components.length} components selected
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={isLoading || (hasQuestions && !allQuestionsAnswered)}
            className="gba:min-w-[180px]"
          >
            {isLoading ? (
              <>
                <span className="gba:animate-spin gba:mr-2">...</span>
                Building...
              </>
            ) : (
              <>Start Build</>
            )}
          </Button>
        </div>
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
