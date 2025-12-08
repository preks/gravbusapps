/**
 * ReviewFieldRenderer Component
 * Shared component for rendering comparison and unchanged fields in HR Core review forms
 * Reduces cognitive complexity and eliminates code duplication
 */

import React from 'react'
import { Label, Badge } from '@newwork/nw-design-system'
import { ArrowRight } from 'lucide-react'
import { FieldComparison } from './useReviewFormData'

interface RenderComparisonFieldProps {
  label: string
  comparison: FieldComparison
  icon?: React.ReactNode
  isNewData: boolean
  t: (key: string, params?: Record<string, any>) => string
}

/**
 * Renders a comparison field showing old → new values
 * Only renders if the field has changed
 */
export const RenderComparisonField: React.FC<RenderComparisonFieldProps> = ({
  label,
  comparison,
  icon,
  isNewData,
  t
}) => {
  // Only show changed fields
  if (!comparison.changed) return null

  // Display "Not set" if old value was empty/null/N/A
  const displayOldValue =
    comparison.oldValue === t('value-na') || !comparison.oldValue ? t('value-not-set') : comparison.oldValue

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
        {icon}
        {label}
        <Badge variant={isNewData ? 'success' : 'warning'} className="gba:ml-2">
          {isNewData ? t('badge-new') : t('badge-changed')}
        </Badge>
      </Label>

      {/* Always show old → new for changed fields */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
        {!isNewData && (
          <>
            <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
              {displayOldValue}
            </div>
            <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </>
        )}
        <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-sm gba:font-medium">
          {comparison.newValue}
        </div>
      </div>
    </div>
  )
}

interface RenderUnchangedFieldProps {
  label: string
  value: string
  icon?: React.ReactNode
  t: (key: string) => string
}

/**
 * Renders an unchanged field showing only the current value
 * Skips empty values
 */
export const RenderUnchangedField: React.FC<RenderUnchangedFieldProps> = ({ label, value, icon, t }) => {
  // Skip empty values
  if (!value || value === t('value-na')) return null

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
        {icon}
        {label}
      </Label>
      <div className="gba:px-3 gba:py-2 gba:bg-muted gba:rounded gba:text-sm">{value}</div>
    </div>
  )
}

interface RenderFieldSmartProps {
  label: string
  comparison: FieldComparison
  icon?: React.ReactNode
  isNewData: boolean
  showUnchanged: boolean
  t: (key: string, params?: Record<string, any>) => string
}

/**
 * Smart field renderer that automatically chooses between comparison and unchanged rendering
 * Based on whether the field has changed and the showUnchanged flag
 */
export const RenderFieldSmart: React.FC<RenderFieldSmartProps> = ({
  label,
  comparison,
  icon,
  isNewData,
  showUnchanged,
  t
}) => {
  if (comparison.changed) {
    return <RenderComparisonField label={label} comparison={comparison} icon={icon} isNewData={isNewData} t={t} />
  }

  if (showUnchanged) {
    return <RenderUnchangedField label={label} value={comparison.newValue} icon={icon} t={t} />
  }

  return null
}
