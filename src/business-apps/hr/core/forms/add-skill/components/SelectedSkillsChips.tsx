import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { XCircleIcon } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SelectedSkill {
  id: string
  name: string
  isNew?: boolean
  level?: number
}

interface SelectedSkillsChipsProps {
  skills: SelectedSkill[]
  onRemove: (id: string) => void
}

export const SelectedSkillsChips: React.FC<SelectedSkillsChipsProps> = ({ skills, onRemove }) => {
  if (!skills?.length) return null

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="add-skill-selected-container">
      {skills.map(s => (
        <Badge
          key={s.id}
          variant="secondary"
          className="gba:flex gba:items-center gba:gap-2 gba:h-10 gba:py-0 gba:px-4 gba:text-sm gba:max-w-full"
          data-testid={`add-skill-selected-badge-${s.id}`}
        >
          <span
            className="gba:flex-1 gba:min-w-0 gba:px-1 gba:truncate"
            title={s.level ? `${s.name} - Level ${s.level}` : s.name}
          >
            {s.level ? `${s.name} - Level ${s.level}` : s.name}
          </span>
          {s.isNew && (
            <span
              className="gba:text-xs gba:text-muted-foreground gba:ml-2 gba:flex-shrink-0"
              data-testid={`add-skill-selected-badge-new-${s.id}`}
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.new_badge_text',
                'New!'
              )}
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onMouseDown={evt => {
              evt.preventDefault()
              evt.stopPropagation()
            }}
            onClick={evt => {
              evt.preventDefault()
              evt.stopPropagation()
              onRemove(s.id)
            }}
            onKeyDown={evt => {
              if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault()
                evt.stopPropagation()
                onRemove(s.id)
              }
            }}
            aria-label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.details_layout.add_skill_form.remove_aria_label',
              'Remove'
            )}
            className="gba:cursor-pointer gba:rounded-full gba:p-0.5 gba:flex gba:items-center gba:flex-shrink-0 gba:ml-2"
            data-testid={`add-skill-selected-remove-${s.id}`}
          >
            <XCircleIcon className="gba:w-3 gba:h-3" />
          </span>
        </Badge>
      ))}
    </div>
  )
}
