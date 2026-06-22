import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

export interface ActiveSkillInfo {
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  was_auto_detected: boolean
  version?: number
  published_version?: number | null
  current_version?: number
}

interface WorkspaceSkillIndicatorProps {
  skill: ActiveSkillInfo | null
}

export const WorkspaceSkillIndicator: React.FC<WorkspaceSkillIndicatorProps> = ({ skill }) => {
  const { t } = useTranslation(translations)

  if (!skill) return null

  let versionTitle: string | undefined
  if (skill.version != null) {
    if (skill.current_version != null && skill.version !== skill.current_version) {
      versionTitle = t('workspace-skill-version-draft', { version: skill.version, draft: skill.current_version })
    } else {
      versionTitle = t('workspace-skill-version-loaded', { version: skill.version })
    }
  }

  return (
    <div
      className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:transition-colors"
      data-testid="fabric-workspace-skill-indicator"
    >
      <div className="gba:flex gba:items-center gba:gap-1.5">
        <span className="gba:text-foreground gba:max-w-[120px] gba:truncate" title={skill.name}>
          {skill.name}
        </span>
        {skill.version != null && (
          <span
            className="gba:shrink-0 gba:rounded gba:bg-muted/60 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
            data-testid="fabric-workspace-skill-version"
            title={versionTitle}
          >
            v{skill.version}
          </span>
        )}
      </div>
      {skill.was_auto_detected && (
        <span
          className="gba:inline-flex gba:items-center gba:gap-0.5 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted/60 gba:text-[10px] gba:text-muted-foreground"
          title={t('workspace-skill-auto-tooltip')}
        >
          {t('workspace-skill-auto')}
        </span>
      )}
    </div>
  )
}
