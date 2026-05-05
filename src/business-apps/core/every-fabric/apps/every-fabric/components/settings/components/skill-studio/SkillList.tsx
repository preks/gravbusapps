import { useMemo } from 'react'
import { CaretDownIcon, FilesIcon, MagnifyingGlassIcon, PlusIcon, TagIcon, WrenchIcon } from '@phosphor-icons/react'
import type { AdminSkill } from '../../../../../types/enterpriseAgent'

interface SkillListProps {
  skills: AdminSkill[]
  total: number
  isLoading: boolean
  searchQuery: string
  onSearch: (query: string) => void
  onCreate: () => void
  onView: (skillId: string) => void
  error: string | null
  onClearError: () => void
}

function sortCategories(left: string, right: string): number {
  return left.localeCompare(right)
}

export const SkillList: React.FC<SkillListProps> = ({
  skills,
  total,
  isLoading,
  searchQuery,
  onSearch,
  onCreate,
  onView,
  error,
  onClearError
}) => {
  const categories = useMemo(() => {
    const cats = new Set(skills.map(s => s.category).filter(Boolean))
    return Array.from(cats).sort(sortCategories)
  }, [skills])

  return (
    <div className="gba:space-y-4" data-testid="skill-studio-list">
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className="gba:flex-1 gba:relative">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            className="gba:w-full gba:pl-9 gba:pr-3 gba:py-2 gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:text-sm gba:text-foreground gba:placeholder:text-muted-foreground gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-primary/20"
            data-testid="skill-studio-search"
          />
        </div>
        <button
          onClick={onCreate}
          className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-primary gba:text-primary-foreground gba:text-sm gba:font-medium gba:hover:bg-primary/90 gba:transition-colors gba:shrink-0"
          data-testid="skill-studio-create-button"
        >
          <PlusIcon className="gba:h-4 gba:w-4" />
          New Skill
        </button>
      </div>

      {error && (
        <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive gba:flex gba:items-center gba:gap-2">
          <span>{error}</span>
          <button onClick={onClearError} className="gba:ml-auto gba:text-xs gba:underline gba:hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading && (
        <div className="gba:space-y-2 gba:py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="gba:h-16 gba:rounded-lg gba:bg-muted/30 gba:animate-pulse"
              data-testid="skill-list-skeleton"
            />
          ))}
        </div>
      )}

      {!isLoading && skills.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:space-y-2">
          <p className="gba:text-sm gba:text-muted-foreground">No skills found</p>
          {searchQuery && (
            <button onClick={() => onSearch('')} className="gba:text-xs gba:text-primary gba:underline">
              Clear search
            </button>
          )}
        </div>
      )}

      {!isLoading && skills.length > 0 && (
        <div className="gba:space-y-1.5">
          {categories.map(category => {
            const categorySkills = skills.filter(s => s.category === category)
            return (
              <div key={category} className="gba:space-y-1.5">
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1">
                  <TagIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />
                  <span className="gba:text-[10px] gba:uppercase gba:tracking-widest gba:font-semibold gba:text-muted-foreground/60">
                    {category}
                  </span>
                  <span className="gba:text-[10px] gba:text-muted-foreground/40 gba:ml-auto">
                    {categorySkills.length}
                  </span>
                </div>
                {categorySkills.map(skill => (
                  <SkillCard key={skill.skill_id} skill={skill} onView={() => onView(skill.skill_id)} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {total > 0 && (
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
          {skills.length} of {total} skills
        </p>
      )}
    </div>
  )
}

interface SkillCardProps {
  skill: AdminSkill
  onView: () => void
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onView }) => {
  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:overflow-hidden gba:transition-colors gba:hover:bg-muted/35 gba:cursor-pointer"
      onClick={onView}
      data-testid={`skill-card-${skill.skill_id}`}
    >
      <div className="gba:flex gba:items-start gba:gap-3 gba:p-3">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:shrink-0">
          <span className="gba:text-sm">🔧</span>
        </div>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{skill.name}</p>
            <span
              className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded-full gba:text-[10px] gba:font-medium gba:shrink-0 ${
                skill.is_active
                  ? 'gba:bg-emerald-500/10 gba:text-emerald-600'
                  : 'gba:bg-muted/60 gba:text-muted-foreground'
              }`}
            >
              {skill.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">{skill.description}</p>

          <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2 gba:text-[10px] gba:text-muted-foreground/60">
            <span>v{skill.version}</span>
            {skill.files.length > 0 && (
              <span className="gba:flex gba:items-center gba:gap-0.5">
                <FilesIcon className="gba:h-3 gba:w-3" />
                {skill.files.length} files
              </span>
            )}
            {skill.tools.length > 0 && (
              <span className="gba:flex gba:items-center gba:gap-0.5">
                <WrenchIcon className="gba:h-3 gba:w-3" />
                {skill.tools.length} tools
              </span>
            )}
          </div>
        </div>

        <div className="gba:shrink-0 gba:text-muted-foreground/50">
          <CaretDownIcon className="gba:h-4 gba:w-4" />
        </div>
      </div>
    </div>
  )
}
