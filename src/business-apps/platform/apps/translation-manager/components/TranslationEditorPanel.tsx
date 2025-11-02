import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Checkbox } from '@newwork/nw-design-system'
import { EditableTranslationField } from './EditableTranslationField'

interface LocalePattern {
  locale: string
  pattern: any
  isSource: boolean
  needsReview?: boolean
}

interface TranslationEditorPanelProps {
  keyId: string
  localePatterns: LocalePattern[]
  onPatternChange: (locale: string, newPattern: any) => void
  availableVariables: string[]
  onSave: () => void
  onMarkReviewed: () => void
  isReviewed: boolean
}

const TranslationEditorPanel: React.FC<TranslationEditorPanelProps> = ({
  keyId,
  localePatterns,
  onPatternChange,
  availableVariables,
  onSave,
  onMarkReviewed,
  isReviewed
}) => {
  return (
    <Card className="gba:h-full gba:flex gba:flex-col">
      <CardHeader className="gba:border-b">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-lg">
            <code className="gba:text-sm gba:font-mono">{keyId}</code>
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            {/* Mark as Reviewed Checkbox */}
            <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:cursor-pointer">
              <Checkbox checked={isReviewed} onCheckedChange={onMarkReviewed} />
              <span>Reviewed</span>
            </label>
            <Button onClick={onSave} size="sm">
              Save (⌘+Enter)
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:space-y-4">
        {/* All locales */}
        {localePatterns.map(({ locale, pattern, isSource, needsReview }) => (
          <div key={locale} className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant={isSource ? 'default' : 'secondary'} className="gba:text-xs gba:font-mono">
                {locale}
              </Badge>
              {isSource && <span className="gba:text-xs gba:text-muted-foreground">Source (read-only)</span>}
              {needsReview && (
                <Badge variant="warning" className="gba:text-xs">
                  Needs Review
                </Badge>
              )}
            </div>
            <div className={`gba:p-4 gba:rounded-md ${isSource ? 'gba:bg-muted' : 'gba:border gba:bg-background'}`}>
              <EditableTranslationField
                value={pattern}
                onChange={newPattern => onPatternChange(locale, newPattern)}
                disabled={isSource}
                availableVariables={availableVariables}
              />
            </div>
          </div>
        ))}

        {/* Variables info */}
        {availableVariables.length > 0 && (
          <div className="gba:space-y-2 gba:pt-4 gba:border-t">
            <span className="gba:text-xs gba:text-muted-foreground">Available variables:</span>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {availableVariables.map(varName => (
                <Badge key={varName} variant="info" className="gba:text-xs">
                  {varName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TranslationEditorPanel
