import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { GitBranch, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RepositoryInfoProps {
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'indexing'
}

export const RepositoryInfo: React.FC<RepositoryInfoProps> = ({ name, url, status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="gba:w-3 gba:h-3" />,
          label: getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.repository.connected', 'Connected'),
          className: 'gba:bg-success gba:text-success-foreground'
        }
      case 'disconnected':
        return {
          icon: <XCircle className="gba:w-3 gba:h-3" />,
          label: getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.repository.disconnected', 'Disconnected'),
          className: 'gba:bg-destructive gba:text-destructive-foreground'
        }
      case 'indexing':
        return {
          icon: <GitBranch className="gba:w-3 gba:h-3 gba:animate-spin" />,
          label: getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.repository.indexing', 'Indexing'),
          className: 'gba:bg-warning gba:text-warning-foreground'
        }
      default:
        return {
          icon: <GitBranch className="gba:w-3 gba:h-3" />,
          label: getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.repository.unknown', 'Unknown'),
          className: 'gba:bg-muted gba:text-muted-foreground'
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-muted gba:rounded-lg gba:border"
      data-testid="ai-builder-repository-info"
    >
      <GitBranch className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
      <div className="gba:text-xs">
        <div className="gba:font-medium gba:text-foreground">{name}</div>
        <div className="gba:text-muted-foreground gba:text-[10px]">{url.replace('https://github.com/', '')}</div>
      </div>
      <Badge
        variant="secondary"
        className={cn(
          'gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1',
          statusConfig.className
        )}
      >
        {statusConfig.icon}
        {statusConfig.label}
      </Badge>
    </div>
  )
}
