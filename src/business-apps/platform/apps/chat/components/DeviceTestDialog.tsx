import React, { useMemo } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { MediaDeviceInfo } from '../hooks/useMediaDevices'
import { useMicrophoneTest } from '../hooks/useMicrophoneTest'
import { useSpeakerTest } from '../hooks/useSpeakerTest'

interface DeviceTestDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  t: (key: string) => string
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
  setSelectedAudioInputId: (deviceId: string) => void
  setSelectedAudioOutputId: (deviceId: string) => void
  canSelectAudioOutput: boolean
  prefixDataTestId?: string
}

const findLabel = (devices: MediaDeviceInfo[], selectedId: string | null): string => {
  if (!selectedId) return ''
  return devices.find(d => d.deviceId === selectedId)?.label || ''
}

export const DeviceTestDialog: React.FC<DeviceTestDialogProps> = ({
  isOpen,
  onOpenChange,
  t,
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  setSelectedAudioInputId,
  setSelectedAudioOutputId,
  canSelectAudioOutput,
  prefixDataTestId = 'device-test-dialog'
}) => {
  const selectedMicLabel = useMemo(
    () => findLabel(audioInputDevices, selectedAudioInputId),
    [audioInputDevices, selectedAudioInputId]
  )
  const selectedSpeakerLabel = useMemo(
    () => findLabel(audioOutputDevices, selectedAudioOutputId),
    [audioOutputDevices, selectedAudioOutputId]
  )

  const { isTestingMic, micError, micLevel, runMicTest, stopMicTest } = useMicrophoneTest({
    isOpen,
    t,
    selectedAudioInputId
  })

  const { speakerAudioRef, isTestingSpeaker, speakerError, runSpeakerTest } = useSpeakerTest({
    isOpen,
    t,
    selectedAudioOutputId
  })

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md">
        <DialogTitle>{t('call-testDevices') || 'Test devices'}</DialogTitle>
        <DialogDescription>
          {t('call-testDevicesDescription') || 'Play a short sound and check your microphone level.'}
        </DialogDescription>

        <div className="gba:space-y-5">
          <div className="gba:space-y-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm">{t('call-selectMicrophone') || 'Microphone'}</Label>
              <Select
                value={selectedAudioInputId || ''}
                onValueChange={value => {
                  if (!value) return
                  setSelectedAudioInputId(value)
                }}
              >
                <SelectTrigger data-testid={`${prefixDataTestId}-select-microphone`}>
                  <SelectValue placeholder={selectedMicLabel || t('call-defaultDevice') || 'Default'} />
                </SelectTrigger>
                <SelectContent>
                  {audioInputDevices.length > 0 ? (
                    audioInputDevices.map((d, idx) => (
                      <SelectItem key={`${d.deviceId}-${idx}`} value={d.deviceId}>
                        {d.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none__" disabled>
                      {t('call-noDevicesFound') || 'No devices found'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:flex gba:items-center gba:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={isTestingMic ? stopMicTest : runMicTest}
                data-testid={`${prefixDataTestId}-test-microphone`}
              >
                {isTestingMic ? t('call-stop') || 'Stop' : t('call-testMicrophone') || 'Test microphone'}
              </Button>
              <div className="gba:flex-1 gba:space-y-1">
                <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                  <span>{t('call-microphoneLevel') || 'Microphone level'}</span>
                  <span>{micLevel}%</span>
                </div>
                <Progress value={micLevel} className="gba:h-2" data-testid={`${prefixDataTestId}-microphone-level`} />
              </div>
            </div>
            {micError && <div className="gba:text-sm gba:text-destructive">{micError}</div>}
          </div>

          <div className="gba:border-t gba:border-border gba:pt-4 gba:space-y-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm">{t('call-selectSpeaker') || 'Select Speaker'}</Label>
              <Select
                value={selectedAudioOutputId || ''}
                onValueChange={value => {
                  if (!value) return
                  setSelectedAudioOutputId(value)
                }}
                disabled={!canSelectAudioOutput}
              >
                <SelectTrigger data-testid={`${prefixDataTestId}-select-speaker`}>
                  <SelectValue
                    placeholder={
                      selectedSpeakerLabel ||
                      `${t('call-defaultDevice') || 'Default'}${
                        !canSelectAudioOutput ? ` (${t('call-speakerNotSupportedShort') || 'not selectable'})` : ''
                      }`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputDevices.length > 0 ? (
                    audioOutputDevices.map((d, idx) => (
                      <SelectItem key={`${d.deviceId}-${idx}`} value={d.deviceId}>
                        {d.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none__" disabled>
                      {t('call-noDevicesFound') || 'No devices found'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!canSelectAudioOutput && (
                <div className="gba:text-xs gba:text-muted-foreground">
                  {t('call-speakerNotSupported') || 'Speaker selection not supported in this browser'}
                </div>
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={runSpeakerTest}
                disabled={isTestingSpeaker}
                data-testid={`${prefixDataTestId}-test-speaker`}
              >
                {isTestingSpeaker ? t('call-testing') || 'Testing…' : t('call-testSpeaker') || 'Test speaker'}
              </Button>
              {speakerError && <div className="gba:text-sm gba:text-destructive">{speakerError}</div>}
            </div>
            {/* Keep mounted but visually hidden (avoid display:none edge cases). */}
            <audio
              ref={speakerAudioRef}
              className="gba:absolute gba:w-0 gba:h-0 gba:opacity-0 gba:pointer-events-none"
            />
          </div>

          <div className="gba:flex gba:justify-end">
            <Button variant="default" onClick={() => onOpenChange(false)} data-testid={`${prefixDataTestId}-close`}>
              {t('call-close') || 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
