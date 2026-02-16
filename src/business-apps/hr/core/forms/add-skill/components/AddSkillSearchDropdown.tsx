import React, { forwardRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AddSkillSearchDropdownProps {
  isOpen: boolean
  isSearching: boolean
  filteredResults: Array<{ id: string; name: string }>
  searchTerm: string
  onSelect: (skill: { id: string; name: string }) => void
  onAddNew: () => void
}

export const AddSkillSearchDropdown = forwardRef<HTMLDivElement, AddSkillSearchDropdownProps>(
  ({ isOpen, isSearching, filteredResults, searchTerm, onSelect, onAddNew }, ref) => {
    if (!isOpen) return null

    const showNoResults = !isSearching && filteredResults.length === 0 && searchTerm.trim().length > 0

    return (
      <div
        ref={ref}
        className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:mt-1 gba:w-full gba:bg-card gba:text-card-foreground gba:border gba:rounded-lg gba:shadow-lg gba:z-50"
        data-testid="add-skill-search-dropdown"
      >
        <div
          className={`gba:p-2 gba:space-y-1 gba:w-full gba:max-h-[250px] gba:overflow-y-auto gba:!text-left gba:font-normal gba:[&>*]:gba:mb-1 ${showNoResults ? 'gba:px-3 gba:py-3' : ''}`}
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
                className="gba:w-full gba:block gba:!justify-start gba:!text-left gba:!items-start gba:py-2 gba:!whitespace-normal gba:!h-auto gba:!min-h-10 gba:!leading-normal gba:font-normal"
                onClick={() => onSelect({ id: sk.id, name: sk.name })}
                data-testid={`flw_addSkills_searchOption${index}`}
              >
                <span className="gba:block gba:w-full gba:break-words gba:!break-words gba:!whitespace-normal gba:!text-left gba:!leading-normal gba:font-normal">
                  {sk.name}
                </span>
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
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={onAddNew}
                data-testid="flw_addSkills_addNewSkillButton"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.add_skill_form.add_skill_button_text',
                  'Add Skill'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }
)

AddSkillSearchDropdown.displayName = 'AddSkillSearchDropdown'
