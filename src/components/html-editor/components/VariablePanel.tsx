import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { TemplateVariable } from '../types'

interface VariablePanelProps {
  variables: TemplateVariable[]
  onInsert: (variable: TemplateVariable) => void
  disabled?: boolean
  prefixDataTestId?: string
}

export const VariablePanel: React.FC<VariablePanelProps> = ({
  variables,
  onInsert,
  disabled,
  prefixDataTestId = 'variable-panel'
}) => {
  if (variables.length === 0) return null

  return (
    <Card data-testid={prefixDataTestId}>
      <CardHeader>
        <CardTitle className="gba:text-sm">Available Variables</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {variables.map(variable => (
          <div
            key={variable.key}
            className="gba:flex gba:items-start gba:justify-between gba:p-2 gba:rounded gba:border gba:border-input hover:gba:bg-accent/50 gba:transition-colors"
            data-testid={`${prefixDataTestId}-item-${variable.key}`}
          >
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Badge variant="secondary" className="gba:font-mono gba:text-xs">
                  {`{{${variable.key}}}`}
                </Badge>
                <span className="gba:text-sm gba:font-medium">{variable.label}</span>
              </div>
              {variable.description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{variable.description}</p>
              )}
              {variable.example && (
                <p className="gba:text-xs gba:text-muted gba:mt-1 gba:font-mono">Example: {variable.example}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => onInsert(variable)}
              disabled={disabled}
              data-testid={`${prefixDataTestId}-insert-${variable.key}`}
              aria-label={`Insert ${variable.label || variable.key}`}
            >
              <PlusIcon className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default VariablePanel
