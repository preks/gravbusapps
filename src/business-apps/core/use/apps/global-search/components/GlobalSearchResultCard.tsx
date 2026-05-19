import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { ArrowUpRightIcon, ClockCounterClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { SearchActionMenu, SearchItem, SearchSectionKind, SearchTarget } from '../types'
import { GlobalSearchActionSlot } from './GlobalSearchActionSlot'
import { HighlightedText } from './HighlightedText'
import * as PhosphorIcons from '@phosphor-icons/react'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { resolveOfficeFileLeadVisual, resolveSearchItemLeadIconName } from '../utils'

type GlobalSearchResultCardLayout = 'list' | 'swimlane' | 'peopleTopMatch'

const renderItemIcon = (iconName: string | undefined, className: string): React.ReactNode | null => {
  if (!iconName) {
    return null
  }

  const dynamicIconKey = iconName.endsWith('Icon') ? iconName : `${iconName}Icon`
  const IconComponent = (PhosphorIcons as Record<string, unknown>)[dynamicIconKey]
  const isRenderableIcon = typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent)
  if (!isRenderableIcon) {
    return null
  }

  const Component = IconComponent as React.ElementType<{ size?: number; className?: string }>
  return React.createElement(Component, { size: 16, className })
}

const resolveActionMenu = (item: SearchItem): SearchActionMenu | undefined => {
  if (item.actionMenu) {
    return item.actionMenu
  }
  if (item.primaryTarget?.kind === 'APP_ACTION') {
    return {
      variant: item.primaryTarget.variant,
      contexts: item.primaryTarget.contexts,
      customActions: item.primaryTarget.customActions,
      lazyLoad: item.primaryTarget.lazyLoad,
      autoExecute: item.primaryTarget.autoExecute
    }
  }
  return undefined
}

const resolveContentClassName = (layout: GlobalSearchResultCardLayout): string => {
  if (layout === 'peopleTopMatch') {
    return 'gba:flex gba:flex-1 gba:min-w-0 gba:flex-row gba:items-start gba:gap-3 gba:text-left'
  }
  if (layout === 'swimlane') {
    return 'gba:w-full gba:flex gba:flex-col gba:items-center gba:text-center'
  }
  return 'gba:flex gba:flex-1 gba:min-w-0 gba:items-center gba:gap-3 gba:text-left'
}

const resolveCardShellClass = (layout: GlobalSearchResultCardLayout): string => {
  if (layout === 'swimlane') {
    return 'gba:flex-none gba:w-40 gba:min-h-36 gba:p-2.5 gba:rounded-lg'
  }
  if (layout === 'peopleTopMatch') {
    return 'gba:flex gba:items-stretch gba:gap-3 gba:px-3 gba:py-3 gba:rounded-lg'
  }
  return 'gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-lg'
}

const resolveAvatarSizeClass = (layout: GlobalSearchResultCardLayout): string => {
  if (layout === 'swimlane') {
    return 'gba:w-14 gba:h-14 gba:mb-2'
  }
  if (layout === 'peopleTopMatch') {
    return 'gba:w-10 gba:h-10'
  }
  return 'gba:w-9 gba:h-9'
}

const resolveTitleClass = (layout: GlobalSearchResultCardLayout): string => {
  if (layout === 'swimlane') {
    return 'gba:text-xs gba:font-medium gba:line-clamp-1'
  }
  if (layout === 'peopleTopMatch') {
    return 'gba:text-sm gba:font-semibold gba:text-foreground gba:truncate'
  }
  return 'gba:min-w-0 gba:text-sm gba:font-medium'
}

const resolveDescriptionExtraClass = (layout: GlobalSearchResultCardLayout): string => {
  if (layout === 'swimlane' || layout === 'peopleTopMatch') {
    return 'gba:line-clamp-2'
  }
  return ''
}

const resolveTextBlockClass = (layout: GlobalSearchResultCardLayout): string => {
  if (layout === 'peopleTopMatch') {
    return 'gba:flex-1 gba:min-w-0'
  }
  if (layout === 'swimlane') {
    return 'gba:w-full'
  }
  return 'gba:min-w-0 gba:flex-1'
}

const resolveInitialsTextClass = (layout: GlobalSearchResultCardLayout): string =>
  layout === 'peopleTopMatch' ? 'gba:text-sm' : 'gba:text-xs'

const computeInitials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')

interface LeadVisualProps {
  item: SearchItem
  layout: GlobalSearchResultCardLayout
  shouldRenderIconLead: boolean
  leadIconName: string | undefined
  leadShellClass: string
  leadPhosphorIconClass: string
  resolvedImageUrl: string | undefined
  onImageError: () => void
  sectionKind?: SearchSectionKind
}

const LeadVisual: React.FC<LeadVisualProps> = ({
  item,
  layout,
  shouldRenderIconLead,
  leadIconName,
  leadShellClass,
  leadPhosphorIconClass,
  resolvedImageUrl,
  onImageError,
  sectionKind
}) => {
  const SectionLeadIcon = sectionKind === 'RECENT' ? ClockCounterClockwiseIcon : MagnifyingGlassIcon

  if (shouldRenderIconLead) {
    return (
      <span
        className={`gba:w-9 gba:h-9 gba:shrink-0 gba:flex gba:items-center gba:justify-center gba:rounded-md ${leadShellClass}`}
      >
        {renderItemIcon(leadIconName, leadPhosphorIconClass) ?? (
          <SectionLeadIcon size={16} className="gba:text-muted-foreground" />
        )}
      </span>
    )
  }

  const sizeClass = resolveAvatarSizeClass(layout)
  const backgroundClass = resolvedImageUrl ? 'gba:bg-muted' : leadShellClass
  const initials = computeInitials(item.name)

  return (
    <div
      className={`gba:flex gba:items-center gba:justify-center gba:rounded-full gba:overflow-hidden gba:shrink-0 ${sizeClass} ${backgroundClass}`}
    >
      {resolvedImageUrl ? (
        <img
          src={resolvedImageUrl}
          alt={item.name}
          loading="lazy"
          className="gba:w-full gba:h-full gba:object-cover"
          onError={onImageError}
        />
      ) : leadIconName ? (
        renderItemIcon(leadIconName, leadPhosphorIconClass)
      ) : (
        <span className={`gba:font-semibold gba:text-muted-foreground ${resolveInitialsTextClass(layout)}`}>
          {initials}
        </span>
      )}
    </div>
  )
}

const useResolvedImageUrl = (item: SearchItem, accessToken: string | undefined): string | undefined => {
  const [resolvedImageUrl, setResolvedImageUrl] = React.useState<string | undefined>(item.media?.imageUrl)
  const blobUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (blobUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (item.media?.imageUrl) {
      setResolvedImageUrl(item.media.imageUrl)
      return
    }

    const fileInfo = item.media?.fileInfo
    if (!fileInfo?.path) {
      setResolvedImageUrl(undefined)
      return
    }

    let cancelled = false

    const resolveAvatarUrl = async () => {
      try {
        const fileUrl = accessToken
          ? await buildFileUrl(fileInfo, accessToken)
          : await Promise.resolve(buildFileUrl(fileInfo))
        if (cancelled) {
          if (fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl)
          }
          return
        }

        if (fileUrl.startsWith('blob:')) {
          blobUrlRef.current = fileUrl
        }
        setResolvedImageUrl(fileUrl)
      } catch {
        if (!cancelled) {
          setResolvedImageUrl(undefined)
        }
      }
    }

    resolveAvatarUrl().catch(() => undefined)

    return () => {
      cancelled = true
      if (blobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [accessToken, item.media?.fileInfo, item.media?.imageUrl])

  return resolvedImageUrl
}

export interface GlobalSearchResultCardProps {
  item: SearchItem
  accessToken?: string
  active?: boolean
  layout?: GlobalSearchResultCardLayout
  leadingStyle?: 'avatar' | 'icon'
  sectionKind?: SearchSectionKind
  onSelect: (item: SearchItem) => void
  onTargetSelect: (target: SearchTarget) => void
  onActionExecute: () => void
}

export const GlobalSearchResultCard: React.FC<GlobalSearchResultCardProps> = ({
  item,
  accessToken,
  active = false,
  layout = 'list',
  leadingStyle = 'avatar',
  sectionKind,
  onSelect,
  onTargetSelect,
  onActionExecute
}) => {
  const isPeopleTopMatchLayout = layout === 'peopleTopMatch'
  const isSwimlane = layout === 'swimlane'
  const isListLayout = !isSwimlane && !isPeopleTopMatchLayout
  const shouldRenderIconLead = !isSwimlane && !isPeopleTopMatchLayout && leadingStyle === 'icon'

  const resolvedImageUrl = useResolvedImageUrl(item, accessToken)
  const [imageFailed, setImageFailed] = React.useState(false)
  const finalImageUrl = imageFailed ? undefined : resolvedImageUrl

  React.useEffect(() => {
    setImageFailed(false)
  }, [resolvedImageUrl])

  const resolvedActionMenu = resolveActionMenu(item)

  const officeLeadIcon = resolveSearchItemLeadIconName(item)
  const preferInitialsForPeopleTopMatch = isPeopleTopMatchLayout && !item.media?.imageUrl && !item.media?.fileInfo?.path
  const leadIconName = preferInitialsForPeopleTopMatch
    ? officeLeadIcon
    : (officeLeadIcon ?? item.media?.icon ?? item.media?.fallbackIcon)
  const officeFileVisual = resolveOfficeFileLeadVisual(officeLeadIcon)
  const useOfficeFileTint = officeLeadIcon != null && officeFileVisual != null && leadIconName === officeLeadIcon
  const leadShellClass = useOfficeFileTint ? officeFileVisual.containerClass : 'gba:bg-muted'
  const leadPhosphorIconClass = useOfficeFileTint ? officeFileVisual.iconClass : 'gba:text-muted-foreground'

  const isActionable = item.primaryTarget != null || item.type === 'QUERY' || item.id.startsWith('query:')
  const inactiveHoverClass = isActionable
    ? isPeopleTopMatchLayout
      ? 'gba:hover:bg-muted/70'
      : 'gba:hover:bg-muted/40'
    : ''
  const inactiveSurfaceClass = isPeopleTopMatchLayout
    ? `gba:bg-muted gba:border-border ${inactiveHoverClass}`
    : `gba:bg-card gba:border-border ${inactiveHoverClass}`
  const cardSurfaceClass = active
    ? 'gba:bg-accent gba:border-primary gba:ring-1 gba:ring-primary'
    : inactiveSurfaceClass

  const contentClassName = resolveContentClassName(layout)
  const cardShellClass = resolveCardShellClass(layout)
  const titleClass = resolveTitleClass(layout)
  const textBlockClass = resolveTextBlockClass(layout)
  const descriptionExtraClass = resolveDescriptionExtraClass(layout)

  const shouldRenderUrlTarget = item.primaryTarget?.kind === 'URL' && !resolvedActionMenu

  const titleRowClass = isSwimlane
    ? 'gba:flex gba:items-center gba:flex-col gba:gap-1'
    : 'gba:flex gba:items-center gba:min-w-0 gba:flex-wrap gba:gap-2'

  const content = (
    <>
      <LeadVisual
        item={item}
        layout={layout}
        shouldRenderIconLead={shouldRenderIconLead}
        leadIconName={leadIconName}
        leadShellClass={leadShellClass}
        leadPhosphorIconClass={leadPhosphorIconClass}
        resolvedImageUrl={finalImageUrl}
        onImageError={() => setImageFailed(true)}
        sectionKind={sectionKind}
      />

      <div className={textBlockClass}>
        <div className={titleRowClass}>
          <p className={titleClass}>
            {item.highlights?.name ? <HighlightedText text={item.highlights.name} /> : item.name}
          </p>
          {!isSwimlane && <Badge variant="outline">{item.typeLabel}</Badge>}
        </div>
        {item.description && (
          <p className={`gba:text-xs gba:text-muted-foreground gba:mt-0.5 ${descriptionExtraClass}`}>
            {item.highlights?.description ? <HighlightedText text={item.highlights.description} /> : item.description}
          </p>
        )}
      </div>
    </>
  )

  return (
    <div
      className={`gba:border gba:transition-colors gba:scroll-m-2 ${cardSurfaceClass} ${cardShellClass}`}
      data-testid={`GlobalSearchResultCard-${item.id}`}
      data-search-item-id={item.id}
    >
      {isActionable ? (
        <button
          type="button"
          className={contentClassName}
          onClick={() => onSelect(item)}
          data-testid={`GlobalSearchResultCard-Select-${item.id}`}
        >
          {content}
        </button>
      ) : (
        <div
          className={`${contentClassName} gba:pointer-events-none`}
          data-testid={`GlobalSearchResultCard-Select-${item.id}`}
        >
          {content}
        </div>
      )}

      {!isSwimlane && (
        <div
          className={`gba:flex gba:items-center gba:gap-1 ${
            isListLayout ? 'gba:ml-auto gba:shrink-0 gba:self-center' : ''
          }`}
        >
          <GlobalSearchActionSlot
            actionMenu={resolvedActionMenu}
            accessToken={accessToken}
            onCommandTarget={onTargetSelect}
            onActionExecute={onActionExecute}
          />
          {shouldRenderUrlTarget && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => item.primaryTarget && onTargetSelect(item.primaryTarget)}
              data-testid={`GlobalSearchResultCard-PrimaryTarget-${item.id}`}
            >
              <ArrowUpRightIcon size={14} />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
