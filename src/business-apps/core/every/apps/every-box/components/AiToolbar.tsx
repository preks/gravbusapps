/**
 * AiToolbar Component
 *
 * Provides AI writing tools for the reply composer:
 * - Suggest reply
 * - Improve draft
 * - Adjust tone (formal, casual, friendly, professional, concise)
 * - Expand text
 * - Shorten text
 * - Custom instruction
 */

import React, { useState } from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Sparkles, Wand2, Type, ArrowUpRight, ArrowDownRight, MessageSquarePlus, Loader2 } from 'lucide-react'
import type { ToneOption } from '@/business-apps/core/every/apps/every-api/services/AiService'
import translations from '../_i18n'

interface AiToolbarProps {
  /** Current text in the composer (for context) */
  currentText: string
  /** Whether the AI is currently processing */
  isLoading: boolean
  /** Callback when user requests a suggestion */
  onSuggest: () => void
  /** Callback when user wants to improve their draft */
  onImprove: (text: string) => void
  /** Callback when user wants to change tone */
  onTone: (text: string, tone: ToneOption) => void
  /** Callback when user wants to expand text */
  onExpand: (text: string) => void
  /** Callback when user wants to shorten text */
  onShorten: (text: string) => void
  /** Callback when user provides a custom instruction */
  onCustom: (instruction: string, text?: string) => void
  /** Whether there's existing text to work with */
  hasText: boolean
  /** Disabled state */
  disabled?: boolean
}

const toneOptions: { value: ToneOption; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'concise', label: 'Concise' }
]

export const AiToolbar: React.FC<AiToolbarProps> = ({
  currentText,
  isLoading,
  onSuggest,
  onImprove,
  onTone,
  onExpand,
  onShorten,
  onCustom,
  hasText,
  disabled = false
}) => {
  const { t } = useTranslation(translations)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInstruction, setCustomInstruction] = useState('')
  const [showToneMenu, setShowToneMenu] = useState(false)

  const handleCustomSubmit = () => {
    if (customInstruction.trim()) {
      onCustom(customInstruction.trim(), currentText || undefined)
      setCustomInstruction('')
      setShowCustomInput(false)
    }
  }

  const handleToneSelect = (tone: ToneOption) => {
    if (currentText.trim()) {
      onTone(currentText, tone)
    }
    setShowToneMenu(false)
  }

  const buttonClass =
    'gba:h-7 gba:px-2.5 gba:text-xs gba:gap-1.5 gba:font-medium gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted gba:rounded-md'
  const iconClass = 'gba:h-3.5 gba:w-3.5'

  return (
    <div
      className="gba:flex gba:items-center gba:gap-1 gba:border-t gba:border-border gba:pt-3 gba:mt-2"
      data-testid="ai-toolbar"
    >
      {/* AI Icon indicator */}
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:mr-2">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:rounded gba:bg-sky-100">
          <Sparkles className="gba:h-3 gba:w-3 gba:text-sky-600" />
        </div>
        <span className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
          AI
        </span>
      </div>

      <div className="gba:h-4 gba:w-px gba:bg-border gba:mx-1" />

      {/* Suggest button (always available) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={onSuggest}
            disabled={disabled || isLoading}
          >
            {isLoading ? <Loader2 className={`${iconClass} gba:animate-spin`} /> : <Sparkles className={iconClass} />}
            <span>{t('ai-assistant-suggest')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('ai-assistant-suggest-tooltip')}</TooltipContent>
      </Tooltip>

      {/* Improve button (only when there's text) */}
      {hasText && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={buttonClass}
              onClick={() => onImprove(currentText)}
              disabled={disabled || isLoading}
            >
              <Wand2 className={iconClass} />
              <span>{t('ai-assistant-improve')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('ai-assistant-improve-tooltip')}</TooltipContent>
        </Tooltip>
      )}

      {/* Tone adjustment (only when there's text) */}
      {hasText && (
        <Popover open={showToneMenu} onOpenChange={setShowToneMenu}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={buttonClass} disabled={disabled || isLoading}>
                  <Type className={iconClass} />
                  <span>{t('ai-assistant-tone')}</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('ai-assistant-tone-tooltip')}</TooltipContent>
          </Tooltip>
          <PopoverContent className="gba:w-36 gba:p-1" align="start">
            <div className="gba:flex gba:flex-col">
              {toneOptions.map(option => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  className="gba:justify-start gba:h-8 gba:text-sm gba:font-normal"
                  onClick={() => handleToneSelect(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Expand button (only when there's text) */}
      {hasText && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={buttonClass}
              onClick={() => onExpand(currentText)}
              disabled={disabled || isLoading}
            >
              <ArrowUpRight className={iconClass} />
              <span>{t('ai-assistant-expand')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('ai-assistant-expand-tooltip')}</TooltipContent>
        </Tooltip>
      )}

      {/* Shorten button (only when there's text) */}
      {hasText && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={buttonClass}
              onClick={() => onShorten(currentText)}
              disabled={disabled || isLoading}
            >
              <ArrowDownRight className={iconClass} />
              <span>{t('ai-assistant-shorten')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('ai-assistant-shorten-tooltip')}</TooltipContent>
        </Tooltip>
      )}

      {/* Custom instruction */}
      <Popover open={showCustomInput} onOpenChange={setShowCustomInput}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={buttonClass} disabled={disabled || isLoading}>
                <MessageSquarePlus className={iconClass} />
                <span>{t('ai-assistant-custom')}</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('ai-assistant-custom-tooltip')}</TooltipContent>
        </Tooltip>
        <PopoverContent className="gba:w-72 gba:p-3" align="end">
          <div className="gba:space-y-2">
            <label className="gba:text-sm gba:font-medium gba:text-foreground">{t('ai-assistant-custom-label')}</label>
            <Input
              placeholder={t('ai-assistant-custom-placeholder')}
              value={customInstruction}
              onChange={e => setCustomInstruction(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCustomSubmit()
                }
              }}
              className="gba:text-sm"
            />
            <Button
              size="sm"
              className="gba:w-full gba:h-8"
              onClick={handleCustomSubmit}
              disabled={!customInstruction.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin gba:mr-1" />
              ) : (
                <Sparkles className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
              )}
              {t('ai-assistant-apply')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
