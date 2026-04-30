import React, { useCallback, useState } from 'react'
import { Accordion, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowTemplateStore } from '@/common/data/flow/hooks/useFlowTemplateStore'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AgentConfiguration } from './AgentConfiguration'
import { AssignmentContent } from './AssignmentConfiguration'
import { BasicConfiguration } from './BasicConfiguration'
import { EventSubscriptionsConfiguration } from './EventSubscriptionsConfiguration'
import { FunctionConfiguration } from './FunctionConfiguration'
import { InputFieldsContent } from './InputFieldsConfiguration'
import { LinksContent } from './LinksConfiguration'

interface StepItemProps {
  step: any
  stepIndex: number
  accessToken?: string
  context?: BusinessAppContextProps
  'data-testid'?: string
}

export const StepItem: React.FC<StepItemProps> = ({
  step,
  stepIndex,
  accessToken,
  context,
  'data-testid': testId = 'step-item'
}) => {
  const [isExpanded, setIsExpanded] = useState(stepIndex === 0)
  const { removeStep, updateStep } = useFlowTemplateStore()

  const normalizedStep = {
    id: step?.id || `step-${stepIndex}`,
    title: step?.title || `Step ${stepIndex + 1}`,
    message: step?.message || '',
    type: step?.type || 'task',
    inputs: step?.inputs || step?.form || [],
    form: step?.form || step?.inputs || [],
    links: step?.links || [],
    assignment: step?.assignment || null,
    dueInMinutes: step?.dueInMinutes || undefined,
    ...step
  }

  const handleRemoveStep = useCallback(() => {
    removeStep(stepIndex)
  }, [removeStep, stepIndex])

  const handleUpdateStep = useCallback(
    (updates: any) => {
      updateStep(stepIndex, updates)
    },
    [updateStep, stepIndex]
  )

  return (
    <Card className="gba:w-full gba:mb-4 gba:border gba:rounded-lg gba:shadow-sm" data-testid={testId}>
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(previous => !previous)}
              className="gba:p-1"
              data-testid={`${testId}-toggle`}
            >
              {isExpanded ? <ChevronDown className="gba:h-4 gba:w-4" /> : <ChevronUp className="gba:h-4 gba:w-4" />}
            </Button>
            <CardTitle className="gba:text-lg gba:font-medium gba:text-gray-800 gba:flex-1">
              {normalizedStep.title ||
                `${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${stepIndex + 1}`}
            </CardTitle>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-500 gba:capitalize">{normalizedStep.type || 'task'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveStep}
              className="gba:text-red-500 gba:hover:text-red-700 gba:hover:bg-red-50"
              data-testid={`${testId}-remove`}
            >
              <Trash2 className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="gba:pt-0">
          <div className="gba:space-y-4">
            {normalizedStep && normalizedStep.id ? (
              <Accordion
                type="multiple"
                defaultValue={['basic']}
                className="gba:w-full"
                data-testid={`${testId}-accordion-${stepIndex}`}
                items={[
                  {
                    id: 'basic',
                    title: getTranslationFromI18nKeyAndLabel('flow.creator.basic', 'Basic Configuration'),
                    content: (
                      <BasicConfiguration
                        step={normalizedStep}
                        stepIndex={stepIndex}
                        testId={testId}
                        onUpdateStep={handleUpdateStep}
                      />
                    )
                  },
                  ...(normalizedStep.type === FlowStepType.FUNCTION
                    ? [
                        {
                          id: 'function-config',
                          title: getTranslationFromI18nKeyAndLabel(
                            'flow.creator.functionConfig',
                            'Function Configuration'
                          ),
                          badgeText: normalizedStep.functionConfig?.functionId
                            ? getTranslationFromI18nKeyAndLabel('flow.creator.configured', 'Configured')
                            : undefined,
                          badgeVariant: normalizedStep.functionConfig?.functionId ? 'success' : undefined,
                          content: (
                            <FunctionConfiguration
                              step={normalizedStep}
                              stepIndex={stepIndex}
                              testId={testId}
                              onUpdateStep={handleUpdateStep}
                              accessToken={accessToken}
                            />
                          )
                        }
                      ]
                    : []),
                  ...(normalizedStep.type === FlowStepType.AGENT
                    ? [
                        {
                          id: 'agent-config',
                          title: getTranslationFromI18nKeyAndLabel('flow.creator.agentConfig', 'Agent Configuration'),
                          badgeText: normalizedStep.agentConfig?.promptId
                            ? getTranslationFromI18nKeyAndLabel('flow.creator.configured', 'Configured')
                            : undefined,
                          badgeVariant: normalizedStep.agentConfig?.promptId ? 'success' : undefined,
                          content: accessToken ? (
                            <AgentConfiguration
                              step={normalizedStep}
                              stepIndex={stepIndex}
                              testId={testId}
                              onUpdateStep={handleUpdateStep}
                              accessToken={accessToken}
                            />
                          ) : (
                            <div className="gba:text-center gba:text-muted-foreground gba:p-4">
                              Access token required for agent configuration
                            </div>
                          )
                        }
                      ]
                    : []),
                  {
                    id: 'links',
                    title: getTranslationFromI18nKeyAndLabel('flow.creator.links', 'Links'),
                    badgeText:
                      normalizedStep.links && normalizedStep.links.length > 0
                        ? `${normalizedStep.links.length}`
                        : undefined,
                    content: (
                      <LinksContent
                        step={normalizedStep}
                        stepIndex={stepIndex}
                        testId={testId}
                        onUpdateStep={handleUpdateStep}
                      />
                    )
                  },
                  ...(normalizedStep.type !== FlowStepType.FUNCTION && normalizedStep.type !== FlowStepType.AGENT
                    ? [
                        {
                          id: 'inputs',
                          title: getTranslationFromI18nKeyAndLabel('flow.creator.inputFields', 'Input Fields'),
                          badgeText:
                            normalizedStep.inputs && normalizedStep.inputs.length > 0
                              ? `${normalizedStep.inputs.length}`
                              : undefined,
                          content: (
                            <InputFieldsContent
                              step={normalizedStep}
                              stepIndex={stepIndex}
                              context={context}
                              testId={testId}
                              onUpdateStep={handleUpdateStep}
                            />
                          )
                        }
                      ]
                    : []),
                  {
                    id: 'assignment',
                    title: getTranslationFromI18nKeyAndLabel('flow.creator.assignment', 'Assignment'),
                    badgeText: normalizedStep.assignment
                      ? getTranslationFromI18nKeyAndLabel('flow.creator.configured', 'Configured')
                      : undefined,
                    badgeVariant: normalizedStep.assignment ? 'success' : undefined,
                    content: <AssignmentContent step={normalizedStep} testId={testId} onUpdateStep={handleUpdateStep} />
                  },
                  ...(normalizedStep.type === FlowStepType.TASK ||
                  normalizedStep.type === FlowStepType.APPROVAL ||
                  normalizedStep.type === FlowStepType.INFORMATION ||
                  normalizedStep.type === FlowStepType.ACKNOWLEDGE
                    ? [
                        {
                          id: 'event-subscriptions',
                          title: getTranslationFromI18nKeyAndLabel(
                            'flow.creator.eventSubscriptions',
                            'Event Subscriptions'
                          ),
                          badgeText:
                            normalizedStep.eventSubscriptions && normalizedStep.eventSubscriptions.length > 0
                              ? `${normalizedStep.eventSubscriptions.length}`
                              : undefined,
                          content: accessToken ? (
                            <EventSubscriptionsConfiguration
                              subscriptions={normalizedStep.eventSubscriptions || []}
                              onUpdate={subscriptions => handleUpdateStep({ eventSubscriptions: subscriptions })}
                              stepIndex={stepIndex}
                              testId={testId}
                              accessToken={accessToken}
                            />
                          ) : (
                            <div className="gba:text-center gba:text-muted-foreground gba:p-4">
                              Access token required for event subscriptions
                            </div>
                          )
                        }
                      ]
                    : [])
                ]}
              />
            ) : (
              <div className="gba:text-center gba:text-gray-500 gba:p-4">Loading step configuration...</div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
