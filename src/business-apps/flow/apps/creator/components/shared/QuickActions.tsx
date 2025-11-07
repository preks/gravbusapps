import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Separator } from '@newwork/nw-design-system'
import { User, Workflow, Database, Zap, Clock } from 'lucide-react'
import { FlowTemplate } from '../../types/flowTemplate'
import { getFieldSuggestionsFromTemplate } from '../../utils/expressionTreeBuilder'

interface QuickActionsProps {
  template: FlowTemplate
  stepIndex: number
  onInsert: (expression: string) => void
  recentExpressions?: string[]
  'data-testid'?: string
}

/**
 * QuickActions - Panel with common patterns and smart suggestions
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  template,
  stepIndex,
  onInsert,
  recentExpressions = [],
  'data-testid': testId = 'quick-actions'
}) => {
  // Get field suggestions from previous steps
  const fieldSuggestions = getFieldSuggestionsFromTemplate(template, stepIndex)

  // Common expressions
  const commonExpressions = [
    {
      id: 'workflow-initiator',
      label: 'Workflow Initiator',
      expression: '{{$workflow.initiator}}',
      icon: <User className="gba:h-4 gba:w-4" />
    },
    {
      id: 'workflow-status',
      label: 'Workflow Status',
      expression: '{{$workflow.status}}',
      icon: <Workflow className="gba:h-4 gba:w-4" />
    },
    {
      id: 'step0-data',
      label: 'Step 0 Form Data',
      expression: '{{$steps.step_0.output.formData.}}',
      icon: <Database className="gba:h-4 gba:w-4" />,
      disabled: stepIndex === 0
    },
    {
      id: 'executedBy',
      label: 'Completed By',
      expression: '{{$steps.step_0.output.executedBy}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      disabled: stepIndex === 0
    },
    {
      id: 'timestamp',
      label: 'Completion Time',
      expression: '{{$steps.step_0.output.timestamp}}',
      icon: <Clock className="gba:h-4 gba:w-4" />,
      disabled: stepIndex === 0
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Common Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
            <Zap className="gba:h-4 gba:w-4 gba:text-yellow-600" />
            Common Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          {commonExpressions.map(expr => (
            <Button
              key={expr.id}
              variant="outline"
              size="sm"
              className="gba:w-full gba:justify-start gba:text-left"
              onClick={() => onInsert(expr.expression)}
              disabled={expr.disabled}
              data-testid={`${testId}-common-${expr.id}`}
            >
              <span className="gba:mr-2">{expr.icon}</span>
              <span className="gba:flex-1 gba:text-xs">{expr.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Field Suggestions from Previous Steps */}
      {fieldSuggestions.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
                <Database className="gba:h-4 gba:w-4 gba:text-green-600" />
                Field Suggestions
                <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                  {fieldSuggestions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-1 gba:max-h-[250px] gba:overflow-y-auto">
              {fieldSuggestions.map((field, index) => (
                <div
                  key={`${field.stepIndex}-${field.name}`}
                  className="gba:flex gba:items-center gba:justify-between gba:p-2 hover:gba:bg-gray-50 gba:rounded gba:cursor-pointer gba:group"
                  onClick={() => onInsert(field.expression)}
                  data-testid={`${testId}-suggestion-${index}`}
                >
                  <div className="gba:flex-1">
                    <div className="gba:text-xs gba:font-medium gba:text-gray-900">{field.label}</div>
                    <div className="gba:text-xs gba:text-gray-500">
                      Step {field.stepIndex}: {field.stepTitle}
                    </div>
                  </div>
                  <Badge variant="outline" className="gba:text-xs gba:capitalize">
                    {field.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Expressions */}
      {recentExpressions.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
                <Clock className="gba:h-4 gba:w-4 gba:text-gray-600" />
                Recent
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-1">
              {recentExpressions.slice(0, 5).map((expr, index) => (
                <div
                  key={index}
                  className="gba:flex gba:items-center gba:justify-between gba:p-2 hover:gba:bg-gray-50 gba:rounded gba:cursor-pointer"
                  onClick={() => onInsert(expr)}
                  data-testid={`${testId}-recent-${index}`}
                >
                  <code className="gba:text-xs gba:text-purple-700 gba:truncate gba:flex-1">{expr}</code>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
