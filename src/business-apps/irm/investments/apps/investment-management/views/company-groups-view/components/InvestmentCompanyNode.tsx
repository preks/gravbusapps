import React, { memo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { BuildingsIcon, LockIcon, LockOpenIcon } from '@phosphor-icons/react'
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
  const [isLockActionHovered, setLockActionHovered] = useState(false)
  const skipLockActionClickRef = useRef(false)
  const avatarSrc = data.pictureThumbnail ? `data:image/jpeg;base64,${data.pictureThumbnail}` : undefined
  const highlightClass = data.isHighlighted
    ? 'gba:border-primary gba:shadow-lg gba:ring-2 gba:ring-primary/20'
    : 'gba:border-border gba:shadow-md'
  const dimClass = data.isDimmed ? 'gba:opacity-40' : 'gba:opacity-100'
  const openCompany = () => data.onOpenCompany(data.investmentCompanyId)
  const handleUnlockClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (skipLockActionClickRef.current) {
      skipLockActionClickRef.current = false
      return
    }

    data.onUnlockCompany?.(data.investmentCompanyId)
  }
  const handleLockClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (skipLockActionClickRef.current) {
      skipLockActionClickRef.current = false
      return
    }

    data.onLockCompany?.(data.investmentCompanyId)
  }
  const handleLockActionPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    skipLockActionClickRef.current = true

    if (data.isLocked) {
      data.onUnlockCompany?.(data.investmentCompanyId)
      return
    }

    data.onLockCompany?.(data.investmentCompanyId)
  }
  const shouldShowLockAction = data.canLock || data.isLocked
  const showLockedIcon = data.isLocked ? !isLockActionHovered : isLockActionHovered

  return (
    <div
      onMouseEnter={() => data.onHoverCompany?.(data.investmentCompanyId)}
      onMouseLeave={() => data.onHoverCompany?.()}
      onFocus={() => data.onHoverCompany?.(data.investmentCompanyId)}
      onBlur={() => data.onHoverCompany?.()}
      className={`gba:relative gba:w-64 gba:overflow-visible gba:rounded-xl gba:border gba:bg-background gba:p-4 gba:text-left gba:transition-all hover:gba:border-primary hover:gba:shadow-lg ${highlightClass} ${dimClass}`}
      data-testid={`investment-company-graph-node-${data.investmentCompanyId}`}
    >
      <Handle type="target" position={Position.Top} className="gba:opacity-0" />
      {shouldShowLockAction && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={data.isLocked ? handleUnlockClick : handleLockClick}
                onPointerDown={handleLockActionPointerDown}
                onMouseEnter={() => setLockActionHovered(true)}
                onMouseLeave={() => setLockActionHovered(false)}
                onFocus={() => setLockActionHovered(true)}
                onBlur={() => setLockActionHovered(false)}
                className={`gba:absolute gba:-right-4 gba:-top-4 gba:z-10 gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:border gba:bg-background gba:shadow-sm gba:transition-colors ${
                  showLockedIcon
                    ? 'gba:border-success/30 gba:bg-success-secondary/60'
                    : 'gba:border-border gba:bg-background'
                }`}
                aria-label={data.isLocked ? t('unlock-edge-lock') : t('lock-edge-label')}
                data-testid={
                  data.isLocked
                    ? `investment-company-graph-node-unlock-${data.investmentCompanyId}`
                    : `investment-company-graph-node-lock-${data.investmentCompanyId}`
                }
              >
                {showLockedIcon ? (
                  <LockIcon className="gba:h-4 gba:w-4 gba:text-success" />
                ) : (
                  <LockOpenIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{data.isLocked ? t('unlock-edge-lock') : t('lock-edge-label')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <button
        type="button"
        onClick={openCompany}
        className="gba:block gba:w-full gba:appearance-none gba:bg-transparent gba:p-0 gba:text-left gba:text-foreground gba:focus:outline-none"
      >
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
      </button>
      <Handle type="source" position={Position.Bottom} className="gba:opacity-0" />
    </div>
  )
}

export const InvestmentCompanyNode = memo(InvestmentCompanyNodeComponent)
