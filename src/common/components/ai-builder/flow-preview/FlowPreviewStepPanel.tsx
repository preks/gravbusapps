import React from 'react'
import { Button, Badge, ScrollArea } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import type { FlowPreviewStep } from './flowPreviewTypes'

function inputTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    TEXT: 'Text',
    TEXTAREA: 'Long text',
    SELECT: 'Single choice',
    MULTISELECT: 'Multiple choice',
    CHECKBOX: 'Yes/No',
    RADIO: 'Single choice',
    DATE: 'Date',
    DATETIME: 'Date and time',
    NUMBER: 'Number',
    FILE: 'File',
    SIGNATURE: 'Signature',
    default: 'Field'
  }
  return labels[t] ?? labels.default
}

function assignmentModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    CLAIM: 'Claim (anyone can take)',
    ASSIGN: 'Assigned to specific people',
    ASSIGN_DEFERRED: 'Assigned later',
    default: mode
  }
  return labels[mode] ?? labels.default
}

export interface FlowPreviewStepPanelProps {
  step: FlowPreviewStep
  index: number
  onClose: () => void
  'data-testid'?: string
}

export const FlowPreviewStepPanel: React.FC<FlowPreviewStepPanelProps> = ({
  step,
  index,
  onClose,
  'data-testid': testId = 'flow-preview-step-panel'
}) => {
  const formFields = step.form ?? step.inputs ?? []
  const assignment = step.assignment
  const isGateway = step.type === 'GATEWAY'

  if (isGateway) {
    const branches = step.branches ?? []
    const defaultNext = step.defaultNextStep
    return (
      <>
        <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">
              Step {index + 1}: Branch (Gateway)
            </span>
            <Badge variant="secondary">Conditional paths</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            data-testid={`${testId}-step-config-close`}
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </div>
        <div
          className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-5 gba:pt-4"
          data-testid={`${testId}-step-config`}
        >
          <ScrollArea className="gba:h-full">
            <div className="gba:space-y-4 gba:pr-2">
              {branches.length > 0 && (
                <div>
                  <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Conditions</p>
                  <ul className="gba:space-y-1.5">
                    {branches.map((b, i) => (
                      <li key={b.condition ?? `branch-${i}`} className="gba:text-sm gba:text-foreground">
                        <span className="gba:font-medium">{b.condition || '(no condition)'}</span>
                        <span className="gba:text-muted-foreground"> → Step {b.nextStep + 1}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {typeof defaultNext === 'number' && (
                <p className="gba:text-sm gba:text-muted-foreground">Default → Step {defaultNext + 1}</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-semibold gba:text-foreground">
            Step {index + 1}: {step.title || 'Untitled step'}
          </span>
          <Badge variant="secondary">
            {String(step.type ?? 'TASK')
              .split('_')
              .join(' ')}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close"
          data-testid={`${testId}-step-config-close`}
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>
      <div
        className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-5 gba:pt-4"
        data-testid={`${testId}-step-config`}
      >
        <ScrollArea className="gba:h-full">
          <div className="gba:space-y-4 gba:pr-2">
            {step.message && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Message to user</p>
                <p className="gba:text-sm gba:text-foreground">{step.message}</p>
              </div>
            )}
            {assignment && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Assignment</p>
                <p className="gba:text-sm gba:text-foreground">
                  {assignmentModeLabel(assignment.assignmentMode ?? '')}
                </p>
              </div>
            )}
            {step.dueInMinutes != null && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Due</p>
                <p className="gba:text-sm gba:text-foreground">Within {step.dueInMinutes} minutes</p>
              </div>
            )}
            {formFields.length > 0 && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Form fields</p>
                <ul className="gba:space-y-1.5">
                  {formFields.map((f, i) => (
                    <li key={f.name ?? f.label ?? `field-${i}`} className="gba:text-sm gba:flex gba:gap-2">
                      <span className="gba:font-medium gba:text-foreground">{f.label || f.name}</span>
                      <span className="gba:text-muted-foreground">
                        ({inputTypeLabel(f.type ?? '')}
                        {f.required ? ', required' : ''})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {step.links && step.links.length > 0 && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Links</p>
                <ul className="gba:space-y-1">
                  {step.links.map((l, i) => (
                    <li key={l.url ?? `link-${i}`} className="gba:text-sm">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gba:text-primary gba:underline"
                      >
                        {l.name || l.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
