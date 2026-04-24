/**
 * TemplateCard Component
 *
 * Card component for displaying a template in the browser grid.
 * Shows thumbnail preview of first slide and template metadata.
 */

import React, { useRef, useState, useEffect } from 'react'
import { Button, Badge, useTranslation, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import {
  Briefcase,
  Palette,
  Minimize2,
  Folder,
  Trash2,
  Globe,
  Lock,
  MoreVertical,
  Building2,
  Sparkles
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@newwork/nw-design-system'
import type { SlideTemplateSummary, TemplateCategory } from '../types'
import type { SlideData, SlideBackground } from './slideElements'
import { gradientToCss } from './slideElements'
import translations from '../_i18n'
import { sanitizeSlideImageUrl } from '../utils/slideMediaUrl'

const sanitizeMediaUrl = sanitizeSlideImageUrl

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

const getBackgroundStyle = (background: SlideBackground): React.CSSProperties => {
  switch (background.type) {
    case 'gradient':
      return background.gradient ? { background: gradientToCss(background.gradient) } : {}
    case 'branded': {
      const layers: string[] = []
      if (background.overlay) {
        layers.push(gradientToCss(background.overlay))
      }
      if (background.gradient) {
        layers.push(gradientToCss(background.gradient))
      }
      const baseColor = background.color || '#0a0a0a'
      if (layers.length > 0) {
        return { background: `${layers.join(', ')}, ${baseColor}` }
      }
      return { backgroundColor: baseColor }
    }
    case 'image':
      return background.imageUrl
        ? { backgroundImage: `url(${background.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {}
    case 'video':
      return { backgroundColor: '#000000' }
    default:
      return { backgroundColor: background.color || '#ffffff' }
  }
}

export interface TemplateCardProps {
  template: SlideTemplateSummary
  previewSlide?: SlideData
  onSelect: (template: SlideTemplateSummary) => void
  onDelete?: (template: SlideTemplateSummary) => void
  isSelected?: boolean
  'data-testid'?: string
}

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  business: <Briefcase className="gba:w-3 gba:h-3" />,
  creative: <Palette className="gba:w-3 gba:h-3" />,
  minimal: <Minimize2 className="gba:w-3 gba:h-3" />,
  custom: <Folder className="gba:w-3 gba:h-3" />,
  branded: <Building2 className="gba:w-3 gba:h-3" />
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  previewSlide,
  onSelect,
  onDelete,
  isSelected = false,
  'data-testid': testId = 'template-card'
}) => {
  const { t } = useTranslation(translations)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.15)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        setScale(containerWidth / SLIDE_WIDTH)
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div
      className={`gba:group gba:relative gba:rounded-lg gba:border-2 gba:overflow-hidden gba:cursor-pointer gba:transition-all hover:gba:shadow-lg ${
        isSelected ? 'gba:border-primary gba:shadow-md' : 'gba:border-border hover:gba:border-primary/50'
      }`}
      onClick={() => onSelect(template)}
      data-testid={testId}
    >
      {/* Thumbnail Preview */}
      <div
        ref={containerRef}
        className="gba:relative gba:overflow-hidden gba:bg-muted"
        style={{ aspectRatio: '16 / 9' }}
      >
        {previewSlide ? (
          <div
            className="gba:absolute gba:inset-0"
            style={getBackgroundStyle(previewSlide.background || { type: 'solid', color: '#ffffff' })}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: SLIDE_WIDTH,
                height: SLIDE_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }}
            >
              {(previewSlide.elements || []).slice(0, 8).map(el => (
                <div
                  key={el.id}
                  className="gba:absolute gba:overflow-hidden"
                  style={{
                    left: el.position.x,
                    top: el.position.y,
                    width: el.size.width,
                    height: el.size.height,
                    backgroundColor: el.type === 'shape' ? (el as any).fill : 'transparent'
                  }}
                >
                  {el.type === 'text' && (
                    <div
                      className="gba:w-full gba:h-full gba:overflow-hidden"
                      style={{
                        color: (el as any).color,
                        fontSize: (el as any).fontSize,
                        fontWeight: (el as any).fontWeight,
                        fontFamily: (el as any).fontFamily,
                        textAlign: (el as any).textAlign,
                        lineHeight: (el as any).lineHeight || 1.2
                      }}
                    >
                      {(el as any).content}
                    </div>
                  )}
                  {el.type === 'image' && sanitizeMediaUrl((el as any).src) && (
                    <img
                      src={sanitizeMediaUrl((el as any).src)}
                      alt=""
                      className="gba:w-full gba:h-full gba:object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-muted">
            <Folder className="gba:w-12 gba:h-12 gba:text-muted-foreground/30" />
          </div>
        )}

        {/* Slide count badge */}
        <div className="gba:absolute gba:top-2 gba:right-2 gba:px-2 gba:py-0.5 gba:rounded gba:bg-black/60 gba:text-white gba:text-xs gba:font-medium">
          {template.slideCount} {template.slideCount === 1 ? 'slide' : 'slides'}
        </div>

        {/* Visibility and structured metadata indicators */}
        <div className="gba:absolute gba:top-2 gba:left-2 gba:flex gba:gap-1">
          {template.isPublic ? (
            <div className="gba:p-1 gba:rounded gba:bg-black/60" title={t('template-public') || 'Public'}>
              <Globe className="gba:w-3 gba:h-3 gba:text-white" />
            </div>
          ) : (
            <div className="gba:p-1 gba:rounded gba:bg-black/60" title={t('template-private') || 'Private'}>
              <Lock className="gba:w-3 gba:h-3 gba:text-white" />
            </div>
          )}
          {template.hasStructuredMeta && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="gba:p-1 gba:rounded gba:bg-primary/80" data-testid={`${testId}-structured-badge`}>
                  <Sparkles className="gba:w-3 gba:h-3 gba:text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('template-ai-optimized') || 'AI-optimized template'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Actions overlay */}
        {template.isOwner && onDelete && (
          <div className="gba:absolute gba:bottom-2 gba:right-2 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="gba:h-7 gba:w-7"
                  onClick={e => e.stopPropagation()}
                >
                  <MoreVertical className="gba:w-4 gba:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="gba:text-destructive"
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(template)
                  }}
                >
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('template-delete') || 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="gba:p-3 gba:space-y-1">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <h3 className="gba:font-medium gba:text-sm gba:line-clamp-1" title={template.name}>
            {template.name}
          </h3>
          <Badge variant="secondary" className="gba:flex-shrink-0 gba:text-[10px] gba:px-1.5 gba:py-0">
            <span className="gba:flex gba:items-center gba:gap-1">
              {CATEGORY_ICONS[template.category]}
              {t(`template-category-${template.category}`) || template.category}
            </span>
          </Badge>
        </div>
        {template.branding && (
          <Badge
            variant="outline"
            className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:text-primary gba:border-primary/30"
          >
            <Building2 className="gba:w-2.5 gba:h-2.5 gba:mr-1" />
            {template.branding.companyName}
          </Badge>
        )}
        {template.description && (
          <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{template.description}</p>
        )}
      </div>
    </div>
  )
}

export default TemplateCard
