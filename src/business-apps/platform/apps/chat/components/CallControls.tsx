import React from 'react'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CallControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  isVideoCall: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onEndCall: () => void
  prefixDataTestId?: string
}

interface ControlButtonProps {
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  variant?: 'default' | 'destructive'
  testId: string
}

const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  activeIcon,
  label,
  isActive,
  onClick,
  variant = 'default',
  testId
}) => {
  const buttonStyles = {
    default: isActive
      ? 'gba:bg-white/20 gba:text-white gba:hover:bg-white/30'
      : 'gba:bg-white/10 gba:text-white gba:hover:bg-white/20',
    destructive: 'gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90'
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={`gba:w-12 gba:h-12 gba:rounded-full gba:transition-all ${buttonStyles[variant]}`}
          data-testid={testId}
        >
          {isActive && activeIcon ? activeIcon : icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isVideoCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  prefixDataTestId = 'call-controls'
}) => {
  return (
    <div
      className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:py-4 gba:px-6 gba:bg-gradient-to-t gba:from-black/80 gba:to-transparent"
      data-testid={prefixDataTestId}
    >
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-4">
        {/* Mute Button */}
        <ControlButton
          icon={<Mic className="gba:w-5 gba:h-5" />}
          activeIcon={<MicOff className="gba:w-5 gba:h-5" />}
          label={
            isMuted
              ? getTranslationFromI18nKeyAndLabel('call.unmute', 'Unmute')
              : getTranslationFromI18nKeyAndLabel('call.mute', 'Mute')
          }
          isActive={isMuted}
          onClick={onToggleMute}
          testId={`${prefixDataTestId}-mute`}
        />

        {/* Video Toggle Button (only for video calls) */}
        {isVideoCall && (
          <ControlButton
            icon={<Video className="gba:w-5 gba:h-5" />}
            activeIcon={<VideoOff className="gba:w-5 gba:h-5" />}
            label={
              isVideoOff
                ? getTranslationFromI18nKeyAndLabel('call.turnOnCamera', 'Turn on camera')
                : getTranslationFromI18nKeyAndLabel('call.turnOffCamera', 'Turn off camera')
            }
            isActive={isVideoOff}
            onClick={onToggleVideo}
            testId={`${prefixDataTestId}-video`}
          />
        )}

        {/* Screen Share Button (only for video calls) */}
        {isVideoCall && (
          <ControlButton
            icon={<MonitorUp className="gba:w-5 gba:h-5" />}
            activeIcon={<MonitorOff className="gba:w-5 gba:h-5" />}
            label={
              isScreenSharing
                ? getTranslationFromI18nKeyAndLabel('call.stopSharing', 'Stop sharing')
                : getTranslationFromI18nKeyAndLabel('call.shareScreen', 'Share screen')
            }
            isActive={isScreenSharing}
            onClick={onToggleScreenShare}
            testId={`${prefixDataTestId}-screen-share`}
          />
        )}

        {/* End Call Button */}
        <ControlButton
          icon={<PhoneOff className="gba:w-5 gba:h-5" />}
          label={getTranslationFromI18nKeyAndLabel('call.endCall', 'End call')}
          isActive={false}
          onClick={onEndCall}
          variant="destructive"
          testId={`${prefixDataTestId}-end`}
        />
      </div>
    </div>
  )
}
