import React from 'react'
import { Button } from '@newwork/nw-design-system'
import {
  FileTextIcon,
  FilePdfIcon,
  TableIcon,
  NoteIcon,
  PresentationIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  type Icon
} from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useDeskData, type ContentItem } from '@/business-apps/platform/apps/desk/hooks/useDeskData'
import { DESK_TYPE_COLOR_MAP } from '@/business-apps/platform/apps/desk/constants/deskColors'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import WorkplacePanel from './WorkplacePanel'
import { relativeFromNow } from '../utils/timeFormat'
import type { WorkplacePanelBaseProps } from '../types'

const TEST_ID = 'digital-workplace-documents'

const TYPE_ICON: Record<ContentItem['type'], Icon> = {
  document: FileTextIcon,
  spreadsheet: TableIcon,
  note: NoteIcon,
  slide: PresentationIcon,
  whiteboard: PencilSimpleLineIcon
}

interface ItemVisual {
  Glyph: Icon
  /** Token-based accent color (matches the Office app type palette). */
  color?: string
  /** Tinted square background derived from the accent color. */
  background?: string
  isPdf: boolean
}

/** Resolve the per-type icon + tinted background so each Office file type reads distinctly. */
function resolveItemVisual(item: ContentItem): ItemVisual {
  if (item.type === 'document' && item.isPdf) {
    return { Glyph: FilePdfIcon, isPdf: true }
  }
  const color = DESK_TYPE_COLOR_MAP[item.type]
  return {
    Glyph: TYPE_ICON[item.type] ?? FileTextIcon,
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    isPdf: false
  }
}

function openItem(item: ContentItem): void {
  switch (item.type) {
    case 'document':
      navigateTo(buildPlatformUrl(Navigation.OFFICE_DOCUMENTS, { docId: item.id, view: 'editor' }))
      return
    case 'spreadsheet':
      navigateTo(buildPlatformUrl(Navigation.OFFICE_SPREADSHEETS, { appId: item.id, view: 'viewer' }))
      return
    case 'note':
      navigateTo(buildPlatformUrl(Navigation.OFFICE_NOTES, { noteId: item.id, view: 'editor' }))
      return
    case 'slide':
      navigateTo(buildPlatformUrl(Navigation.OFFICE_SLIDES, { slideId: item.id, view: 'editor' }))
      return
    case 'whiteboard':
      navigateTo(buildPlatformUrl(Navigation.OFFICE_WHITEBOARDS, { whiteboardId: item.id }))
      return
    default:
  }
}

/** Recent Office content with continue-working deep-links and a create action. */
const DocumentsPanel: React.FC<WorkplacePanelBaseProps> = ({ context, className }) => {
  const { t } = useWorkplaceTranslation()
  const { recentItems, isLoading } = useDeskData(context.accessToken, context.userInfo?.id || '')

  return (
    <WorkplacePanel
      title={t('documents-title')}
      icon={FileTextIcon}
      count={recentItems.length}
      onTitleClick={() => navigateTo(Navigation.OFFICE)}
      titleActionLabel={t('documents-open')}
      className={className}
      testId={TEST_ID}
      loading={isLoading && recentItems.length === 0}
      errorTitle={t('error-title')}
      isEmpty={!isLoading && recentItems.length === 0}
      emptyTitle={t('documents-empty-title')}
      emptyDescription={t('documents-empty-desc')}
      action={
        <div className="gba:flex gba:items-center gba:gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo(Navigation.OFFICE)}
            data-testid={`${TEST_ID}-new`}
          >
            <PlusIcon className="gba:size-4" />
            {t('documents-new')}
          </Button>
        </div>
      }
    >
      <div className="gba:flex gba:flex-col gba:gap-2">
        {recentItems.map(item => {
          const { Glyph, color, background, isPdf } = resolveItemVisual(item)
          return (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => openItem(item)}
              className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
              data-testid={`${TEST_ID}-item-${item.id}`}
            >
              <span
                className={`gba:flex gba:size-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md ${
                  isPdf ? 'gba:bg-destructive/10' : ''
                }`}
                style={isPdf ? undefined : { backgroundColor: background }}
              >
                <Glyph
                  className={`gba:size-4 ${isPdf ? 'gba:text-destructive' : ''}`}
                  style={isPdf ? undefined : { color }}
                />
              </span>
              <div className="gba:min-w-0 gba:flex-1">
                <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
                  {item.title || t('documents-untitled')}
                </p>
                <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">
                  {t('documents-edited')} {relativeFromNow(item.updatedAt)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </WorkplacePanel>
  )
}

export default DocumentsPanel
export { DocumentsPanel }
