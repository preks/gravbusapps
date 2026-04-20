import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger, useTranslation } from '@newwork/nw-design-system'
import EmojiPicker, { type EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react'
import { ImageIcon, Smile, X, Palette, PencilLine } from 'lucide-react'
import { COVER_GRADIENTS } from './useRowPageCover'
import translations from '../../_i18n'

interface RowPageHeaderProps {
  title: string
  onTitleChange: (value: string) => void
  icon: string | null
  onIconChange: (emoji: string | null) => void
  coverImage: string | null
  onCoverChange: (value: string | null) => void
  onCoverUpload: () => void
  isUploadingCover: boolean
  'data-testid'?: string
}

export function RowPageHeader({
  title,
  onTitleChange,
  icon,
  onIconChange,
  coverImage,
  onCoverChange,
  onCoverUpload,
  isUploadingCover,
  'data-testid': testId = 'row-page-header'
}: RowPageHeaderProps) {
  const { t } = useTranslation(translations)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      onIconChange(emojiData.emoji)
      setShowEmojiPicker(false)
    },
    [onIconChange]
  )

  const autoResizeTitle = useCallback(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    autoResizeTitle()
  }, [title, autoResizeTitle])

  const hasCover = !!coverImage
  const isGradient = coverImage?.startsWith('linear-gradient')
  const coverStyle: React.CSSProperties = hasCover
    ? isGradient
      ? { background: coverImage! }
      : { backgroundImage: `url("${coverImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}

  return (
    <div data-testid={testId}>
      {/* Cover image area */}
      {hasCover && (
        <div
          className="gba:relative gba:h-44 gba:w-full gba:group gba:transition-all gba:duration-300"
          style={coverStyle}
          data-testid={`${testId}-cover`}
        >
          <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-t gba:from-card/60 gba:to-transparent" />
          <div className="gba:absolute gba:top-3 gba:right-3 gba:flex gba:gap-1 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity">
            <Popover open={showCoverPicker} onOpenChange={setShowCoverPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gba:h-7 gba:text-xs gba:shadow-sm"
                  data-testid={`${testId}-cover-change`}
                >
                  <PencilLine className="gba:h-3 gba:w-3 gba:mr-1" />
                  {t('common-rename')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gba:w-72 gba:p-3" align="end" side="bottom">
                <CoverPicker
                  onSelectGradient={g => {
                    onCoverChange(g)
                    setShowCoverPicker(false)
                  }}
                  onUpload={() => {
                    onCoverUpload()
                    setShowCoverPicker(false)
                  }}
                  testId={`${testId}-cover-picker`}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="secondary"
              size="icon"
              className="gba:h-7 gba:w-7 gba:shadow-sm"
              onClick={() => onCoverChange(null)}
              data-testid={`${testId}-cover-remove`}
            >
              <X className="gba:h-3 gba:w-3" />
            </Button>
          </div>
          {isUploadingCover && (
            <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-background/40">
              <div className="gba:h-5 gba:w-5 gba:animate-spin gba:rounded-full gba:border-2 gba:border-muted-foreground/20 gba:border-t-primary" />
            </div>
          )}
        </div>
      )}

      {/* Icon + Title area */}
      <div
        className={`gba:max-w-2xl gba:mx-auto gba:px-8 gba:group/header ${hasCover ? 'gba:-mt-8 gba:relative gba:z-10' : 'gba:pt-10'}`}
      >
        {/* Icon */}
        {icon ? (
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="gba:text-5xl gba:mb-3 gba:cursor-pointer gba:hover:scale-110 gba:transition-transform gba:leading-none gba:block"
                data-testid={`${testId}-icon`}
              >
                {icon}
              </button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-auto gba:p-0 gba:border-0" align="start" side="bottom">
              <div className="gba:relative">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.AUTO}
                  emojiStyle={EmojiStyle.NATIVE}
                  width={320}
                  height={400}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:absolute gba:top-1 gba:right-1 gba:h-6 gba:text-xs gba:text-destructive"
                  onClick={() => {
                    onIconChange(null)
                    setShowEmojiPicker(false)
                  }}
                  data-testid={`${testId}-icon-remove`}
                >
                  {t('common-remove')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        {/* Action buttons (add icon / add cover) */}
        <div
          className={`gba:flex gba:gap-1.5 gba:mb-2 gba:transition-opacity gba:duration-200 ${
            !icon || !hasCover
              ? 'gba:opacity-60 gba:group-hover/header:opacity-100'
              : 'gba:opacity-0 gba:pointer-events-none'
          }`}
        >
          {!icon && (
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:h-7 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
                  data-testid={`${testId}-add-icon`}
                >
                  <Smile className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
                  {t('board-add-icon')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gba:w-auto gba:p-0 gba:border-0" align="start" side="bottom">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.AUTO}
                  emojiStyle={EmojiStyle.NATIVE}
                  width={320}
                  height={400}
                />
              </PopoverContent>
            </Popover>
          )}

          {!hasCover && (
            <Popover open={showCoverPicker} onOpenChange={setShowCoverPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:h-7 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
                  data-testid={`${testId}-add-cover`}
                >
                  <ImageIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
                  {t('board-add-cover')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gba:w-72 gba:p-3" align="start" side="bottom">
                <CoverPicker
                  onSelectGradient={g => {
                    onCoverChange(g)
                    setShowCoverPicker(false)
                  }}
                  onUpload={() => {
                    onCoverUpload()
                    setShowCoverPicker(false)
                  }}
                  testId={`${testId}-cover-picker`}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Title */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={e => {
            onTitleChange(e.target.value)
            autoResizeTitle()
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          placeholder={t('board-untitled')}
          rows={1}
          className="gba:w-full gba:text-4xl gba:font-extrabold gba:tracking-tight gba:text-foreground gba:bg-transparent gba:border-0 gba:outline-none gba:placeholder-muted-foreground/20 gba:resize-none gba:leading-tight gba:mb-4 gba:block gba:overflow-hidden"
          data-testid={`${testId}-title`}
        />
      </div>
    </div>
  )
}

function CoverPicker({
  onSelectGradient,
  onUpload,
  testId
}: {
  onSelectGradient: (gradient: string) => void
  onUpload: () => void
  testId: string
}) {
  const { t } = useTranslation(translations)

  return (
    <div data-testid={testId}>
      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">{t('board-gradient')}</p>
      <div className="gba:grid gba:grid-cols-3 gba:gap-1.5 gba:mb-3">
        {COVER_GRADIENTS.map((gradient, i) => (
          <button
            key={i}
            type="button"
            className="gba:h-10 gba:rounded-md gba:cursor-pointer gba:ring-offset-background gba:transition-all gba:hover:ring-2 gba:hover:ring-ring gba:hover:ring-offset-1"
            style={{ background: gradient }}
            onClick={() => onSelectGradient(gradient)}
            data-testid={`${testId}-gradient-${i}`}
          />
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gba:w-full gba:h-8 gba:text-xs"
        onClick={onUpload}
        data-testid={`${testId}-upload`}
      >
        <Palette className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
        {t('board-upload-image')}
      </Button>
    </div>
  )
}
