/**
 * Dropdown content for quick audio device selection (speaker + microphone).
 * Reusable in call control bar and other call UIs.
 */

import React from 'react'
import { DropdownMenuContent, RadioGroup, RadioGroupItem, Label } from '@newwork/nw-design-system'
import { MicLevelIndicator } from './MicLevelIndicator'
import type { MediaDeviceInfo } from '../../hooks/useMediaDevices'

export interface AudioDeviceDropdownContentProps {
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
  onMicChange: (deviceId: string) => void
  onSpeakerChange: (deviceId: string) => void
  canSelectAudioOutput: boolean
  onMoreSettings?: () => void
  t?: (key: string) => string
  prefixDataTestId?: string
  /** When true, closes the dropdown after opening more settings */
  onOpenChange?: (open: boolean) => void
}

const defaultT = (key: string) => key

export const AudioDeviceDropdownContent: React.FC<AudioDeviceDropdownContentProps> = ({
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  onMicChange,
  onSpeakerChange,
  canSelectAudioOutput,
  onMoreSettings,
  t = defaultT,
  prefixDataTestId = 'rtk-group-call',
  onOpenChange
}) => {
  const handleMoreSettings = () => {
    onMoreSettings?.()
    onOpenChange?.(false)
  }

  return (
    <DropdownMenuContent
      side="top"
      align="center"
      className="gba:w-[320px] gba:p-0 gba:bg-background gba:border-border"
    >
      <div className="gba:p-4 gba:border-b gba:border-border">
        <Label className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:mb-3 gba:block">
          {t('call-speaker') || 'Speaker'}
        </Label>
        {canSelectAudioOutput ? (
          audioOutputDevices.length > 0 ? (
            <RadioGroup value={selectedAudioOutputId || ''} onValueChange={onSpeakerChange} className="gba:space-y-2">
              {audioOutputDevices.map(device => (
                <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                  <RadioGroupItem value={device.deviceId} id={`speaker-quick-${device.deviceId}`} />
                  <Label
                    htmlFor={`speaker-quick-${device.deviceId}`}
                    className="gba:flex-1 gba:cursor-pointer gba:text-sm"
                  >
                    {device.label}
                  </Label>
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
            {t('call-speakerNotSupported') || 'Speaker selection not supported'}
          </p>
        )}
      </div>

      <div className="gba:p-4 gba:border-b gba:border-border">
        <Label className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:mb-3 gba:block">
          {t('call-microphone') || 'Microphone'}
        </Label>
        {audioInputDevices.length > 0 ? (
          <RadioGroup value={selectedAudioInputId || ''} onValueChange={onMicChange} className="gba:space-y-2">
            {audioInputDevices.map(device => (
              <div key={device.deviceId} className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
                <RadioGroupItem value={device.deviceId} id={`mic-quick-${device.deviceId}`} />
                <Label htmlFor={`mic-quick-${device.deviceId}`} className="gba:flex-1 gba:cursor-pointer gba:text-sm">
                  {device.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground gba:py-2">
            {t('call-noDevicesFound') || 'No devices found'}
          </p>
        )}
        <MicLevelIndicator deviceId={selectedAudioInputId} className="gba:mt-3" />
      </div>

      {onMoreSettings && (
        <button
          type="button"
          onClick={handleMoreSettings}
          className="gba:w-full gba:px-4 gba:py-3 gba:text-sm gba:text-left hover:gba:bg-muted/50 gba:transition-colors"
          data-testid={`${prefixDataTestId}-more-audio-settings`}
        >
          {t('call-moreAudioSettings') || 'More audio settings'}
        </button>
      )}
    </DropdownMenuContent>
  )
}
