import { PackageIcon, SparkleIcon } from '@phosphor-icons/react'

export interface ActiveSkillInfo {
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  was_auto_detected: boolean
}

interface WorkspaceSkillIndicatorProps {
  skill: ActiveSkillInfo | null
}

export const WorkspaceSkillIndicator: React.FC<WorkspaceSkillIndicatorProps> = ({ skill }) => {
  if (!skill) return null

  return (
    <div
      className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:transition-colors"
      data-testid="fabric-workspace-skill-indicator"
    >
      <div className="gba:flex gba:items-center gba:gap-1.5">
        {skill.icon ? (
          <span className="gba:text-sm gba:leading-none">{skill.icon}</span>
        ) : (
          <PackageIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" weight="bold" />
        )}
        <span className="gba:text-foreground gba:max-w-[120px] gba:truncate" title={skill.name}>
          {skill.name}
        </span>
      </div>
      {skill.was_auto_detected && (
        <span
          className="gba:inline-flex gba:items-center gba:gap-0.5 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted/60 gba:text-[10px] gba:text-muted-foreground"
          title="Automatically detected based on your task"
        >
          <SparkleIcon className="gba:h-2.5 gba:w-2.5" weight="fill" />
          auto
        </span>
      )}
    </div>
  )
}
