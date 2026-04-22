/**
 * InsertTabContent Component
 *
 * Content for the Insert tab of the ribbon toolbar.
 * Contains element creation tools, templates, and AI tools.
 */

import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  ArrowRight,
  Hexagon,
  Minus,
  MessageSquare,
  Diamond,
  Image as ImageIcon,
  Code,
  Video,
  ChevronDown,
  BarChart2,
  LineChart,
  PieChart,
  AreaChart,
  Activity,
  Target
} from 'lucide-react'
import translations from '../../_i18n'
import type { AnySlideElement, SlideData, SlideTheme } from '../slideElements'
import { createTextElement, createShapeElement, createCodeElement, createChartElement } from '../slideElements'
import { TemplateBrowserButton } from '../TemplateBrowserButton'
import { SaveTemplateButton } from '../SaveTemplateButton'
import { RefineSlideButton } from '../RefineSlideButton'
import { GeneratePresentationButton } from '../GeneratePresentationButton'

export interface InsertTabContentProps {
  isSynced: boolean
  slides?: SlideData[]
  currentSlide?: SlideData
  accessToken?: string
  currentTheme?: SlideTheme
  onAddElement: (element: AnySlideElement) => void
  onShowImageDialog: () => void
  onShowVideoDialog: () => void
  onApplyTemplate: (
    slides: SlideData[],
    themeId: string,
    masters?: import('../../types/slideMaster').SlideMaster[]
  ) => void
  onRefineSlide?: () => void
  onGenerateSlides?: () => void
  testId?: string
}

export function InsertTabContent({
  isSynced,
  slides = [],
  currentSlide,
  accessToken,
  currentTheme,
  onAddElement,
  onShowImageDialog,
  onShowVideoDialog,
  onApplyTemplate,
  onRefineSlide,
  onGenerateSlides,
  testId
}: InsertTabContentProps) {
  const { t } = useTranslation(translations)

  const groupClass =
    'gba:flex gba:items-center gba:gap-1 gba:pr-3 gba:mr-1 gba:border-r gba:border-border/40 gba:border-t gba:border-t-border/40 gba:pt-1.5'
  const lastGroupClass = 'gba:flex gba:items-center gba:gap-1 gba:border-t gba:border-t-border/40 gba:pt-1.5'

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:-mt-1.5 gba:overflow-hidden">
      {/* Elements Group */}
      <div className={groupClass}>
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('insert-elements-group')}</span>

        {/* Text */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddElement(createTextElement({ position: { x: 100, y: 300 } }))}
          data-testid={testId ? `${testId}-add-text` : undefined}
        >
          <Type className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-text')}
        </Button>

        {/* Shapes dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid={testId ? `${testId}-shapes` : undefined}>
              <Square className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-shapes')}
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-48">
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-rectangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('rounded-rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:rounded" />
              {t('editor-rounded-rectangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('circle'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-circle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('triangle'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-triangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('diamond'))}>
              <Diamond className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-diamond')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('star'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-star')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('hexagon'))}>
              <Hexagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-hexagon')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('arrow-right'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-arrow-right')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('line'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-line')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('callout'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-callout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media Group */}
      <div className={groupClass}>
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('insert-media-group')}</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowImageDialog}
          data-testid={testId ? `${testId}-add-image` : undefined}
        >
          <ImageIcon className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-image')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowVideoDialog}
          data-testid={testId ? `${testId}-add-video` : undefined}
        >
          <Video className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-video')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddElement(createCodeElement(t('editor-code-placeholder') || '// Code here'))}
          data-testid={testId ? `${testId}-add-code` : undefined}
        >
          <Code className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-code')}
        </Button>

        {/* Charts dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid={testId ? `${testId}-charts` : undefined}>
              <BarChart2 className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('editor-chart')}
              <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:w-48">
            <DropdownMenuItem onClick={() => onAddElement(createChartElement('bar'))}>
              <BarChart2 className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-bar-chart')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createChartElement('line'))}>
              <LineChart className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-line-chart')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createChartElement('area'))}>
              <AreaChart className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-area-chart')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createChartElement('pie'))}>
              <PieChart className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-pie-chart')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAddElement(createChartElement('radar'))}>
              <Activity className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-radar-chart')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createChartElement('radial'))}>
              <Target className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-radial-chart')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Templates Group */}
      <div className={groupClass}>
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('insert-templates-group')}</span>

        <TemplateBrowserButton
          onApplyTemplate={onApplyTemplate}
          disabled={!isSynced}
          data-testid={testId ? `${testId}-template-browser` : undefined}
        />

        <SaveTemplateButton
          slides={slides}
          themeId={currentTheme?.id || 'corporate-blue'}
          disabled={!isSynced || slides.length === 0}
          data-testid={testId ? `${testId}-save-template` : undefined}
        />
      </div>

      {/* AI Tools Group */}
      <div className={lastGroupClass}>
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-2">{t('insert-ai-group')}</span>

        {currentSlide && accessToken && currentTheme && (
          <RefineSlideButton
            currentSlide={currentSlide}
            onRefine={onRefineSlide || (() => {})}
            accessToken={accessToken}
            theme={currentTheme}
            disabled={!isSynced}
            data-testid={testId ? `${testId}-refine` : undefined}
          />
        )}

        {accessToken && (
          <GeneratePresentationButton
            onGenerate={onGenerateSlides || (() => {})}
            accessToken={accessToken}
            disabled={!isSynced}
            data-testid={testId ? `${testId}-generate` : undefined}
          />
        )}
      </div>
    </div>
  )
}
