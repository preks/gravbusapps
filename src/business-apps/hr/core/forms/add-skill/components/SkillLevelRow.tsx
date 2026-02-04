import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@newwork/nw-design-system'
import { XCircleIcon } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SkillLevelRowProps {
  skill: {
    id: string
    name: string
    level: number
  }
  onLevelChange: (id: string, level: number) => void
  onAction: (skill: { id: string; name: string; level: number }) => void
  onRemove: (id: string) => void
  actionButtonText: string
  actionButtonTestId: string
}

export const SkillLevelRow: React.FC<SkillLevelRowProps> = ({
  skill,
  onLevelChange,
  onAction,
  onRemove,
  actionButtonText,
  actionButtonTestId
}) => {
  return (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:border gba:border-border gba:rounded-lg gba:bg-card"
      data-testid={`skill-level-row-${skill.id}`}
    >
      <span className="gba:flex-1 gba:min-w-0 gba:truncate" title={skill.name}>
        {skill.name}
      </span>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.add_skill_form.level_label',
            'Level'
          )}
          :
        </span>
        <Select
          value={skill.level.toString()}
          onValueChange={value => onLevelChange(skill.id, parseInt(value, 10))}
          data-testid={`skill-level-select-${skill.id}`}
        >
          <SelectTrigger className="gba:w-20" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
              <SelectItem key={level} value={level.toString()}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" size="sm" onClick={() => onAction(skill)} data-testid={actionButtonTestId}>
        {actionButtonText}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(skill.id)}
        aria-label={getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
          'Remove'
        )}
        data-testid={`skill-level-row-remove-${skill.id}`}
        className="gba:p-1"
      >
        <XCircleIcon className="gba:w-4 gba:h-4" />
      </Button>
    </div>
  )
}
