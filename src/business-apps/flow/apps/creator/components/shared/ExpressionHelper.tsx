import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  ScrollArea,
  Separator
} from '@newwork/nw-design-system'
import { Code, Copy, Workflow, Database, FolderOpen, Link as LinkIcon } from 'lucide-react'

interface ExpressionHelperProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (expression: string) => void
  stepIndex?: number // Current step being edited
  'data-testid'?: string
}

interface ExpressionExample {
  expression: string
  description: string
  category: string
}

/**
 * ExpressionHelper - Sheet panel with expression documentation and examples
 */
export const ExpressionHelper: React.FC<ExpressionHelperProps> = ({
  isOpen,
  onOpenChange,
  onInsert,
  stepIndex = 0,
  'data-testid': testId = 'expression-helper'
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Expression examples organized by category
  const expressions: ExpressionExample[] = [
    // Workflow expressions
    {
      expression: '{{$workflow.initiator}}',
      description: 'User who started the workflow',
      category: 'Workflow'
    },
    {
      expression: '{{$workflow.input.fieldName}}',
      description: 'Workflow input field value',
      category: 'Workflow'
    },

    // Step expressions (only show previous steps)
    ...Array.from({ length: stepIndex }, (_, i) => ({
      expression: `{{$steps.step_${i}.output.formData.fieldName}}`,
      description: `Data from Step ${i}`,
      category: 'Steps'
    })),
    {
      expression: '{{$steps.step_0.output.executedBy}}',
      description: 'User who completed the step',
      category: 'Steps'
    },
    {
      expression: '{{$steps.step_0.output.timestamp}}',
      description: 'Step completion timestamp',
      category: 'Steps'
    },

    // Catalog expressions
    {
      expression: '{{$catalog.asset-management[0].name}}',
      description: 'Asset catalog item by index',
      category: 'Catalogs'
    },
    {
      expression: '{{$catalog.employees[emp-001].email}}',
      description: 'Employee catalog item by ID',
      category: 'Catalogs'
    },
    {
      expression: '{{$catalog.asset-management[{{$steps.step_0.output.formData.assetId}}].name}}',
      description: 'Dynamic catalog lookup from step data',
      category: 'Catalogs'
    },

    // Entity expressions
    {
      expression: '{{$entity.ticket.TKT-123.subject}}',
      description: 'Ticket entity field',
      category: 'Entities'
    },
    {
      expression: '{{$entity.employee.{{$workflow.initiator}}.email}}',
      description: 'Employee entity with dynamic ID',
      category: 'Entities'
    },
    {
      expression: '{{$entity.asset.{{$steps.step_0.output.formData.assetId}}.location}}',
      description: 'Asset entity from step data',
      category: 'Entities'
    }
  ]

  // Filter expressions by search term
  const filteredExpressions = searchTerm
    ? expressions.filter(
        e =>
          e.expression.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : expressions

  // Group by category
  const categories = Array.from(new Set(filteredExpressions.map(e => e.category)))

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Workflow':
        return <Workflow className="gba:h-4 gba:w-4" />
      case 'Steps':
        return <Database className="gba:h-4 gba:w-4" />
      case 'Catalogs':
        return <FolderOpen className="gba:h-4 gba:w-4" />
      case 'Entities':
        return <LinkIcon className="gba:h-4 gba:w-4" />
      default:
        return <Code className="gba:h-4 gba:w-4" />
    }
  }

  const handleInsert = (expression: string) => {
    onInsert(expression)
    onOpenChange(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gba:w-full gba:sm:gba:w-full"
        style={{ width: '450px' }}
        data-testid={testId}
      >
        <SheetHeader>
          <SheetTitle className="gba:flex gba:items-center gba:gap-2">
            <Code className="gba:h-5 gba:w-5" />
            Expression Helper
          </SheetTitle>
          <SheetDescription>
            Click on an expression to insert it into your field. Expressions are dynamically resolved during workflow
            execution.
          </SheetDescription>
        </SheetHeader>

        <div className="gba:mt-6 gba:space-y-4">
          {/* Search */}
          <Input
            placeholder="Search expressions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:w-full"
            data-testid={`${testId}-search`}
          />

          {/* Expression categories */}
          <ScrollArea style={{ height: 'calc(100vh - 250px)' }}>
            <div className="gba:space-y-4 gba:pr-4">
              {categories.map(category => {
                const categoryExpressions = filteredExpressions.filter(e => e.category === category)

                return (
                  <div key={category}>
                    <Card>
                      <CardHeader className="gba:pb-3">
                        <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
                          {getCategoryIcon(category)}
                          {category}
                          <Badge variant="secondary" className="gba:ml-auto">
                            {categoryExpressions.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="gba:space-y-2">
                        {categoryExpressions.map((expr, index) => (
                          <div
                            key={`${category}-${index}`}
                            className="gba:space-y-1 gba:p-2 gba:rounded gba:border gba:border-gray-200 hover:gba:bg-gray-50 gba:transition-colors"
                          >
                            <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                              <code className="gba:text-xs gba:text-purple-700 gba:bg-purple-50 gba:px-2 gba:py-1 gba:rounded gba:flex-1 gba:break-all">
                                {expr.expression}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleInsert(expr.expression)}
                                className="gba:shrink-0"
                                data-testid={`${testId}-insert-${category}-${index}`}
                              >
                                <Copy className="gba:h-3 gba:w-3" />
                              </Button>
                            </div>
                            <p className="gba:text-xs gba:text-gray-600">{expr.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {category !== categories[categories.length - 1] && <Separator className="gba:my-4" />}
                  </div>
                )
              })}

              {filteredExpressions.length === 0 && (
                <div className="gba:text-center gba:py-8 gba:text-gray-500">
                  <Code className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                  <p className="gba:text-sm">No expressions found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
