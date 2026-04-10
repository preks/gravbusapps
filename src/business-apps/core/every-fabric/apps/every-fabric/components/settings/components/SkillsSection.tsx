import { useCallback, useEffect, useMemo, useState } from 'react'
import { CaretDownIcon, CaretUpIcon, DownloadSimpleIcon, PackageIcon, StarIcon } from '@phosphor-icons/react'
import type { EnterpriseSkill } from '../../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { SectionHeader } from './SettingsShared'

interface SkillsSectionProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
  defaultSkillId?: string
  onSetDefaultSkill: (skillId: string) => void
}

function sortCategories(left: string, right: string): number {
  return left.localeCompare(right)
}

function getOnboardingStepItems(skillId: string, steps: string[]) {
  const stepOccurrences = new Map<string, number>()

  return steps.map((step, position) => {
    const nextOccurrence = (stepOccurrences.get(step) ?? 0) + 1
    stepOccurrences.set(step, nextOccurrence)

    return {
      key: `${skillId}-${step}-${nextOccurrence}`,
      label: position + 1,
      value: step
    }
  })
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ client, isOpen, defaultSkillId, onSetDefaultSkill }) => {
  const [skills, setSkills] = useState<EnterpriseSkill[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    client
      .listEnterpriseSkills()
      .then(data => setSkills((data ?? []).filter(s => s.is_active !== false)))
      .catch(() => setSkills([]))
      .finally(() => setIsLoading(false))
  }, [isOpen, client])

  const categories = useMemo(() => {
    const cats = new Set(skills.map(s => s.category).filter(Boolean))
    return Array.from(cats).sort(sortCategories)
  }, [skills])

  const filteredSkills = useMemo(
    () => (categoryFilter ? skills.filter(s => s.category === categoryFilter) : skills),
    [skills, categoryFilter]
  )
  const isAllCategoriesSelected = categoryFilter === null

  const handleInstallSkill = useCallback(
    async (skillId: string) => {
      try {
        await client.installSkill(skillId)
        setSkills(prev => prev.map(s => (s.skill_id === skillId ? { ...s, install_count: s.install_count + 1 } : s)))
      } catch {
        // Could add toast later
      }
    },
    [client]
  )

  const renderSkillList = () => {
    if (isLoading) {
      return <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">Loading skills...</p>
    }

    if (filteredSkills.length === 0) {
      return <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">No skills available</p>
    }

    return filteredSkills.map(skill => {
      const isDefault = defaultSkillId === skill.skill_id
      const isExpanded = expandedSkillId === skill.skill_id
      const onboardingStepItems = skill.onboarding_steps
        ? getOnboardingStepItems(skill.skill_id, skill.onboarding_steps)
        : []

      return (
        <div
          key={skill.skill_id}
          className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:overflow-hidden gba:transition-colors gba:hover:bg-muted/35"
          data-testid={`settings-skill-${skill.skill_id}`}
        >
          <div className="gba:flex gba:items-start gba:gap-3 gba:p-3">
            {skill.icon && <span className="gba:text-lg gba:leading-none gba:shrink-0 gba:mt-0.5">{skill.icon}</span>}
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{skill.name}</p>
                {isDefault && (
                  <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:px-1.5 gba:py-0.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-[10px] gba:font-semibold gba:shrink-0">
                    <StarIcon className="gba:h-2.5 gba:w-2.5" weight="fill" />
                    Default
                  </span>
                )}
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">{skill.description}</p>
              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
                <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted/60 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                  {skill.category}
                </span>
                {skill.install_count > 0 && (
                  <span className="gba:text-[10px] gba:text-muted-foreground/50">{skill.install_count} installs</span>
                )}
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
              <button
                onClick={() => onSetDefaultSkill(skill.skill_id)}
                className={`gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:transition-colors ${
                  isDefault
                    ? 'gba:text-primary gba:bg-primary/10'
                    : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60'
                }`}
                title={isDefault ? 'Remove as default' : 'Set as default'}
                data-testid={`settings-skill-default-${skill.skill_id}`}
              >
                <StarIcon className="gba:h-3.5 gba:w-3.5" weight={isDefault ? 'fill' : 'regular'} />
              </button>
              <button
                onClick={() => handleInstallSkill(skill.skill_id)}
                className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                title="Install skill"
                data-testid={`settings-skill-install-${skill.skill_id}`}
              >
                <DownloadSimpleIcon className="gba:h-3.5 gba:w-3.5" />
              </button>
              <button
                onClick={() => setExpandedSkillId(isExpanded ? null : skill.skill_id)}
                className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                title={isExpanded ? 'Collapse' : 'Details'}
              >
                {isExpanded ? (
                  <CaretUpIcon className="gba:h-3.5 gba:w-3.5" />
                ) : (
                  <CaretDownIcon className="gba:h-3.5 gba:w-3.5" />
                )}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="gba:border-t gba:border-border/40 gba:px-3 gba:py-2.5 gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                <span>v{skill.version}</span>
                <span>{skill.publisher}</span>
                {skill.estimated_setup_time && <span>{skill.estimated_setup_time} setup</span>}
              </div>
              {onboardingStepItems.length > 0 && (
                <div>
                  <p className="gba:text-[10px] gba:uppercase gba:tracking-widest gba:font-semibold gba:text-muted-foreground/60 gba:mb-1">
                    Setup steps
                  </p>
                  <ol className="gba:space-y-0.5">
                    {onboardingStepItems.map(step => (
                      <li key={step.key} className="gba:text-xs gba:text-muted-foreground gba:flex gba:gap-2">
                        <span className="gba:text-muted-foreground/40 gba:shrink-0">{step.label}.</span>
                        {step.value}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <>
      <SectionHeader
        icon={<PackageIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />}
        title="Enterprise Skills"
      />
      <div className="gba:px-4 gba:pb-3">
        {categories.length > 0 && (
          <div className="gba:flex gba:gap-1 gba:mb-3 gba:flex-wrap">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:transition-colors ${
                isAllCategoriesSelected
                  ? 'gba:bg-foreground gba:text-background'
                  : 'gba:text-muted-foreground gba:hover:bg-muted/40'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:transition-colors ${
                  categoryFilter === cat
                    ? 'gba:bg-foreground gba:text-background'
                    : 'gba:text-muted-foreground gba:hover:bg-muted/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="gba:space-y-1.5 gba:max-h-64 gba:overflow-y-auto">{renderSkillList()}</div>
      </div>
    </>
  )
}
