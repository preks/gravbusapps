import React, { useMemo } from 'react'
import {
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowRightIcon } from '@phosphor-icons/react'
import type { AgentSkillItem } from '../hooks/useSkillsFromFile'
import translations from '../_i18n'

interface SuggestedSkillsTableProps {
  skills: AgentSkillItem[]
  categories: Array<{ id: string; name: string }>
  isLoadingCategories: boolean
  selectedKeys: Set<string>
  creatingKeys: Set<string>
  onToggleSelect: (key: string) => void
  onToggleSelectAll: () => void
  onRemove: (key: string) => void
  onCategoryChange: (key: string, categoryId: string) => void
  onCreate: (key: string) => void
  onAddToProfile: () => void
  dataTestId: string
}

export const SuggestedSkillsTable: React.FC<SuggestedSkillsTableProps> = ({
  skills,
  categories,
  isLoadingCategories,
  selectedKeys,
  creatingKeys,
  onToggleSelect,
  onToggleSelectAll,
  onRemove,
  onCategoryChange,
  onCreate,
  onAddToProfile,
  dataTestId
}) => {
  const { t } = useTranslation(translations)

  const sortedSkills = useMemo(
    () =>
      [...skills].sort((a, b) => {
        const aRank = a.matched && Boolean(a.company_skill_id) ? 0 : 1
        const bRank = b.matched && Boolean(b.company_skill_id) ? 0 : 1
        return aRank - bRank
      }),
    [skills]
  )

  const selectableKeys = useMemo(
    () => skills.filter(skill => skill.matched && Boolean(skill.company_skill_id)).map(skill => skill.extracted_name),
    [skills]
  )
  const selectedSelectableCount = useMemo(
    () => selectableKeys.filter(key => selectedKeys.has(key)).length,
    [selectableKeys, selectedKeys]
  )
  const allSelected = selectableKeys.length > 0 && selectedSelectableCount === selectableKeys.length
  const someSelected = selectedSelectableCount > 0 && selectedSelectableCount < selectableKeys.length
  const selectAllState = someSelected ? 'indeterminate' : false

  const canAddToProfile = useMemo(() => {
    return selectedSelectableCount > 0
  }, [selectedSelectableCount])

  const selectedUnmatchedCount = useMemo(() => {
    return [...selectedKeys].filter(key => {
      const skill = skills.find(s => s.extracted_name === key)
      return !skill?.matched || !skill?.company_skill_id
    }).length
  }, [selectedKeys, skills])

  const tooltipText = useMemo(() => {
    if (selectedKeys.size === 0) return t('suggested-table-tooltip-select')
    if (selectedUnmatchedCount > 0) {
      return t('suggested-table-tooltip-create', { count: selectedUnmatchedCount })
    }
    return null
  }, [selectedKeys.size, selectedUnmatchedCount, t])

  return (
    <div className="gba:border gba:rounded-lg gba:overflow-hidden" data-testid={`${dataTestId}-suggested-table`}>
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:bg-muted/40">
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <span className="gba:text-sm gba:font-medium">{t('suggested-table-title')}</span>
          <span className="gba:text-xs gba:text-muted-foreground">
            {t('suggested-table-subtitle', { count: skills.length })}
            {selectedKeys.size > 0 && ` ${t('suggested-table-selected', { count: selectedKeys.size })}`}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                size="sm"
                disabled={!canAddToProfile}
                onClick={onAddToProfile}
                data-testid={`${dataTestId}-add-to-profile-button`}
              >
                <ArrowRightIcon className="gba:h-4 gba:w-4 gba:mr-1.5" />
                {selectedKeys.size > 0
                  ? t('suggested-table-add-to-profile-count', { count: selectedKeys.size })
                  : t('suggested-table-add-to-profile')}
              </Button>
            </span>
          </TooltipTrigger>
          {tooltipText && <TooltipContent>{tooltipText}</TooltipContent>}
        </Tooltip>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-10">
              <Checkbox
                checked={allSelected ? true : selectAllState}
                onCheckedChange={onToggleSelectAll}
                disabled={selectableKeys.length === 0}
                data-testid={`${dataTestId}-select-all-checkbox`}
              />
            </TableHead>
            <TableHead>{t('suggested-table-column-skill')}</TableHead>
            <TableHead className="gba:w-16">{t('suggested-table-column-level')}</TableHead>
            <TableHead className="gba:w-24 gba:text-right">{t('suggested-table-column-action')}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedSkills.map(skill => {
            const key = skill.extracted_name
            const isSelected = selectedKeys.has(key)
            const isCreating = creatingKeys.has(key)
            const isMatched = skill.matched && Boolean(skill.company_skill_id)
            const selectedCategoryId = skill.company_skill_category_id ?? ''

            return (
              <TableRow
                key={key}
                data-testid={`${dataTestId}-suggested-row`}
                className={isSelected ? 'gba:bg-muted/50' : undefined}
              >
                <TableCell>
                  {isMatched ? (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(key)}
                      data-testid={`${dataTestId}-select-skill-checkbox`}
                    />
                  ) : null}
                </TableCell>

                <TableCell className="gba:max-w-0">
                  <div className="gba:flex gba:flex-col gba:gap-1.5 gba:min-w-0">
                    <span
                      className="gba:text-sm gba:font-medium gba:truncate"
                      title={skill.company_skill_name || skill.extracted_name}
                    >
                      {skill.company_skill_name || skill.extracted_name}
                    </span>
                    {!isMatched && (
                      <Select
                        value={selectedCategoryId}
                        onValueChange={value => onCategoryChange(key, value)}
                        disabled={isCreating || isLoadingCategories || categories.length === 0}
                        data-testid={`${dataTestId}-suggested-category-select`}
                      >
                        <SelectTrigger className="gba:w-full" size="sm">
                          <SelectValue
                            placeholder={isLoadingCategories ? 'Loading categories...' : 'Select category'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="gba:text-sm gba:font-medium">{skill.recommended_level}</span>
                </TableCell>

                <TableCell className="gba:text-right">
                  {isMatched ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onRemove(key)}
                      className="gba:shrink-0"
                      data-testid={`${dataTestId}-remove-suggestion-button`}
                    >
                      {t('remove-button')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="gba:shrink-0"
                      disabled={isCreating || !selectedCategoryId}
                      onClick={() => onCreate(key)}
                      data-testid={`${dataTestId}-create-skill-button`}
                    >
                      {t('suggested-skill-create-button')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
