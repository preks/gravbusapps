/**
 * TransformMenu Component
 * Provides AI-powered transformation options for handwritten notes
 */

import React, { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  Spinner,
  AiButton,
  useTranslation
} from '@newwork/nw-design-system'
import { Wand2, Copy, FileText, ListTodo, Languages, Sparkles } from 'lucide-react'
import { TRANSLATION_LANGUAGES } from '../../types/translation'
import type { TranslationLanguage } from '../../types/translation'
import translations from '../../_i18n'

export type TransformType =
  | 'copy-text' // Copy extracted text to clipboard
  | 'to-text' // Convert this note to text
  | 'create-text-note' // Create new text note
  | 'summarize' // Summarize content
  | 'action-items' // Extract action items
  | 'translate' // Translate content

export type { TranslationLanguage } from '../../types/translation'

interface TransformMenuProps {
  onTransform: (type: TransformType, options?: { targetLanguage?: TranslationLanguage }) => void
  isProcessing?: boolean
  disabled?: boolean
  /**
   * Controls which options are shown.
   * - handwriting: includes OCR-related options (copy/convert/create text note)
   * - text: hides those options (they don't make sense for typed notes)
   */
  mode?: 'handwriting' | 'text'
}

export const TransformMenu: React.FC<TransformMenuProps> = ({
  onTransform,
  isProcessing = false,
  disabled = false,
  mode = 'handwriting'
}) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)

  const handleTransform = (type: TransformType, options?: { targetLanguage?: TranslationLanguage }) => {
    setOpen(false)
    onTransform(type, options)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <AiButton
          size="sm"
          disabled={disabled || isProcessing}
          showIcon
          icon={isProcessing ? <Spinner className="gba:w-4 gba:h-4" /> : <Wand2 className="gba:w-4 gba:h-4" />}
          iconPosition="before"
          data-testid="note-transform-button"
        >
          {t('transform-label')}
        </AiButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="gba:w-56">
        {mode === 'handwriting' && (
          <>
            <DropdownMenuItem onClick={() => handleTransform('copy-text')}>
              <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
              <div>
                <div className="gba:font-medium">{t('transform-copy-text')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('transform-copy-text-desc')}</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleTransform('to-text')}>
              <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
              <div>
                <div className="gba:font-medium">{t('transform-to-text')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('transform-to-text-desc')}</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleTransform('create-text-note')}>
              <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
              <div>
                <div className="gba:font-medium">{t('transform-create-text-note')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('transform-create-text-note-desc')}</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => handleTransform('summarize')}>
          <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">{t('transform-summarize')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('transform-summarize-desc')}</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleTransform('action-items')}>
          <ListTodo className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium">{t('transform-action-items')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('transform-action-items-desc')}</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gba:flex gba:items-center">
            <Languages className="gba:w-4 gba:h-4 gba:mr-2" />
            <div className="gba:flex-1">
              <div className="gba:font-medium">{t('transform-translate')}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('transform-translate-desc')}</div>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="gba:w-48 gba:max-h-80 gba:overflow-y-auto">
              {TRANSLATION_LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleTransform('translate', { targetLanguage: lang.code })}
                  className="gba:gap-2"
                >
                  <span className="gba:text-base">{lang.flag}</span>
                  <span>{t(`translation-language-${lang.code}`)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
