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
  DropdownMenuLabel,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Hexagon,
  Minus,
  MessageSquare,
  Diamond,
  Image as ImageIcon,
  Code,
  Video,
  ChevronDown,
  ChevronRight,
  Cylinder,
  Pentagon,
  Octagon,
  Plus,
  X,
  BarChart2,
  LineChart,
  PieChart,
  AreaChart,
  Activity,
  Target,
  Spline
} from 'lucide-react'
import translations from '../../_i18n'
import type { AnySlideElement, SlideData, SlideTheme } from '../slideElements'
import {
  createTextElement,
  createShapeElement,
  createShapeFromPreset,
  createCodeElement,
  createChartElement,
  createConnectorElement
} from '../slideElements'
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
  onAddElement: (element: AnySlideElement, options?: { positionMode?: 'center' | 'preserve' }) => void
  onShowImageDialog: () => void
  onShowVideoDialog: () => void
  onApplyTemplate: (
    slides: SlideData[],
    themeId: string,
    masters?: import('../../types/slideMaster').SlideMaster[]
  ) => void
  onRefineSlide?: (refinedSlide: SlideData) => void
  onGenerateSlides?: (
    slides: SlideData[],
    title: string,
    matchedTemplate?: { id: string; name: string; themeId?: string }
  ) => void
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
          <DropdownMenuContent className="gba:w-64 gba:max-h-[28rem] gba:overflow-y-auto">
            {/* === Rectangles === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-rectangles')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-rectangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('rounded-rectangle'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:rounded" />
              {t('editor-rounded-rectangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('snip1Rect'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-snip1Rect')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('snip2SameRect'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-snip2SameRect')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Basic Shapes === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-basic')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('circle'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-circle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('ellipse'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2 gba:scale-x-150" />
              {t('editor-ellipse')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('triangle'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-triangle')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('diamond'))}>
              <Diamond className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-diamond')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('parallelogram'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:-skew-x-12" />
              {t('editor-parallelogram')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('trapezoid'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2 gba:rotate-180" />
              {t('editor-trapezoid')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('pentagon'))}>
              <Pentagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-pentagon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('hexagon'))}>
              <Hexagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-hexagon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('heptagon'))}>
              <Hexagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-heptagon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('octagon'))}>
              <Octagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-octagon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('decagon'))}>
              <Octagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-decagon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('dodecagon'))}>
              <Octagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-dodecagon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('plus'))}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-plus')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('cross'))}>
              <X className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-cross')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('can'))}>
              <Cylinder className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-cylinder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('bevel'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-bevel')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('heart'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-heart')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('sun'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-sun')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('moon'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-moon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('cloud'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-cloud')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('lightningBolt'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-lightningBolt')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('smileyFace'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-smileyFace')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('teardrop'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-teardrop')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('donut'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-donut')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('pie'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-pie')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('chord'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-chord')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('arc'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-arc')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('noSmoking'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-noSmoking')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('frame'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-frame')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('halfFrame'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-halfFrame')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('corner'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-corner')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('diagStripe'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-diagStripe')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('leftBracket'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-leftBracket')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('rightBracket'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-rightBracket')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('leftBrace'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-leftBrace')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('rightBrace'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-rightBrace')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Block Arrows === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-block-arrows')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('arrow-right'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-arrow-right')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('arrow-left'))}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-arrow-left')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('arrow-up'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-arrow-up')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('arrow-down'))}>
              <ArrowDown className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-arrow-down')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('chevron'))}>
              <ChevronRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-chevron')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('leftRightArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-leftRightArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('upDownArrow'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-upDownArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('quadArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-quadArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('leftRightUpArrow'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-leftRightUpArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('bentArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-bentArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('bentUpArrow'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-bentUpArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('uturnArrow'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-uturnArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('circularArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-circularArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('curvedRightArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-curvedRightArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('curvedLeftArrow'))}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-curvedLeftArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('curvedUpArrow'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-curvedUpArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('curvedDownArrow'))}>
              <ArrowDown className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-curvedDownArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('stripedRightArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-stripedRightArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('swooshArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-swooshArrow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('leftArrowCallout'))}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-leftArrowCallout')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('rightArrowCallout'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-rightArrowCallout')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('upArrowCallout'))}>
              <ArrowUp className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-upArrowCallout')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('downArrowCallout'))}>
              <ArrowDown className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-downArrowCallout')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('notchedRightArrow'))}>
              <ArrowRight className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-notchedRightArrow')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Equation Shapes === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-equation')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('mathPlus'))}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-mathPlus')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('mathMinus'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-mathMinus')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('mathMultiply'))}>
              <X className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-mathMultiply')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('mathDivide'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-mathDivide')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('mathEqual'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-mathEqual')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('mathNotEqual'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-mathNotEqual')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Flowchart === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-flowchart')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('flowchart-process'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-flowchart-process')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('flowchart-decision'))}>
              <Diamond className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-flowchart-decision')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('flowchart-terminator'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2 gba:scale-x-150" />
              {t('editor-flowchart-terminator')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('flowchart-alternate'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:rounded" />
              {t('editor-flowchart-alternate')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartInputOutput'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:-skew-x-12" />
              {t('editor-shape-flowChartInputOutput')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartDocument'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartDocument')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartMultidocument'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartMultidocument')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartConnector'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartConnector')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartPunchedCard'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartPunchedCard')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartPunchedTape'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartPunchedTape')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartPreparation'))}>
              <Hexagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartPreparation')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartManualOperation'))}>
              <Triangle className="gba:w-4 gba:h-4 gba:mr-2 gba:rotate-180" />
              {t('editor-shape-flowChartManualOperation')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartManualInput'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartManualInput')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartInternalStorage'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartInternalStorage')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartDelay'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2 gba:rounded-r-full" />
              {t('editor-shape-flowChartDelay')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartDisplay'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartDisplay')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartPredefinedProcess'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartPredefinedProcess')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartMagneticDisk'))}>
              <Cylinder className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartMagneticDisk')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartOffpageConnector'))}>
              <Pentagon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartOffpageConnector')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartStoredData'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartStoredData')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartSummingJunction'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartSummingJunction')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('flowChartOr'))}>
              <Circle className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-flowChartOr')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Stars and Banners === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-stars-banners')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('star'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-star')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star4'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star4')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star6'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star6')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star7'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star7')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star8'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star8')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star10'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star10')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star12'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star12')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star16'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star16')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star24'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star24')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('star32'))}>
              <Star className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-star32')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('ribbon'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-ribbon')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('ribbon2'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-ribbon2')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('verticalScroll'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-verticalScroll')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('horizontalScroll'))}>
              <Square className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-horizontalScroll')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('wave'))}>
              <Spline className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-wave')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('doubleWave'))}>
              <Spline className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-doubleWave')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Callouts === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-callouts')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('callout'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-callout')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('cloudCallout'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-cloudCallout')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('lineCallout1'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-lineCallout1')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('lineCallout2'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-lineCallout2')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddElement(createShapeFromPreset('lineCallout3'))}>
              <MessageSquare className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-shape-lineCallout3')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            {/* === Lines & Connectors === */}
            <DropdownMenuLabel className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
              {t('insert-shape-group-lines')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddElement(createShapeElement('line'))}>
              <Minus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-line')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAddElement(createConnectorElement({ x: 100, y: 100 }, { x: 300, y: 200 }, { lineType: 'straight' }))
              }
              data-testid={testId ? `${testId}-connector-straight` : undefined}
            >
              <Spline className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-connector-straight')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAddElement(createConnectorElement({ x: 100, y: 100 }, { x: 300, y: 200 }, { lineType: 'elbow' }))
              }
              data-testid={testId ? `${testId}-connector-elbow` : undefined}
            >
              <Spline className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-connector-elbow')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAddElement(createConnectorElement({ x: 100, y: 100 }, { x: 300, y: 200 }, { lineType: 'curved' }))
              }
              data-testid={testId ? `${testId}-connector-curved` : undefined}
            >
              <Spline className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('editor-connector-curved')}
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
