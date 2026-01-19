import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Zap, User, Workflow, Database, Clock, FolderOpen, Users } from 'lucide-react'
import { FlowTemplate } from '../../types/flowTemplate'

interface QuickActionsProps {
  template: FlowTemplate
  stepIndex: number
  onInsert: (expression: string) => void
  recentExpressions?: string[]
  'data-testid'?: string
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  template,
  stepIndex,
  onInsert,
  recentExpressions = [],
  'data-testid': testId
}) => {
  // Get first step with form data for examples
  // step.form is already an array of InputBlock[], not an object with inputs property
  const firstStepWithForm = template.steps.find((step, idx) => {
    const formInputs = step.form || step.inputs || []
    return idx < stepIndex && formInputs.length > 0
  })
  const formInputs = firstStepWithForm?.form || firstStepWithForm?.inputs || []
  const firstFieldName = formInputs[0]?.name

  const commonPatterns = [
    {
      label: 'Workflow Initiator',
      expression: '{{$workflow.initiator}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      description: 'User who started workflow',
      disabled: false
    },
    {
      label: 'Workflow Status',
      expression: '{{$workflow.status}}',
      icon: <Workflow className="gba:h-4 gba:w-4" />,
      description: 'Current workflow status',
      disabled: false
    },
    {
      label: `Step 0 Form Data`,
      expression: firstFieldName ? `{{$steps.step_0.formData.${firstFieldName}}}` : '',
      icon: <Database className="gba:h-4 gba:w-4" />,
      description: firstFieldName ? `Field: ${firstFieldName}` : 'No form fields in step 0',
      disabled: !firstFieldName
    },
    {
      label: 'Completed By',
      expression: '{{$steps.step_0.executedBy}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      description: 'User who completed step',
      disabled: stepIndex === 0
    },
    {
      label: 'Completion Time',
      expression: '{{$steps.step_0.timestamp}}',
      icon: <Clock className="gba:h-4 gba:w-4" />,
      description: 'When step was completed',
      disabled: stepIndex === 0
    }
  ]

  const catalogExamples = [
    {
      label: 'Asset by ID',
      expression: '{{$catalog.asset-management[ID_HERE].name}}',
      icon: <FolderOpen className="gba:h-4 gba:w-4" />,
      description: 'Reference asset catalog entry'
    },
    {
      label: 'Employee by ID',
      expression: '{{$catalog.employees[ID_HERE].fullName}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      description: 'Reference employee catalog entry'
    },
    {
      label: 'Dynamic Catalog Reference',
      expression: firstFieldName
        ? `{{$catalog.asset-management[{{$steps.step_0.formData.${firstFieldName}}}].name}}`
        : '{{$catalog.asset-management[{{$steps.step_0.formData.assetId}}].name}}',
      icon: <Database className="gba:h-4 gba:w-4" />,
      description: 'Use form field value as catalog ID'
    }
  ]

  const orgChartPatterns = [
    {
      label: "Initiator's Manager",
      expression: '{{$orgchart.managerByUserId[$workflow.initiator]}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      description: 'Manager of workflow starter'
    },
    {
      label: "Initiator's Director",
      expression: '{{$orgchart.skipLevelManagerByUserId[$workflow.initiator]}}',
      icon: <Users className="gba:h-4 gba:w-4" />,
      description: 'Skip-level manager approval'
    },
    {
      label: "Initiator's Team",
      expression: '{{$orgchart.directReportsByUserId[$workflow.initiator]}}',
      icon: <Users className="gba:h-4 gba:w-4" />,
      description: 'All direct reports'
    },
    {
      label: "Initiator's Manager Name",
      expression: '{{$orgchart.managerByUserId[$workflow.initiator].name}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      description: 'Manager display name'
    },
    {
      label: 'Employee Manager',
      expression: firstFieldName
        ? `{{$orgchart.manager[$workflow.input.${firstFieldName}]}}`
        : '{{$orgchart.manager[$workflow.input.employeeId]}}',
      icon: <User className="gba:h-4 gba:w-4" />,
      description: 'Manager of specific employee'
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
          {commonPatterns.map((pattern, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="gba:w-full gba:justify-start gba:text-left"
              disabled={pattern.disabled}
              onClick={() => onInsert(pattern.expression)}
              data-testid={`${testId}-common-${index}`}
            >
              <span className="gba:mr-2">{pattern.icon}</span>
              <span className="gba:flex-1 gba:text-xs">{pattern.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* OrgChart Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
            <Users className="gba:h-4 gba:w-4 gba:text-blue-600" />
            OrgChart Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          {orgChartPatterns.map((pattern, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="gba:w-full gba:justify-start gba:text-left"
              onClick={() => onInsert(pattern.expression)}
              data-testid={`${testId}-orgchart-${index}`}
            >
              <span className="gba:mr-2">{pattern.icon}</span>
              <div className="gba:flex-1">
                <div className="gba:text-xs gba:font-medium">{pattern.label}</div>
                <div className="gba:text-xs gba:text-gray-500">{pattern.description}</div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Catalog Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
            <FolderOpen className="gba:h-4 gba:w-4 gba:text-amber-600" />
            Catalog Examples
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          {catalogExamples.map((example, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="gba:w-full gba:justify-start gba:text-left"
              onClick={() => onInsert(example.expression)}
              data-testid={`${testId}-catalog-${index}`}
            >
              <span className="gba:mr-2">{example.icon}</span>
              <div className="gba:flex-1">
                <div className="gba:text-xs gba:font-medium">{example.label}</div>
                <div className="gba:text-xs gba:text-gray-500">{example.description}</div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Recent Expressions (if any) */}
      {recentExpressions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-sm">Recent</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-2">
            {recentExpressions.slice(0, 5).map((expr, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="gba:w-full gba:justify-start gba:text-left gba:font-mono"
                onClick={() => onInsert(expr)}
                data-testid={`${testId}-recent-${index}`}
              >
                <span className="gba:text-xs gba:truncate">{expr}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
