import type { MouseEventHandler, SVGProps } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
  useTranslation
} from '@newwork/nw-design-system'
import {
  IMAGE_WRAP_TEXT_SIDE_UI_OPTIONS,
  IMAGE_WRAP_UI_OPTIONS,
  resolveImageWrapPreset,
  resolveSquareWrapTextSideSelection,
  type CustomImageAttributes,
  type ImageWrapMode,
  type ImageWrapTextSide
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
  value: ImageWrapMode
  icon: (props: WrapPreviewProps) => JSX.Element
}

const WRAP_OPTION_GROUPS: ReadonlyArray<ReadonlyArray<ImageWrapMode>> = [
  ['inline'],
  ['square', 'tight', 'through', 'top-bottom'],
  ['behind', 'front']
]

const WRAP_OPTION_CONFIG: Readonly<Record<ImageWrapMode, WrapOptionConfig>> = {
  inline: { value: 'inline', icon: InlineWrapPreview },
  square: { value: 'square', icon: SquareWrapPreview },
  tight: { value: 'tight', icon: TightWrapPreview },
  through: { value: 'through', icon: ThroughWrapPreview },
  'top-bottom': { value: 'top-bottom', icon: TopBottomWrapPreview },
  behind: { value: 'behind', icon: BehindTextWrapPreview },
  front: { value: 'front', icon: InFrontTextWrapPreview }
}

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

function SquareWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 14H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 20H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="16" y="10" width="16" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}

function TightWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14C8 14 10 13 12 12C14 11 16 10 19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M29 10C32 10 34 11 36 12C38 13 40 14 44 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M4 20C8 20 10 21 12 22C14 23 16 24 19 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M29 24C32 24 34 23 36 22C38 21 40 20 44 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="19" y="10" width="10" height="14" rx="2" fill="currentColor" />
    </svg>
  )
}

function ThroughWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 13C8 13 10 12 12 11C14 10 16 9 19 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 9C32 9 34 10 36 11C38 12 40 13 44 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 16H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 16H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 23C8 23 10 22 12 21C14 20 16 19 19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M29 19C32 19 34 20 36 21C38 22 40 23 44 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="19" y="9" width="10" height="14" rx="2" fill="currentColor" />
    </svg>
  )
}

function TopBottomWrapPreview(props: WrapPreviewProps) {
  return (
    <svg viewBox="0 0 48 32" fill="none" aria-hidden {...props}>
      <path d="M4 8H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="16" y="10" width="16" height="12" rx="2" fill="currentColor" />
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
  const selectedOption = IMAGE_WRAP_UI_OPTIONS.find(option => option.value === wrapMode) ?? IMAGE_WRAP_UI_OPTIONS[0]
  const selectedConfig = WRAP_OPTION_CONFIG[selectedOption.value]

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
              icon={selectedConfig.icon}
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
          {WRAP_OPTION_GROUPS.map((group, groupIndex) => (
            <div key={group.join('-')}>
              {group.map(value => {
                const option = IMAGE_WRAP_UI_OPTIONS.find(candidate => candidate.value === value)

                if (!option) {
                  return null
                }

                const config = WRAP_OPTION_CONFIG[value]

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => updateImageAttrs(resolveImageWrapPreset(option.value, attrs))}
                    className="gba:mb-1 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background gba:p-3 focus:gba:bg-accent"
                    data-testid={`${testId}-wrap-${option.value}`}
                  >
                    <WrapChoiceContent active={wrapMode === option.value} icon={config.icon} label={t(option.key)} />
                  </DropdownMenuItem>
                )
              })}
              {groupIndex < WRAP_OPTION_GROUPS.length - 1 ? <DropdownMenuSeparator className="gba:my-2" /> : null}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {wrapMode === 'square' ? (
        <div className="gba:space-y-2 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background gba:p-3">
          <span className="gba:block gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            {t('image-wrap-text-side')}
          </span>
          <div className="gba:grid gba:grid-cols-3 gba:gap-1.5">
            {IMAGE_WRAP_TEXT_SIDE_UI_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={wrapTextSide === option.value ? 'secondary' : 'outline'}
                size="sm"
                className="gba:h-auto gba:min-h-10 gba:whitespace-normal gba:px-2.5 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:leading-snug"
                onMouseDown={onChoiceMouseDown}
                onClick={() => updateImageAttrs(resolveSquareWrapTextSideSelection(option.value, attrs))}
                data-testid={`${testId}-wrap-text-side-${option.value}`}
              >
                {t(option.key)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </ImageSidebarSection>
  )
}
