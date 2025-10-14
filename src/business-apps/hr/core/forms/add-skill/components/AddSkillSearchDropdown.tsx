import React from 'react'
import { Button, Card, CardContent } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AddSkillSearchDropdownProps {
  isOpen: boolean
  isSearching: boolean
  filteredResults: Array<{ id: string; name: string }>
  searchTerm: string
  onSelect: (skill: { id: string; name: string }) => void
  onAddNew: () => void
}

export const AddSkillSearchDropdown: React.FC<AddSkillSearchDropdownProps> = ({
  isOpen,
  isSearching,
  filteredResults,
  searchTerm,
  onSelect,
  onAddNew
}) => {
  if (!isOpen) return null

  const showNoResults = !isSearching && filteredResults.length === 0 && searchTerm.trim().length > 0

  return (
    <Card className="gba:w-full" data-testid="add-skill-search-dropdown">
      <CardContent
        className={`gba:p-2 gba:space-y-1 gba:w-full gba:max-h-[250px] gba:overflow-y-auto ${showNoResults ? 'gba:px-3' : ''}`}
      >
        {isSearching && (
          <div className="gba:text-muted-foreground" data-testid="add-skill-search-loading">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.details_layout.add_skill_form.loading_text',
              'Loading...'
            )}
          </div>
        )}

        {!isSearching &&
          filteredResults.slice(0, 5).map((sk, index) => (
            <Button
              key={sk.id}
              variant="ghost"
              type="button"
              className="gba:w-full gba:justify-start gba:text-left gba:items-start gba:py-2 gba:whitespace-normal gba:break-words gba:h-auto gba:min-h-10 gba:leading-normal"
              onClick={() => onSelect({ id: sk.id, name: sk.name })}
              data-testid={`flw_addSkills_searchOption${index}`}
            >
              <span className="gba:block gba:break-all">{sk.name}</span>
            </Button>
          ))}

        {showNoResults && (
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <div className="gba:text-muted-foreground" data-testid="add-skill-no-results-text">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.no_skill_match_text',
                `No matching skill found for ${searchTerm.trim()}.`,
                {
                  skillName: searchTerm.trim(),
                  interpolation: { escapeValue: false }
                }
              )}
            </div>
            <Button size="sm" type="button" onClick={onAddNew} data-testid="flw_addSkills_addNewSkillButton">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.add_skill_form.add_skill_button_text',
                'Add Skill'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
