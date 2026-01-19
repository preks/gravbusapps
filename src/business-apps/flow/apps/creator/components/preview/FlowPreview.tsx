import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { FlowStepType, FlowStep } from '../../types/flowTemplate'

/**
 * Visual representation of the workflow as a flowchart
 */
export const FlowPreview: React.FC = () => {
  const { flowTemplate } = useFlowTemplateStore()
  const { steps } = flowTemplate

  return (
    <div className="gba:border gba:border-gray-200 gba:rounded gba:p-4 gba:bg-white" data-testid="flow-preview">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4" data-testid="flow-preview-header">
        <h3 className="gba:font-medium" data-testid="flow-preview-title">
          {getTranslationFromI18nKeyAndLabel('flow.creator.flowPreview', 'Flow Preview')}
        </h3>
      </div>

      {steps.length === 0 ? (
        <div className="gba:text-center gba:text-gray-500 gba:p-6" data-testid="flow-preview-empty">
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.noStepsToPreview',
            'No steps added yet. Add steps to see the flow preview.'
          )}
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4" data-testid="flow-preview-diagram">
          {/* Sequential Layout - Steps in vertical flow */}
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
            <div className="gba:text-sm gba:text-gray-600 gba:mb-2" data-testid="sequential-layout-label">
              {getTranslationFromI18nKeyAndLabel('flow.creator.stepsExecuteInOrder', 'Steps execute one after another')}
            </div>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Node */}
                {renderStepWithAssignment(step, index, false, 'flow-preview')}

                {/* Arrow connecting to next step */}
                {index < steps.length - 1 && (
                  <div
                    className="gba:h-6 gba:flex gba:items-center gba:justify-center"
                    data-testid={`flow-preview-arrow-${index}`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 4L12 20M12 20L18 14M12 20L6 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Returns the appropriate color class based on the step type
 */
function getFlowStepTypeColor(type: FlowStepType): string {
  switch (type) {
    case FlowStepType.TASK:
      return 'gba:bg-blue-50 gba:border-blue-200 gba:text-blue-500'
    case FlowStepType.APPROVAL:
      return 'gba:bg-green-50 gba:border-green-200 gba:text-green-500'
    case FlowStepType.ACKNOWLEDGE:
      return 'gba:bg-purple-50 gba:border-purple-200 gba:text-purple-500'
    case FlowStepType.INFORMATION:
      return 'gba:bg-amber-50 gba:border-amber-200 gba:text-amber-500'
    default:
      return 'gba:bg-gray-50 gba:border-gray-200 gba:text-gray-700'
  }
}

/**
 * Capitalizes the first letter of a string
 */
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * Renders step with assignment visualization
 */
function renderStepWithAssignment(step: FlowStep, index: number, isParallel: boolean, testId: string): JSX.Element {
  const hasAssignment = step.assignment && step.assignment.targets && step.assignment.targets.length > 0
  const isAssignMode = step.assignment?.assignmentMode === 'ASSIGN'
  const hasGroupAssignments =
    hasAssignment &&
    step.assignment?.targets?.some(
      target =>
        (target.organizationalUnits && target.organizationalUnits.length > 0) ||
        (target.matrixTeams && target.matrixTeams.length > 0) ||
        (target.companies && target.companies.length > 0) ||
        (target.capabilities && target.capabilities.length > 0)
    )

  // If assignmentMode is ASSIGN, show multiple task generation visualization
  if (isAssignMode) {
    return (
      <div
        key={step.id}
        className="gba:flex gba:flex-col gba:items-center gba:gap-2"
        data-testid={`${testId}-step-${index}-multiple`}
      >
        <div className="gba:text-xs gba:text-gray-500 gba:mb-1">
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.multipleTasksWillBeGenerated',
            'Multiple individual tasks will be generated'
          )}
        </div>

        {/* Multiple task boxes arranged in a grid */}
        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-2 gba:max-w-xs">
          {/* Generate multiple task boxes */}
          {Array.from({ length: 6 }, (_, taskIndex) => (
            <div
              key={`${step.id}-task-${taskIndex}`}
              className={`gba:w-16 gba:h-12 gba:border gba:rounded gba:text-center gba:relative gba:text-xs gba:flex gba:flex-col gba:justify-center
                         ${getFlowStepTypeColor(step.type)}`}
              data-testid={`${testId}-step-${index}-task-${taskIndex}`}
            >
              <div
                className={`gba:absolute gba:-top-1 gba:-left-1 gba:w-3 gba:h-3 gba:text-white gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold ${isParallel ? 'gba:bg-purple-500' : 'gba:bg-blue-500'}`}
              >
                {index + 1}
              </div>
              <div className="gba:font-medium gba:text-xs gba:truncate gba:px-1">
                {step.title || `Step ${index + 1}`}
              </div>
            </div>
          ))}

          {/* "..." indicator for more tasks */}
          <div className="gba:w-16 gba:h-12 gba:border gba:border-dashed gba:border-gray-300 gba:rounded gba:flex gba:items-center gba:justify-center gba:text-gray-400 gba:text-xs">
            ...
          </div>
        </div>
      </div>
    )
  }

  // Standard single task rendering
  return (
    <div
      key={step.id}
      className={`${isParallel ? 'gba:w-48' : 'gba:w-64'} gba:p-3 gba:border gba:rounded gba:text-center gba:relative
                  ${getFlowStepTypeColor(step.type)}`}
      data-testid={`${testId}-step-${index}`}
    >
      <div
        className={`gba:absolute gba:-top-2 gba:-left-2 gba:w-6 gba:h-6 gba:text-white gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold ${isParallel ? 'gba:bg-purple-500' : 'gba:bg-blue-500'}`}
      >
        {index + 1}
      </div>
      <div className="gba:font-medium gba:text-sm">{step.title || `Step ${index + 1}`}</div>
      <div className="gba:text-xs gba:mt-1">{capitalizeFirstLetter(step.type)}</div>
      {hasAssignment && (
        <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
          {isAssignMode
            ? getTranslationFromI18nKeyAndLabel('flow.creator.assignedTasks', 'Individual assigned tasks')
            : getTranslationFromI18nKeyAndLabel('flow.creator.sharedTask', 'Shared task (claim mode)')}
        </div>
      )}
    </div>
  )
}
