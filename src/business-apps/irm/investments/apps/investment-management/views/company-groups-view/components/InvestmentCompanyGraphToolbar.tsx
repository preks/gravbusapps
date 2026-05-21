import React, { useEffect, useMemo, useRef } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useTranslation } from '@newwork/nw-design-system'
import {
  ArrowLineUpIcon,
  EyeIcon,
  FlowArrowIcon,
  LockIcon,
  MagnifyingGlassIcon,
  PercentIcon,
  TargetIcon,
  TreeStructureIcon,
  XIcon
} from '@phosphor-icons/react'
import type {
  InvestmentCompanyEdgeViewMode,
  InvestmentCompanyGraphNode,
  InvestmentCompanyRelationshipDisplayMode
} from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

interface InvestmentCompanyGraphToolbarProps {
  searchOpen: boolean
  searchQuery: string
  searchResults: InvestmentCompanyGraphNode[]
  searchResultCount: number
  relationshipDisplayMode: InvestmentCompanyRelationshipDisplayMode
  edgeViewMode: InvestmentCompanyEdgeViewMode
  onSearchOpenChange: (open: boolean) => void
  onSearchQueryChange: (query: string) => void
  onJumpToCompany: (investmentCompanyId: string) => void
  onJumpToFirstNode: () => void
  onRelationshipDisplayModeChange: (mode: InvestmentCompanyRelationshipDisplayMode) => void
  onEdgeViewModeChange: (mode: InvestmentCompanyEdgeViewMode) => void
  viewControlsDisabled: boolean
}

const getToolbarButtonClassName = (isActive: boolean, isDisabled = false): string => {
  if (isDisabled) {
    return 'gba:cursor-not-allowed gba:bg-muted gba:text-muted-foreground gba:opacity-50'
  }

  if (isActive) {
    return 'gba:bg-primary gba:text-primary-foreground'
  }

  return 'gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground'
}

export const InvestmentCompanyGraphToolbar: React.FC<InvestmentCompanyGraphToolbarProps> = ({
  searchOpen,
  searchQuery,
  searchResults,
  searchResultCount,
  relationshipDisplayMode,
  edgeViewMode,
  onSearchOpenChange,
  onSearchQueryChange,
  onJumpToCompany,
  onJumpToFirstNode,
  onRelationshipDisplayModeChange,
  onEdgeViewModeChange,
  viewControlsDisabled
}) => {
  const { t } = useTranslation(translations)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const hasQuery = Boolean(searchQuery.trim())

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
  }, [searchOpen])

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchResults[0]) {
      event.preventDefault()
      onJumpToCompany(searchResults[0].id)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onSearchOpenChange(false)
    }
  }
  const relationshipModeOptions = useMemo(
    () => [
      {
        id: 'all' as const,
        label: t('relationship-mode-all-label'),
        description: t('relationship-mode-all-description'),
        icon: EyeIcon
      },
      {
        id: 'hover' as const,
        label: t('relationship-mode-hover-label'),
        description: t('relationship-mode-hover-description'),
        icon: TargetIcon
      },
      {
        id: 'locked' as const,
        label: t('relationship-mode-locked-label'),
        description: t('relationship-mode-locked-description'),
        icon: LockIcon
      },
      ...(edgeViewMode === 'orthogonal'
        ? [
            {
              id: 'allPercentages' as const,
              label: t('relationship-mode-all-percentages-label'),
              description: t('relationship-mode-all-percentages-description'),
              icon: PercentIcon
            }
          ]
        : [])
    ],
    [edgeViewMode, t]
  )
  const edgeViewModeOptions = useMemo(
    () => [
      {
        id: 'curved' as const,
        label: t('edge-view-curved-label'),
        description: t('edge-view-curved-description'),
        icon: FlowArrowIcon
      },
      {
        id: 'orthogonal' as const,
        label: t('edge-view-orthogonal-label'),
        description: t('edge-view-orthogonal-description'),
        icon: TreeStructureIcon
      }
    ],
    [t]
  )

  return (
    <div className="gba:absolute gba:left-4 gba:top-4 gba:z-10 gba:flex gba:flex-col gba:gap-2">
      <div className="gba:flex gba:items-center gba:gap-2 gba:rounded-full gba:border gba:border-border gba:bg-background gba:p-1 gba:shadow-md">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSearchOpenChange(!searchOpen)}
                className={`gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:transition-colors ${getToolbarButtonClassName(searchOpen)}`}
                aria-label={t('graph-search-label')}
                data-testid="investment-company-graph-search-toggle"
              >
                <MagnifyingGlassIcon className="gba:h-4 gba:w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('graph-search-description')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onJumpToFirstNode}
                className={`gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:transition-colors ${getToolbarButtonClassName(false)}`}
                aria-label={t('graph-jump-top-label')}
                data-testid="investment-company-graph-jump-top"
              >
                <ArrowLineUpIcon className="gba:h-4 gba:w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="gba:max-w-56">
                <div className="gba:text-xs gba:font-semibold">{t('graph-jump-top-label')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('graph-jump-top-description')}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="gba:h-5 gba:w-px gba:bg-border" />
        <TooltipProvider>
          {edgeViewModeOptions.map(option => {
            const Icon = option.icon
            const isActive = edgeViewMode === option.id
            return (
              <Tooltip key={option.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onEdgeViewModeChange(option.id)}
                    className={`gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:transition-colors ${getToolbarButtonClassName(isActive)}`}
                    aria-label={option.label}
                    data-testid={`investment-company-graph-edge-view-${option.id}`}
                  >
                    <Icon className="gba:h-4 gba:w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="gba:max-w-56">
                    <div className="gba:text-xs gba:font-semibold">{option.label}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">{option.description}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
        <div className="gba:h-5 gba:w-px gba:bg-border" />
        <TooltipProvider>
          {relationshipModeOptions.map(option => {
            const Icon = option.icon
            const isActive = relationshipDisplayMode === option.id
            return (
              <Tooltip key={option.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onRelationshipDisplayModeChange(option.id)}
                    disabled={viewControlsDisabled}
                    className={`gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:transition-colors ${getToolbarButtonClassName(isActive, viewControlsDisabled)}`}
                    aria-label={option.label}
                    data-testid={`investment-company-graph-relationship-mode-${option.id}`}
                  >
                    <Icon className="gba:h-4 gba:w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="gba:max-w-56">
                    <div className="gba:text-xs gba:font-semibold">{option.label}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">{option.description}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </div>
      {searchOpen && (
        <div className="gba:w-80 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3 gba:shadow-lg">
          <div className="gba:flex gba:items-center gba:gap-2">
            <MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={event => onSearchQueryChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('graph-search-placeholder')}
              className="gba:min-w-0 gba:flex-1 gba:bg-transparent gba:text-sm gba:text-foreground gba:outline-none placeholder:gba:text-muted-foreground"
              data-testid="investment-company-graph-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="gba:inline-flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground"
                aria-label={t('graph-search-clear')}
              >
                <XIcon className="gba:h-3.5 gba:w-3.5" />
              </button>
            )}
          </div>
          {hasQuery && (
            <div className="gba:mt-3 gba:max-h-72 gba:overflow-auto">
              <div className="gba:px-3 gba:pb-2 gba:text-xs gba:text-muted-foreground">
                {t('graph-search-results-count', { count: searchResultCount })}
              </div>
              {searchResults.length > 0 ? (
                searchResults.map(node => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onJumpToCompany(node.id)}
                    className="gba:block gba:w-full gba:rounded-lg gba:px-3 gba:py-2 gba:text-left gba:transition-colors hover:gba:bg-accent"
                    data-testid={`investment-company-graph-search-result-${node.id}`}
                  >
                    <div className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{node.data.name}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">{node.data.code || t('no-code')}</div>
                  </button>
                ))
              ) : (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground">{t('graph-search-empty')}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
