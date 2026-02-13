/**
 * AudioSettingsPanel Component
 *
 * Audio settings panel for advanced controls (used as sidebar in call modal).
 * Provides device selection, volume controls, and RNNoise configuration.
 */

import {
  RadioGroup,
  RadioGroupItem,
  Label,
  Switch,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@newwork/nw-design-system'
import { CaretDownIcon, CheckIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import { MicLevelIndicator } from './MicLevelIndicator'
import { useChatTranslation } from '../../contexts/TranslationContext'
import type { MediaDeviceInfo } from '../../hooks/useMediaDevices'

export interface AudioSettingsModalProps {
  /** Available audio input devices */
  audioInputDevices: MediaDeviceInfo[]
  /** Available audio output devices */
  audioOutputDevices: MediaDeviceInfo[]
  /** Available video input devices */
  videoInputDevices?: MediaDeviceInfo[]
  /** Currently selected audio input device ID */
  selectedAudioInputId: string | null
  /** Currently selected audio output device ID */
  selectedAudioOutputId: string | null
  /** Currently selected video input device ID */
  selectedVideoInputId?: string | null
  /** Callback when audio input device changes */
  onAudioInputChange: (deviceId: string) => void
  /** Callback when audio output device changes */
  onAudioOutputChange: (deviceId: string) => void
  /** Callback when video input device changes */
  onVideoInputChange?: (deviceId: string) => void
  /** Whether RNNoise is enabled */
  rnnoiseEnabled?: boolean
  /** RNNoise mode */
  rnnoiseMode?: 'gentle' | 'moderate' | 'aggressive'
  /** Callback to toggle RNNoise */
  onToggleRnnoise?: () => void
  /** Callback when RNNoise mode changes */
  onRnnoiseModeChange?: (mode: 'gentle' | 'moderate' | 'aggressive') => void
  /** Whether browser can select audio output device */
  canSelectAudioOutput?: boolean
  /** Translation function */
  t?: (key: string) => string
  /** Callback when the panel should close (e.g. header X clicked) */
  onClose?: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,
  onAudioInputChange,
  onAudioOutputChange,
  onVideoInputChange,
  rnnoiseEnabled = false,
  rnnoiseMode = 'aggressive',
  onToggleRnnoise,
  onRnnoiseModeChange,
  canSelectAudioOutput = true,
  onClose,
  t: externalT,
  prefixDataTestId = 'audio-settings-modal'
}) => {
  const defaultT = useChatTranslation()
  const t = externalT || defaultT

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid={prefixDataTestId}>
      {/* Header - matches Participants and Chat sidebars */}
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:pt-2.5 gba:pb-4 gba:border-b gba:flex-shrink-0">
        <h3 className="gba:font-semibold gba:text-sm gba:text-foreground">
          {t('call-audioSettings') || 'Audio settings'}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="gba:p-1.5 gba:rounded-md hover:gba:bg-muted gba:transition-colors gba:flex gba:items-center gba:justify-center gba:text-foreground"
            aria-label={t('call-close') || 'Close'}
            data-testid={`${prefixDataTestId}-close`}
          >
            <XIcon className="gba:w-4 gba:h-4" weight="bold" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="gba:overflow-y-auto gba:flex-1">
        {/* Speaker Section */}
        <Collapsible defaultOpen className="gba:border-b gba:border-border">
          <CollapsibleTrigger
            className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:px-4 gba:py-3 gba:text-sm gba:font-semibold gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
            data-testid={`${prefixDataTestId}-speaker-trigger`}
          >
            <CaretDownIcon className="gba:w-4 gba:h-4 gba:transition-transform" weight="bold" />
            {t('call-speaker') || 'Speaker'}
          </CollapsibleTrigger>
          <CollapsibleContent className="gba:px-4 gba:pb-4 gba:space-y-3">
            {canSelectAudioOutput ? (
              audioOutputDevices.length > 0 ? (
                <RadioGroup
                  value={selectedAudioOutputId || ''}
                  onValueChange={onAudioOutputChange}
                  className="gba:space-y-2"
                >
                  {audioOutputDevices.map(device => (
                    <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                      <RadioGroupItem
                        value={device.deviceId}
                        id={`speaker-${device.deviceId}`}
                        data-testid={`${prefixDataTestId}-speaker-${device.deviceId}`}
                      />
                      <Label
                        htmlFor={`speaker-${device.deviceId}`}
                        className="gba:flex-1 gba:cursor-pointer gba:text-sm"
                      >
                        {device.label || `Speaker ${device.deviceId.substring(0, 8)}`}
                      </Label>
                      {selectedAudioOutputId === device.deviceId && (
                        <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
                  {t('call-noDevicesFound') || 'No devices found'}
                </p>
              )
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
                {t('call-speakerNotSupported') || 'Speaker selection not supported in this browser'}
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Microphone Section */}
        <Collapsible defaultOpen className="gba:border-b gba:border-border">
          <CollapsibleTrigger
            className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:px-4 gba:py-3 gba:text-sm gba:font-semibold gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
            data-testid={`${prefixDataTestId}-microphone-trigger`}
          >
            <CaretDownIcon className="gba:w-4 gba:h-4 gba:transition-transform" weight="bold" />
            {t('call-microphone') || 'Microphone'}
          </CollapsibleTrigger>
          <CollapsibleContent className="gba:px-4 gba:pb-4 gba:space-y-3">
            {audioInputDevices.length > 0 ? (
              <RadioGroup
                value={selectedAudioInputId || ''}
                onValueChange={onAudioInputChange}
                className="gba:space-y-2"
              >
                {audioInputDevices.map(device => (
                  <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                    <RadioGroupItem
                      value={device.deviceId}
                      id={`mic-${device.deviceId}`}
                      data-testid={`${prefixDataTestId}-mic-${device.deviceId}`}
                    />
                    <Label htmlFor={`mic-${device.deviceId}`} className="gba:flex-1 gba:cursor-pointer gba:text-sm">
                      {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                    </Label>
                    {selectedAudioInputId === device.deviceId && (
                      <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
                {t('call-noDevicesFound') || 'No devices found'}
              </p>
            )}

            {/* Mic Level Indicator */}
            <MicLevelIndicator
              deviceId={selectedAudioInputId}
              className="gba:pt-2"
              prefixDataTestId={`${prefixDataTestId}-mic-level`}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Camera Section (Optional) */}
        {videoInputDevices && videoInputDevices.length > 0 && onVideoInputChange && (
          <Collapsible className="gba:border-b gba:border-border">
            <CollapsibleTrigger
              className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:px-4 gba:py-3 gba:text-sm gba:font-semibold gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
              data-testid={`${prefixDataTestId}-camera-trigger`}
            >
              <CaretDownIcon className="gba:w-4 gba:h-4 gba:transition-transform" weight="bold" />
              {t('call-camera') || 'Camera'}
            </CollapsibleTrigger>
            <CollapsibleContent className="gba:px-4 gba:pb-4 gba:space-y-3">
              <RadioGroup
                value={selectedVideoInputId || ''}
                onValueChange={onVideoInputChange}
                className="gba:space-y-2"
              >
                {videoInputDevices.map(device => (
                  <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                    <RadioGroupItem
                      value={device.deviceId}
                      id={`camera-${device.deviceId}`}
                      data-testid={`${prefixDataTestId}-camera-${device.deviceId}`}
                    />
                    <Label htmlFor={`camera-${device.deviceId}`} className="gba:flex-1 gba:cursor-pointer gba:text-sm">
                      {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                    </Label>
                    {selectedVideoInputId === device.deviceId && (
                      <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Advanced Settings Section */}
        {(onToggleRnnoise || onRnnoiseModeChange) && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:px-4 gba:py-3 gba:text-sm gba:font-semibold gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
              data-testid={`${prefixDataTestId}-advanced-trigger`}
            >
              <CaretDownIcon className="gba:w-4 gba:h-4 gba:transition-transform" weight="bold" />
              {t('call-advancedSettings') || 'Advanced settings'}
            </CollapsibleTrigger>
            <CollapsibleContent className="gba:px-4 gba:pb-4 gba:space-y-4">
              {/* RNNoise Toggle */}
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Label className="gba:text-sm gba:font-semibold">{t('call-rnnoiseAI') || 'RNNoise (AI)'}</Label>
                  </div>
                  <Switch
                    checked={rnnoiseEnabled}
                    onCheckedChange={onToggleRnnoise}
                    data-testid={`${prefixDataTestId}-rnnoise-toggle`}
                  />
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('call-rnnoiseDescription') || 'Advanced AI-powered noise cancellation'}
                </p>

                {/* RNNoise Mode Selection */}
                {rnnoiseEnabled && onRnnoiseModeChange && (
                  <RadioGroup
                    value={rnnoiseMode}
                    onValueChange={onRnnoiseModeChange}
                    className="gba:pl-6 gba:space-y-2 gba:pt-2"
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <RadioGroupItem
                        value="gentle"
                        id="rnnoise-gentle"
                        data-testid={`${prefixDataTestId}-rnnoise-gentle`}
                      />
                      <div className="gba:flex-1">
                        <Label htmlFor="rnnoise-gentle" className="gba:cursor-pointer gba:font-medium gba:text-sm">
                          {t('call-rnnoiseGentle') || 'Gentle'}
                        </Label>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {t('call-rnnoiseGentleDesc') || 'Light filtering, preserves natural sound'}
                        </p>
                      </div>
                    </div>

                    <div className="gba:flex gba:items-center gba:gap-3">
                      <RadioGroupItem
                        value="moderate"
                        id="rnnoise-moderate"
                        data-testid={`${prefixDataTestId}-rnnoise-moderate`}
                      />
                      <div className="gba:flex-1">
                        <Label htmlFor="rnnoise-moderate" className="gba:cursor-pointer gba:font-medium gba:text-sm">
                          {t('call-rnnoiseModerate') || 'Moderate'}
                        </Label>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {t('call-rnnoiseModerateDesc') || 'Balanced noise reduction'}
                        </p>
                      </div>
                    </div>

                    <div className="gba:flex gba:items-center gba:gap-3">
                      <RadioGroupItem
                        value="aggressive"
                        id="rnnoise-aggressive"
                        data-testid={`${prefixDataTestId}-rnnoise-aggressive`}
                      />
                      <div className="gba:flex-1">
                        <Label htmlFor="rnnoise-aggressive" className="gba:cursor-pointer gba:font-medium gba:text-sm">
                          {t('call-rnnoiseAggressive') || 'Aggressive'}
                        </Label>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {t('call-rnnoiseAggressiveDesc') || 'Maximum filtering for noisy environments'}
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                )}

                {/* Performance Warning */}
                {rnnoiseEnabled && (
                  <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:mt-2 gba:rounded gba:bg-warning-secondary/20 gba:border gba:border-warning-secondary">
                    <WarningIcon
                      className="gba:w-4 gba:h-4 gba:text-warning gba:mt-0.5 gba:flex-shrink-0"
                      weight="fill"
                    />
                    <p className="gba:text-xs gba:text-warning-secondary-foreground">
                      {t('call-rnnoiseWarning') ||
                        'RNNoise may impact CPU performance. Test different modes to find the best balance.'}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}
