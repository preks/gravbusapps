// AI Assist Settings Dialog - Configure AI presentation enhancement options.

import React, { useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  cn
} from '@newwork/nw-design-system'
import { Play, Volume2, MessageSquare, Sparkles } from 'lucide-react'
import type { AIAssistConfig, EffectType } from './slideElements'
import { DEFAULT_AI_ASSIST_CONFIG, EFFECT_TYPE_OPTIONS } from './slideElements'

const AI_ASSIST_STORAGE_KEY = 'slides-ai-assist-config'

export interface AIAssistSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AIAssistConfig
  onChange: (config: Partial<AIAssistConfig>) => void
  onTestMode?: () => void
  t: (key: string) => string
  'data-testid'?: string
}

// Load config from localStorage (always starts disabled for privacy)
export function loadAIAssistConfig(): AIAssistConfig {
  try {
    const stored = localStorage.getItem(AI_ASSIST_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Always start with AI Assist disabled - user must explicitly enable each session
      return { ...DEFAULT_AI_ASSIST_CONFIG, ...parsed, enabled: false }
    }
  } catch (e) {
    console.warn('Failed to load AI assist config:', e)
  }
  return DEFAULT_AI_ASSIST_CONFIG
}

// Save config to localStorage
export function saveAIAssistConfig(config: AIAssistConfig): void {
  try {
    localStorage.setItem(AI_ASSIST_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Failed to save AI assist config:', e)
  }
}

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (BR)' },
  { value: 'nl-NL', label: 'Dutch' },
  { value: 'pl-PL', label: 'Polish' }
]

const SENSITIVITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Exact matches only' },
  { value: 'medium', label: 'Medium', description: 'Recommended' },
  { value: 'high', label: 'High', description: 'More matches, may have false positives' }
]

const INTENSITY_OPTIONS = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'normal', label: 'Normal' },
  { value: 'strong', label: 'Strong' }
]

export const AIAssistSettings: React.FC<AIAssistSettingsProps> = ({
  open,
  onOpenChange,
  config,
  onChange,
  onTestMode,
  t,
  'data-testid': testId = 'ai-assist-settings'
}) => {
  const handleEffectToggle = useCallback(
    (effect: EffectType, enabled: boolean) => {
      const newEffects = enabled ? [...config.enabledEffects, effect] : config.enabledEffects.filter(e => e !== effect)
      onChange({ enabledEffects: newEffects })
    },
    [config.enabledEffects, onChange]
  )

  const handleCooldownChange = useCallback(
    (value: number[]) => {
      onChange({ cooldownMs: value[0] * 1000 })
    },
    [onChange]
  )

  const handleDuplicateDetectionChange = useCallback(
    (value: number[]) => {
      onChange({ duplicateDetectionMs: value[0] * 1000 })
    },
    [onChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-5 gba:h-5" />
            {t('ai-assist-settings')}
          </DialogTitle>
          <DialogDescription>{t('ai-assist-settings-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {/* Language */}
          <div className="gba:space-y-2">
            <Label>{t('ai-assist-language')}</Label>
            <Select value={config.language} onValueChange={v => onChange({ language: v })}>
              <SelectTrigger data-testid={`${testId}-language`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sensitivity */}
          <div className="gba:space-y-2">
            <Label>{t('ai-assist-sensitivity')}</Label>
            <Select
              value={config.sensitivity}
              onValueChange={v => onChange({ sensitivity: v as 'low' | 'medium' | 'high' })}
            >
              <SelectTrigger data-testid={`${testId}-sensitivity`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSITIVITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="gba:flex gba:flex-col">
                      <span>{t(`ai-assist-sensitivity-${opt.value}`)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Effect Style */}
          <div className="gba:space-y-2">
            <Label>{t('ai-assist-effect-style')}</Label>
            <Select
              value={config.effectStyle}
              onValueChange={v => onChange({ effectStyle: v as 'subtle' | 'normal' | 'strong' })}
            >
              <SelectTrigger data-testid={`${testId}-effect-style`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTENSITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(`ai-assist-effect-${opt.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enabled Effects */}
          <div className="gba:space-y-3">
            <Label>{t('ai-assist-enabled-effects')}</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              {EFFECT_TYPE_OPTIONS.map(effect => (
                <div
                  key={effect.value}
                  className={cn(
                    'gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded gba:border',
                    config.enabledEffects.includes(effect.value)
                      ? 'gba:border-primary gba:bg-primary/5'
                      : 'gba:border-zinc-200 dark:gba:border-zinc-700'
                  )}
                >
                  <div className="gba:flex gba:flex-col">
                    <span className="gba:text-sm gba:font-medium">{t(`ai-assist-effect-${effect.value}`)}</span>
                    <span className="gba:text-xs gba:text-muted-foreground">{effect.description}</span>
                  </div>
                  <Switch
                    checked={config.enabledEffects.includes(effect.value)}
                    onCheckedChange={checked => handleEffectToggle(effect.value, checked)}
                    data-testid={`${testId}-effect-${effect.value}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Cooldown */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>{t('ai-assist-cooldown')}</Label>
              <span className="gba:text-sm gba:text-muted-foreground">{config.cooldownMs / 1000}s</span>
            </div>
            <Slider
              value={[config.cooldownMs / 1000]}
              onValueChange={handleCooldownChange}
              min={1}
              max={15}
              step={1}
              data-testid={`${testId}-cooldown`}
            />
            <p className="gba:text-xs gba:text-muted-foreground">{t('ai-assist-cooldown-hint')}</p>
          </div>

          {/* Duplicate Detection */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>{t('ai-assist-duplicate-detection')}</Label>
              <span className="gba:text-sm gba:text-muted-foreground">{config.duplicateDetectionMs / 1000}s</span>
            </div>
            <Slider
              value={[config.duplicateDetectionMs / 1000]}
              onValueChange={handleDuplicateDetectionChange}
              min={0.5}
              max={5}
              step={0.5}
              data-testid={`${testId}-duplicate-detection`}
            />
            <p className="gba:text-xs gba:text-muted-foreground">{t('ai-assist-duplicate-detection-hint')}</p>
          </div>

          {/* Toggle Options */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Play className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Label>{t('ai-assist-video-autoplay')}</Label>
              </div>
              <Switch
                checked={config.videoAutoplay}
                onCheckedChange={checked => onChange({ videoAutoplay: checked })}
                data-testid={`${testId}-video-autoplay`}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2">
                <MessageSquare className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Label>{t('ai-assist-show-transcript')}</Label>
              </div>
              <Switch
                checked={config.showTranscript}
                onCheckedChange={checked => onChange({ showTranscript: checked })}
                data-testid={`${testId}-show-transcript`}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Volume2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Label>{t('ai-assist-show-feedback')}</Label>
              </div>
              <Switch
                checked={config.showMatchFeedback}
                onCheckedChange={checked => onChange({ showMatchFeedback: checked })}
                data-testid={`${testId}-show-feedback`}
              />
            </div>
          </div>

          {/* Test Mode Button */}
          {onTestMode && (
            <div className="gba:pt-2">
              <Button variant="outline" className="gba:w-full" onClick={onTestMode} data-testid={`${testId}-test-mode`}>
                <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('ai-assist-test-mode')}
              </Button>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:text-center">
                {t('ai-assist-test-mode-hint')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AIAssistSettings
