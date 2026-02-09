import React, { useEffect, useState, memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { Phone, PhoneOff, Video, UserIcon, ChevronDown, Check } from 'lucide-react'
import type { CallState, CallParticipant } from '../services/webrtcClient'
import { useChatTranslation } from '../contexts/TranslationContext'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useCallPreferences } from '../hooks/useCallPreferences'

interface IncomingCallDialogProps {
  callState: CallState
  onAccept: (preferences?: { audioInputDeviceId?: string | null; videoInputDeviceId?: string | null }) => void
  onReject: () => void
  prefixDataTestId?: string
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const getParticipantName = (participant: CallParticipant | null): string => {
  if (!participant) return 'Unknown'
  return participant.odName || 'Unknown'
}

// Pulsing ring animation component
const PulsingRing: React.FC<{ color?: string }> = ({ color = 'bg-success' }) => (
  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
    <div
      className={`gba:absolute gba:w-36 gba:h-36 gba:rounded-full ${color} gba:opacity-20 gba:animate-ping`}
      style={{ animationDuration: '1.5s' }}
    />
    <div
      className={`gba:absolute gba:w-32 gba:h-32 gba:rounded-full ${color} gba:opacity-30 gba:animate-ping`}
      style={{ animationDuration: '1.5s', animationDelay: '0.3s' }}
    />
  </div>
)

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = memo(
  ({ callState, onAccept, onReject, prefixDataTestId = 'incoming-call-dialog' }) => {
    const t = useChatTranslation()
    const callPreferences = useCallPreferences()
    const [ringCount, setRingCount] = useState(0)

    const isOpen = callState.status === 'ringing' && callState.direction === 'incoming'
    const remoteParticipant = callState.remoteParticipant
    const participantName = getParticipantName(remoteParticipant)
    const isVideoCall = callState.type === 'video'

    const {
      audioInputDevices,
      videoInputDevices,
      selectedAudioInputId,
      selectedVideoInputId,
      setSelectedAudioInputId,
      setSelectedVideoInputId,
      refreshDevices,
      isEnumerating
    } = useMediaDevices({ enabled: isOpen })

    useEffect(() => {
      if (!isOpen) return
      refreshDevices({ requestAudio: true, requestVideo: isVideoCall })
    }, [isOpen, isVideoCall, refreshDevices])

    const handleAccept = () => {
      onAccept({
        audioInputDeviceId: selectedAudioInputId,
        videoInputDeviceId: selectedVideoInputId
      })
    }

    // Ring animation counter (for visual feedback)
    useEffect(() => {
      if (!isOpen) {
        setRingCount(0)
        return
      }

      const interval = setInterval(() => {
        setRingCount(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }, [isOpen])

    // Play ringtone effect
    useEffect(() => {
      if (!isOpen) return

      // Create audio context for ringtone
      let audioContext: AudioContext | null = null
      let oscillator: OscillatorNode | null = null
      let gainNode: GainNode | null = null

      const playRing = () => {
        try {
          audioContext = new AudioContext()
          oscillator = audioContext.createOscillator()
          gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.type = 'sine'
          oscillator.frequency.value = 440

          gainNode.gain.value = 0.1

          oscillator.start()

          // Ring pattern: 2 short beeps
          setTimeout(() => {
            if (oscillator) oscillator.stop()
          }, 200)
        } catch (e) {
          console.debug('Could not play ringtone:', e)
        }
      }

      // Play initial ring
      playRing()

      // Ring interval
      const ringInterval = setInterval(playRing, 3000)

      return () => {
        clearInterval(ringInterval)
        if (oscillator) {
          try {
            oscillator.stop()
          } catch {
            // Already stopped
          }
        }
        if (audioContext) {
          audioContext.close()
        }
      }
    }, [isOpen])

    if (!isOpen) return null

    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="gba:w-[90vw] gba:max-w-sm gba:p-0 gba:overflow-hidden gba:bg-gradient-to-b gba:from-gray-800 gba:to-gray-900 gba:border-0"
          data-testid={prefixDataTestId}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">
            {isVideoCall ? t('call-incomingVideoCall') : t('call-incomingAudioCall')}
          </DialogTitle>
          <DialogDescription className="gba:sr-only">
            {t('call-incomingFrom')} {participantName}
          </DialogDescription>
          <div className="gba:flex gba:flex-col gba:items-center gba:py-8 gba:px-6">
            {/* Call Type Indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-400 gba:text-sm gba:mb-6">
              {isVideoCall ? (
                <>
                  <Video className="gba:w-4 gba:h-4" />
                  <span>{t('call-incomingVideoCall')}</span>
                </>
              ) : (
                <>
                  <Phone className="gba:w-4 gba:h-4" />
                  <span>{t('call-incomingAudioCall')}</span>
                </>
              )}
            </div>

            {/* Caller Avatar with Pulsing Ring */}
            <div className="gba:relative gba:mb-6">
              <PulsingRing color={isVideoCall ? 'gba:bg-primary' : 'gba:bg-success'} />
              {remoteParticipant?.avatarUrl ? (
                <Avatar className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:ring-4 gba:ring-white/20">
                  <AvatarImage src={remoteParticipant.avatarUrl} alt={participantName} />
                  <AvatarFallback className="gba:text-3xl gba:bg-gray-700 gba:text-white">
                    {getInitials(participantName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <IconAvatar
                  className="gba:w-28 gba:h-28 gba:relative gba:z-10 gba:bg-gray-700"
                  label={participantName}
                  icon={UserIcon}
                />
              )}
            </div>

            {/* Caller Name */}
            <h2 className="gba:text-xl gba:font-semibold gba:text-white gba:mb-2">{participantName}</h2>

            {/* Ringing indicator */}
            <p className="gba:text-gray-400 gba:text-sm gba:mb-8">
              {t('call-ringing')}
              <span className="gba:inline-block gba:w-8">{'.'.repeat((ringCount % 3) + 1)}</span>
            </p>

            {/* Device selection (invite modal) */}
            <div className="gba:w-full gba:max-w-xs gba:mb-6 gba:flex gba:flex-col gba:gap-2">
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isEnumerating}
                      className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:text-white gba:text-sm gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:min-w-[160px]"
                      data-testid={`${prefixDataTestId}-mic-settings`}
                      aria-label={t('call-selectMicrophone')}
                    >
                      <span className="gba:truncate">{t('call-selectMicrophone')}</span>
                      <ChevronDown className="gba:w-4 gba:h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="gba:w-72 gba:bg-gray-800 gba:border-gray-700">
                    <DropdownMenuLabel className="gba:text-white">{t('call-selectMicrophone')}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="gba:bg-gray-700" />
                    {audioInputDevices.length > 0 ? (
                      audioInputDevices.map(device => (
                        <DropdownMenuItem
                          key={device.deviceId}
                          onClick={() => setSelectedAudioInputId(device.deviceId)}
                          className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                        >
                          {selectedAudioInputId === device.deviceId && (
                            <Check className="gba:w-4 gba:h-4 gba:text-success" />
                          )}
                          <span className={selectedAudioInputId !== device.deviceId ? 'gba:ml-6' : ''}>
                            {device.label}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="gba:text-gray-400">
                        {t('call-noDevicesFound')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="gba:bg-gray-700" />
                    <DropdownMenuCheckboxItem
                      checked={callPreferences.noiseSuppressionEnabled}
                      onCheckedChange={checked => callPreferences.setNoiseSuppressionEnabled(Boolean(checked))}
                      className="gba:text-white hover:gba:bg-gray-700"
                      data-testid={`${prefixDataTestId}-noise-suppression-toggle`}
                    >
                      {t('call-noiseSuppression') || 'Noise suppression'}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={callPreferences.autoGainControlEnabled}
                      onCheckedChange={checked => callPreferences.setAutoGainControlEnabled(Boolean(checked))}
                      className="gba:text-white hover:gba:bg-gray-700"
                      data-testid={`${prefixDataTestId}-auto-gain-control-toggle`}
                    >
                      {t('call-autoGainControl') || 'Auto gain control'}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {isVideoCall && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isEnumerating}
                        className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3 gba:py-2 gba:rounded-full gba:bg-gray-700/50 hover:gba:bg-gray-700 gba:text-white gba:text-sm gba:border gba:border-gray-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:min-w-[160px]"
                        data-testid={`${prefixDataTestId}-camera-settings`}
                        aria-label={t('call-selectCamera')}
                      >
                        <span className="gba:truncate">{t('call-selectCamera')}</span>
                        <ChevronDown className="gba:w-4 gba:h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="gba:w-72 gba:bg-gray-800 gba:border-gray-700">
                      <DropdownMenuLabel className="gba:text-white">{t('call-selectCamera')}</DropdownMenuLabel>
                      <DropdownMenuSeparator className="gba:bg-gray-700" />
                      {videoInputDevices.length > 0 ? (
                        videoInputDevices.map(device => (
                          <DropdownMenuItem
                            key={device.deviceId}
                            onClick={() => setSelectedVideoInputId(device.deviceId)}
                            className="gba:flex gba:items-center gba:gap-2 gba:text-white hover:gba:bg-gray-700"
                          >
                            {selectedVideoInputId === device.deviceId && (
                              <Check className="gba:w-4 gba:h-4 gba:text-success" />
                            )}
                            <span className={selectedVideoInputId !== device.deviceId ? 'gba:ml-6' : ''}>
                              {device.label}
                            </span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className="gba:text-gray-400">
                          {t('call-noDevicesFound')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-8">
              {/* Reject Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={onReject}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg"
                  data-testid={`${prefixDataTestId}-reject`}
                >
                  <PhoneOff className="gba:w-7 gba:h-7" />
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('call-decline')}</span>
              </div>

              {/* Accept Button */}
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                <Button
                  size="icon"
                  onClick={handleAccept}
                  className="gba:w-16 gba:h-16 gba:rounded-full gba:shadow-lg gba:bg-success gba:hover:bg-success/90"
                  data-testid={`${prefixDataTestId}-accept`}
                >
                  {isVideoCall ? (
                    <Video className="gba:w-7 gba:h-7 gba:text-white" />
                  ) : (
                    <Phone className="gba:w-7 gba:h-7 gba:text-white" />
                  )}
                </Button>
                <span className="gba:text-xs gba:text-gray-400">{t('call-accept')}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if call status, direction, type, or participant changes
    return (
      prevProps.callState.status === nextProps.callState.status &&
      prevProps.callState.direction === nextProps.callState.direction &&
      prevProps.callState.type === nextProps.callState.type &&
      prevProps.callState.remoteParticipant?.id === nextProps.callState.remoteParticipant?.id &&
      prevProps.prefixDataTestId === nextProps.prefixDataTestId
    )
  }
)
