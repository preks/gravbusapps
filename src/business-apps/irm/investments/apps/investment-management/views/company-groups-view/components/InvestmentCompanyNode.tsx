import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Avatar, AvatarFallback, AvatarImage, useTranslation } from '@newwork/nw-design-system'
import { BuildingsIcon } from '@phosphor-icons/react'
import type { InvestmentCompanyGraphNode } from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const InvestmentCompanyNodeComponent: React.FC<NodeProps<InvestmentCompanyGraphNode>> = ({ data }) => {
  const { t } = useTranslation(translations)
  const avatarSrc = data.pictureThumbnail ? `data:image/jpeg;base64,${data.pictureThumbnail}` : undefined

  return (
    <button
      type="button"
      onClick={() => data.onOpenCompany(data.investmentCompanyId)}
      className="gba:relative gba:w-64 gba:overflow-hidden gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4 gba:text-left gba:shadow-md gba:transition hover:gba:border-primary hover:gba:shadow-lg"
      data-testid={`investment-company-graph-node-${data.investmentCompanyId}`}
    >
      <Handle type="target" position={Position.Top} className="gba:opacity-0" />
      <div className="gba:flex gba:items-start gba:gap-3">
        <Avatar className="gba:h-10 gba:w-10 gba:shrink-0 gba:border gba:border-primary/20 gba:bg-primary/10">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={data.name} />}
          <AvatarFallback>
            {data.name ? getInitials(data.name) : <BuildingsIcon className="gba:h-5 gba:w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{data.name}</div>
          <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{data.code || t('no-code')}</div>
        </div>
      </div>

      {data.description && (
        <p className="gba:mt-3 gba:line-clamp-2 gba:text-xs gba:text-muted-foreground">{data.description}</p>
      )}

      <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
        <span className="gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-1 gba:font-medium gba:text-primary">
          {t('owners-badge', { count: data.ownersCount })}
        </span>
        <span className="gba:rounded-full gba:bg-secondary gba:px-2 gba:py-1 gba:font-medium gba:text-secondary-foreground">
          {t('owns-badge', { count: data.ownedCompaniesCount })}
        </span>
        {Boolean(data.executives?.length) && (
          <span className="gba:rounded-full gba:bg-accent gba:px-2 gba:py-1 gba:font-medium gba:text-accent-foreground">
            {t('executives-badge', { count: data.executives?.length || 0 })}
          </span>
        )}
        {data.isExternalOwner && (
          <span className="gba:rounded-full gba:bg-destructive/10 gba:px-2 gba:py-1 gba:font-medium gba:text-destructive">
            {t('external-owner-badge')}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="gba:opacity-0" />
    </button>
  )
}

export const InvestmentCompanyNode = memo(InvestmentCompanyNodeComponent)
