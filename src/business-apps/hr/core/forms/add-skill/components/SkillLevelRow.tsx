import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Skill row with Badge (skill name), level selector slot, and Remove button.
 * Used in Add Skill and Edit Job Profile SkillsSection.
 */
export interface SkillLevelRowProps {
  skillName: string
  levelContent: React.ReactNode
  onRemove: () => void
  dataTestIdPrefix?: string
  removeButtonTestId?: string
  actionButton?: React.ReactNode
  index?: number
  rowId?: string
  /** When false, the Remove button is not rendered (e.g. single-skill level update). */
  showRemove?: boolean
  /** Optional label shown next to skill name (e.g. "Deactivated"). */
  statusLabel?: string
}

export const SkillLevelRow: React.FC<SkillLevelRowProps> = ({
  skillName,
  levelContent,
  onRemove,
  dataTestIdPrefix = 'job-profile',
  removeButtonTestId,
  actionButton,
  index,
  rowId,
  showRemove = true,
  statusLabel
}) => {
  let suffix = ''
  if (rowId) suffix = `-${rowId}`
  else if (index !== undefined) suffix = `-${index}`
  return (
    <div
      className="gba:border gba:border-border gba:rounded-md gba:p-4"
      data-testid={`${dataTestIdPrefix}-skill-row${suffix}`}
    >
      <div className="gba:flex gba:items-center gba:gap-3">
        <Badge
          variant="secondary"
          className="gba:flex gba:items-center gba:gap-2 gba:h-10 gba:py-0 gba:px-4 gba:text-sm gba:flex-1 gba:min-w-0"
          data-testid={`${dataTestIdPrefix}-skill-badge${suffix}`}
        >
          <span className="gba:flex-1 gba:min-w-0 gba:px-1 gba:truncate" title={skillName || ''}>
            {skillName || 'Unknown Skill'}
          </span>
          {statusLabel && (
            <Badge variant="destructive" className="gba:shrink-0 gba:py-0 gba:px-2 gba:text-xs">
              {statusLabel}
            </Badge>
          )}
        </Badge>

        <div className="gba:w-24 gba:flex-shrink-0">{levelContent}</div>

        {actionButton}

        {showRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="gba:flex-shrink-0"
            data-testid={removeButtonTestId || `${dataTestIdPrefix}-remove-skill`}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
              'Remove'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
