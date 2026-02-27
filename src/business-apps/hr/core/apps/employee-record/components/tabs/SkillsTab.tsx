import React, { useMemo, useState } from 'react'
import {
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Employee } from '../../hooks/useEmployeeData'
import { FilterBar } from './components/CompactFilterBar'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import translations from '../../_i18n'
import { getSkillCategory } from '../../utils/utils'
import { SkillCard } from './components/skills-profile/SkillCard'
import { SkillsSnapshot } from './components/skills-profile/SkillsSnapshot'
import { SkillsDevelopmentPanel } from './components/skills-profile/SkillsDevelopmentPanel'
import {
  SkillLevelFilter,
  SkillSortOption,
  SkillStatusFilter,
  applySkillsFiltersAndSort,
  getJobProfileGap,
  getSkillDistribution,
  getSkillsSnapshotData
} from './components/skills-profile/skillsProfile.utils'

interface SkillsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
}

/**
 * Skills Tab Component
 * Displays skills for the employee with enhanced visual design
 */
const SkillsTab: React.FC<SkillsTabProps> = ({ employee, accessToken }) => {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>('all')
  const [levelFilter, setLevelFilter] = useState<SkillLevelFilter>('all')
  const [sortBy, setSortBy] = useState<SkillSortOption>('level-desc')

  const employeeSkills = useMemo(() => {
    return employee.skills || []
  }, [employee.skills])

  const validSkills = useMemo(() => {
    return employeeSkills.filter(skill => !skill.isDeleted)
  }, [employeeSkills])

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>()
    validSkills.forEach(skill => categories.add(getSkillCategory(skill.skill.additionalProperties)))
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [validSkills])

  const snapshot = useMemo(() => getSkillsSnapshotData(employeeSkills), [employeeSkills])
  const distribution = useMemo(() => getSkillDistribution(employeeSkills), [employeeSkills])
  const verifyCount = useMemo(() => validSkills.filter(skill => !skill.verificationDocumentId).length, [validSkills])
  const jobProfileGap = useMemo(
    () =>
      getJobProfileGap({
        employeeSkills,
        jobProfile: employee?.employeePosition?.jobPosition?.jobProfile
      }),
    [employeeSkills, employee?.employeePosition?.jobPosition?.jobProfile]
  )

  const filteredSkills = useMemo(
    () =>
      applySkillsFiltersAndSort({
        skills: employeeSkills,
        searchTerm,
        categoryFilter,
        statusFilter,
        levelFilter,
        sortBy,
        getCategory: getSkillCategory
      }),
    [employeeSkills, searchTerm, categoryFilter, statusFilter, levelFilter, sortBy]
  )

  const updateSkillContext = useMemo(
    () => ({ context: FlowContextName.updateEmployeeSkill, contextData: { employeeId: employee?.id } }),
    [employee?.id]
  )

  return (
    <div className="gba:space-y-6" data-testid="skills-profile-tab">
      <div className="gba:flex gba:flex-col gba:gap-4 gba:md:flex-row gba:md:items-start gba:md:justify-between">
        <div className="gba:space-y-1">
          <h2 className="gba:text-2xl gba:font-bold" data-testid="skills-profile-title">
            {t('skills-profile-title')}
          </h2>
          <p className="gba:text-muted-foreground" data-testid="skills-profile-description">
            {t('skills-profile-description')}
          </p>
        </div>
        <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="skills-profile-actions">
          <AppAction
            variant="update-primary"
            data-testid="employee-skills-add-button"
            contexts={[updateSkillContext]}
            prefixDataTestId="employee-skills-add"
            accessToken={accessToken}
            autoExecute={true}
          >
            {t('skills-profile-add-skill')}
          </AppAction>
        </div>
      </div>

      <SkillsSnapshot snapshot={snapshot} t={t} />

      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:gap-4">
        <div className="gba:lg:col-span-9 gba:lg:order-1 gba:space-y-4" data-testid="skills-profile-main-column">
          <FilterBar
            dataTestId="skills-profile-filters-card"
            className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/40 gba:p-1.5"
            controlsClassName="gba:gap-2"
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: t('skills-filter-search-placeholder'),
              'data-testid': 'skills-filter-search-input'
            }}
            clear={{
              label: t('skills-filter-clear'),
              onClick: () => {
                setSearchTerm('')
                setCategoryFilter('all')
                setStatusFilter('all')
                setLevelFilter('all')
                setSortBy('level-desc')
              },
              'data-testid': 'skills-filter-clear'
            }}
          >
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="gba:h-9 gba:min-w-[170px]" data-testid="skills-filter-category-select">
                <SelectValue placeholder={t('skills-filter-category-all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('skills-filter-category-all')}</SelectItem>
                {categoryOptions.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={value => setStatusFilter(value as SkillStatusFilter)}>
              <SelectTrigger className="gba:h-9 gba:min-w-[160px]" data-testid="skills-filter-status-select">
                <SelectValue placeholder={t('skills-filter-status-all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('skills-filter-status-all')}</SelectItem>
                <SelectItem value="verified">{t('skills-filter-status-verified')}</SelectItem>
                <SelectItem value="unverified">{t('skills-filter-status-unverified')}</SelectItem>
                <SelectItem value="pending">{t('skills-filter-status-pending')}</SelectItem>
                <SelectItem value="inactive">{t('skills-filter-status-inactive')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={value => setLevelFilter(value as SkillLevelFilter)}>
              <SelectTrigger className="gba:h-9 gba:min-w-[140px]" data-testid="skills-filter-level-select">
                <SelectValue placeholder={t('skills-filter-level-all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('skills-filter-level-all')}</SelectItem>
                <SelectItem value="1-3">{t('skills-filter-level-low')}</SelectItem>
                <SelectItem value="4-6">{t('skills-filter-level-mid')}</SelectItem>
                <SelectItem value="7-10">{t('skills-filter-level-high')}</SelectItem>
                <SelectItem value="unset">{t('skills-filter-level-unset')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={value => setSortBy(value as SkillSortOption)}>
              <SelectTrigger className="gba:h-9 gba:min-w-[140px]" data-testid="skills-filter-sort-select">
                <SelectValue placeholder={t('skills-filter-sort-level')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="level-desc">{t('skills-filter-sort-level')}</SelectItem>
                <SelectItem value="updated-desc">{t('skills-filter-sort-updated')}</SelectItem>
                <SelectItem value="verified-first">{t('skills-filter-sort-verified')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          {filteredSkills.length === 0 ? (
            <EmptyState
              type="no-data"
              title={t('skills-empty')}
              description={t('skills-profile-empty-filtered')}
              data-testid="skills-profile-empty-state"
            />
          ) : (
            <div
              className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:2xl:grid-cols-3 gba:gap-4"
              data-testid="skills-profile-grid"
            >
              {filteredSkills.map(skill => (
                <SkillCard
                  key={skill.skill.id}
                  skill={skill}
                  accessToken={accessToken}
                  updateSkillContext={updateSkillContext}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        <div className="gba:lg:col-span-3 gba:lg:order-2" data-testid="skills-profile-sidebar-column">
          <SkillsDevelopmentPanel
            verifyCount={verifyCount}
            distribution={distribution}
            jobProfileGap={jobProfileGap}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

export default SkillsTab
