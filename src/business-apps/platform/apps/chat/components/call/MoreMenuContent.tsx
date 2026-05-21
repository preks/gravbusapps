/**
 * Mobile "More" menu content: background, raise hand, reactions.
 */

import React from 'react'
import { ImageIcon, HandIcon, SwapIcon } from '@phosphor-icons/react'
import { ReactionsPicker } from './ReactionsPicker'

export interface MoreMenuContentProps {
  callType: 'audio' | 'video'
  backgroundEnabled: boolean
  handRaised: boolean
  isMirrorEnabled?: boolean
  onToggleMirror?: () => void
  onToggleBackground?: () => void
  onToggleRaiseHand?: () => void
  onSendReaction?: (emoji: string) => void
  onClose: () => void
  t?: (key: string) => string
  prefixDataTestId?: string
}

const defaultT = (key: string) => key

export const MoreMenuContent: React.FC<MoreMenuContentProps> = ({
  callType,
  backgroundEnabled,
  handRaised,
  isMirrorEnabled,
  onToggleMirror,
  onToggleBackground,
  onToggleRaiseHand,
  onSendReaction,
  onClose,
  t = defaultT,
  prefixDataTestId = 'rtk-group-call'
}) => {
  const handleReaction = (emoji: string) => {
    onSendReaction?.(emoji)
    onClose()
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      {onToggleBackground && callType === 'video' && (
        <button
          type="button"
          onClick={() => {
            onToggleBackground()
            onClose()
          }}
          className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:text-left gba:w-full ${
            backgroundEnabled ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/20' : ''
          }`}
          data-testid={`${prefixDataTestId}-background-btn-mobile`}
        >
          <div
            className={`gba:p-2 gba:rounded-lg ${backgroundEnabled ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-accent'}`}
          >
            <ImageIcon className="gba:w-5 gba:h-5" weight="fill" />
          </div>
          <span className="gba:text-sm gba:font-medium">
            {backgroundEnabled
              ? t('groupCall-disableBackground') || 'Disable background effect'
              : t('groupCall-enableBackground') || 'Enable background effect'}
          </span>
        </button>
      )}

      {onToggleMirror && callType === 'video' && (
        <button
          type="button"
          onClick={() => {
            onToggleMirror()
            onClose()
          }}
          className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:text-left gba:w-full ${
            isMirrorEnabled ? 'gba:bg-primary/10 gba:ring-1 gba:ring-primary/20' : ''
          }`}
          data-testid={`${prefixDataTestId}-mirror-btn-mobile`}
        >
          <div
            className={`gba:p-2 gba:rounded-lg ${isMirrorEnabled ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-accent'}`}
          >
            <SwapIcon className="gba:w-5 gba:h-5" weight="fill" />
          </div>
          <span className="gba:text-sm gba:font-medium">
            {isMirrorEnabled
              ? t('groupCall-disableMirror') || 'Disable mirror view'
              : t('groupCall-enableMirror') || 'Enable mirror view'}
          </span>
        </button>
      )}

      {onToggleRaiseHand && (
        <button
          type="button"
          onClick={() => {
            onToggleRaiseHand()
            onClose()
          }}
          className={`gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:text-left gba:w-full ${
            handRaised ? 'gba:bg-warning/10 gba:ring-1 gba:ring-warning/20' : ''
          }`}
          data-testid={`${prefixDataTestId}-raise-hand-btn-mobile`}
        >
          <div
            className={`gba:p-2 gba:rounded-lg ${handRaised ? 'gba:bg-warning gba:text-warning-foreground' : 'gba:bg-accent'}`}
          >
            <HandIcon className="gba:w-5 gba:h-5" weight="fill" />
          </div>
          <span className="gba:text-sm gba:font-medium">{handRaised ? 'Lower hand' : 'Raise hand'}</span>
        </button>
      )}

      {onSendReaction && (
        <>
          {(onToggleBackground || onToggleRaiseHand) && <div className="gba:h-px gba:bg-border gba:my-1" />}
          <ReactionsPicker
            onSelect={handleReaction}
            layout="grid"
            prefixDataTestId={prefixDataTestId}
            testIdSuffix="mobile"
            sectionLabel="Reactions"
          />
        </>
      )}
    </div>
  )
}
