/**
 * ScreenShareView Component
 *
 * Full-screen expanded view for screen sharing
 * Shows the screen share in a maximized overlay with:
 * - Full-screen video
 * - Participant name
 * - Close button
 * - Click-to-close functionality
 */

import React, { useRef, useEffect } from 'react'
import { Monitor, Shrink } from 'lucide-react'

export interface ScreenShareViewProps {
  /** Peer ID sharing the screen */
  peerId: string
  /** Name of the peer sharing */
  peerName: string
  /** MediaStream containing the screen share */
  stream: MediaStream
  /** Callback when user closes the expanded view */
  onClose: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Translation function */
  t?: (key: string) => string
}

export const ScreenShareView: React.FC<ScreenShareViewProps> = ({
  // peerId - not used
  peerName,
  stream,
  onClose,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-50 gba:bg-black gba:flex gba:items-center gba:justify-center gba:cursor-pointer"
      onClick={onClose}
      data-testid={`${prefixDataTestId}-expanded-screenshare`}
    >
      {/* Close button */}
      <button
        className="gba:absolute gba:top-4 gba:right-4 gba:p-3 gba:rounded-full gba:bg-white/10 hover:gba:bg-white/20 gba:text-white gba:transition-colors gba:z-10"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
        title="Close"
        data-testid={`${prefixDataTestId}-expanded-screenshare-close`}
      >
        <Shrink className="gba:h-6 gba:w-6" />
      </button>

      {/* Participant name overlay */}
      <div className="gba:absolute gba:top-4 gba:left-4 gba:bg-black/60 gba:text-white gba:px-4 gba:py-2 gba:rounded-lg gba:flex gba:items-center gba:gap-2">
        <Monitor className="gba:h-4 gba:w-4" />
        <span>{`${peerName} ${t('chat-isSharingScreen') || 'is sharing their screen'}`}</span>
      </div>

      {/* Video element - object-contain to preserve aspect ratio */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="gba:max-w-full gba:max-h-full gba:object-contain"
        data-testid={`${prefixDataTestId}-expanded-screenshare-video`}
      />

      {/* Click hint */}
      <div className="gba:absolute gba:bottom-4 gba:left-1/2 gba:-translate-x-1/2 gba:text-white/60 gba:text-sm">
        {t('call-clickToClose') || 'Click anywhere to close'}
      </div>
    </div>
  )
}
