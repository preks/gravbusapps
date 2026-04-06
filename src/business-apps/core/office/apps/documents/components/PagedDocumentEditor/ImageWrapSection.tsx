import type { MouseEventHandler, SVGProps } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
  useTranslation
} from '@newwork/nw-design-system'
import {
  type CustomImageAttributes,
  type ImageWrapMode,
  type ImageWrapTextSide,
  type WordStyleWrapPreset,
  resolveWordStyleWrapPreset,
  resolveWordStyleWrapPresetUpdate
} from '@/components/tiptap-extensions/tiptap-custom-image'
import translations from '../../_i18n'
import { ImageSidebarSection } from './ImageSidebarSection'

type WrapPreviewProps = SVGProps<SVGSVGElement>

interface ImageWrapSectionProps {
  attrs: CustomImageAttributes
  wrapMode: ImageWrapMode
  wrapTextSide: ImageWrapTextSide
  updateImageAttrs: (nextAttrs: Partial<CustomImageAttributes>) => boolean
  onChoiceMouseDown: MouseEventHandler<HTMLElement>
  testId: string
}

type WrapOptionConfig = {
  value: WordStyleWrapPreset
  key: string
  icon: (props: WrapPreviewProps) => JSX.Element
}

const WORD_WRAP_OPTIONS: ReadonlyArray<WrapOptionConfig> = [
  { value: 'inline', key: 'image-wrap-inline', icon: InlineWrapPreview },
  { value: 'square-left', key: 'image-wrap-square-left', icon: SquareLeftWrapPreview },
  { value: 'square-right', key: 'image-wrap-square-right', icon: SquareRightWrapPreview },
  { value: 'behind-text', key: 'image-wrap-behind', icon: BehindTextWrapPreview },
  { value: 'in-front-of-text', key: 'image-wrap-in-front', icon: InFrontTextWrapPreview }
]

function InlineWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 18H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="18" y="12" width="12" height="10" rx="2" fill="currentColor" />
    </svg>
  )
}

function SquareLeftWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 14H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 20H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="10" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}

function SquareRightWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 14H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 20H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="26" y="10" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}

function BehindTextWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <rect x="16" y="9" width="16" height="14" rx="2" fill="currentColor" fillOpacity="0.28" />
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function InFrontTextWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="16" y="9" width="16" height="14" rx="2" fill="currentColor" />
    </svg>
  )
}

function WrapChoiceContent({
  active,
  icon: Icon,
  label,
  showSelectionIndicator = true
}: Readonly<{
  active: boolean
  icon: WrapOptionConfig['icon']
  label: string
  showSelectionIndicator?: boolean
}>) {
  return (
    <div className="gba:flex gba:w-full gba:items-center gba:gap-3">
      <span
        className={cn(
          'gba:flex gba:h-10 gba:w-12 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:border',
          active ? 'gba:border-primary/40 gba:bg-background' : 'gba:border-border/60 gba:bg-muted/30'
        )}
      >
        <Icon className="gba:h-6 gba:w-9" />
      </span>
      <span className="gba:min-w-0 gba:flex-1 gba:text-sm gba:font-medium gba:leading-snug">{label}</span>
      {showSelectionIndicator ? (
        <span
          className={cn(
            'gba:flex gba:h-5 gba:w-5 gba:shrink-0 gba:items-center gba:justify-center',
            active ? 'gba:text-primary' : 'gba:text-muted-foreground'
          )}
          aria-hidden
        >
          {active ? (
            <span className="gba:flex gba:h-5 gba:w-5 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-primary gba:bg-primary gba:text-primary-foreground">
              <Check className="gba:h-3.5 gba:w-3.5" weight="bold" />
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

export function ImageWrapSection({
  attrs,
  wrapMode,
  wrapTextSide,
  updateImageAttrs,
  onChoiceMouseDown,
  testId
}: Readonly<ImageWrapSectionProps>) {
  const { t } = useTranslation(translations)
  const selectedPreset = resolveWordStyleWrapPreset({
    wrapMode,
    align: attrs.align,
    wrapTextSide
  })
  const selectedOption = WORD_WRAP_OPTIONS.find(option => option.value === selectedPreset) ?? WORD_WRAP_OPTIONS[0]

  return (
    <ImageSidebarSection title={t('image-context-wrap-text')} data-testid={`${testId}-wrap-section`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="gba:h-auto gba:w-full gba:justify-start gba:rounded-xl gba:border gba:border-border/60 gba:bg-background gba:px-3 gba:py-3 hover:gba:bg-muted/40"
            onMouseDown={onChoiceMouseDown}
            data-testid={`${testId}-wrap-trigger`}
          >
            <WrapChoiceContent
              active
              icon={selectedOption.icon}
              label={t(selectedOption.key)}
              showSelectionIndicator={false}
            />
            <CaretDown className="gba:ml-2 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="gba:w-80 gba:max-w-full gba:p-2"
          data-document-image-sidebar-dropdown="true"
        >
          {WORD_WRAP_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => updateImageAttrs(resolveWordStyleWrapPresetUpdate(option.value, attrs))}
              className="gba:mb-1 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background gba:p-3 focus:gba:bg-accent"
              data-testid={`${testId}-wrap-${option.value}`}
            >
              <WrapChoiceContent active={selectedPreset === option.value} icon={option.icon} label={t(option.key)} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ImageSidebarSection>
  )
}
