/**
 * Center section of call controls: screen share, background, raise hand, reactions, more menu.
 */

import React from 'react'
import { MonitorIcon, ImageIcon, HandIcon, SmileyIcon, DotsThreeIcon } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { ControlBarButton } from './ControlBarButton'
import { ReactionsPicker } from './ReactionsPicker'
import { MoreMenuContent } from './MoreMenuContent'

export interface CallControlsCenterSectionProps {
  callType: 'audio' | 'video'
  isScreenSharing: boolean
  backgroundEnabled: boolean
  handRaised: boolean
  showDesktopLayout: boolean
  showMoreMenu: boolean
  mobileMenuOptionCount: number
  reactionsOpen: boolean
  setReactionsOpen: (open: boolean) => void
  moreMenuOpen: boolean
  setMoreMenuOpen: (open: boolean) => void
  onToggleScreenShare?: () => void
  onToggleBackground?: () => void
  onToggleRaiseHand?: () => void
  onSendReaction?: (emoji: string) => void
  prefixDataTestId: string
  t: (key: string) => string
}

const iconSizeDesktop = 'gba:w-5 gba:h-5'
const iconSizeMobile = 'gba:w-4 gba:h-4'

export const CallControlsCenterSection: React.FC<CallControlsCenterSectionProps> = ({
  callType,
  isScreenSharing,
  backgroundEnabled,
  handRaised,
  showDesktopLayout,
  showMoreMenu,
  mobileMenuOptionCount,
  reactionsOpen,
  setReactionsOpen,
  moreMenuOpen,
  setMoreMenuOpen,
  onToggleScreenShare,
  onToggleBackground,
  onToggleRaiseHand,
  onSendReaction,
  prefixDataTestId,
  t
}) => {
  const size = showDesktopLayout ? 'desktop' : 'mobile'
  const iconSize = showDesktopLayout ? iconSizeDesktop : iconSizeMobile

  return (
    <div className={`gba:flex gba:items-center ${showDesktopLayout ? 'gba:gap-3' : 'gba:gap-2'}`}>
      {onToggleScreenShare && (
        <ControlBarButton
          variant={isScreenSharing ? 'primary' : 'accent'}
          size={size}
          icon={<MonitorIcon className={iconSize} weight="fill" />}
          onClick={onToggleScreenShare}
          aria-label={
            isScreenSharing ? t('chat-stopSharing') || 'Stop sharing' : t('chat-shareScreen') || 'Share screen'
          }
          title={isScreenSharing ? t('chat-stopSharing') || 'Stop sharing' : t('chat-shareScreen') || 'Share screen'}
          data-testid={`${prefixDataTestId}-screen-share-btn`}
        />
      )}

      {showDesktopLayout && (
        <div className="gba:flex gba:items-center gba:gap-2">
          {onToggleBackground && callType === 'video' && (
            <ControlBarButton
              variant={backgroundEnabled ? 'primary' : 'accent'}
              size="desktop"
              icon={<ImageIcon className={iconSizeDesktop} weight="fill" />}
              onClick={onToggleBackground}
              aria-label={
                backgroundEnabled
                  ? t('groupCall-disableBackground') || 'Disable background'
                  : t('groupCall-enableBackground') || 'Enable background'
              }
              title={
                backgroundEnabled
                  ? t('groupCall-disableBackground') || 'Disable background'
                  : t('groupCall-enableBackground') || 'Enable background'
              }
              data-testid={`${prefixDataTestId}-background-btn`}
            />
          )}
          {onToggleRaiseHand && (
            <ControlBarButton
              variant={handRaised ? 'warning' : 'accent'}
              size="desktop"
              icon={<HandIcon className={iconSizeDesktop} weight="fill" />}
              onClick={onToggleRaiseHand}
              aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
              data-testid={`${prefixDataTestId}-raise-hand-btn`}
            />
          )}
          {onSendReaction && (
            <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
              <PopoverTrigger asChild>
                <ControlBarButton
                  variant="accent"
                  size="desktop"
                  icon={<SmileyIcon className={iconSizeDesktop} weight="fill" />}
                  onClick={() => {}}
                  aria-label="Send reaction"
                  title="Send reaction"
                  data-testid={`${prefixDataTestId}-reactions-btn`}
                />
              </PopoverTrigger>
              <PopoverContent
                className="gba:w-auto gba:p-2"
                side="top"
                data-testid={`${prefixDataTestId}-reactions-popover`}
              >
                <ReactionsPicker
                  onSelect={emoji => {
                    onSendReaction(emoji)
                    setReactionsOpen(false)
                  }}
                  layout="inline"
                  prefixDataTestId={prefixDataTestId}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {!showDesktopLayout && mobileMenuOptionCount === 1 && (
        <div className="gba:flex gba:items-center gba:gap-1">
          {onToggleBackground && callType === 'video' && (
            <ControlBarButton
              variant={backgroundEnabled ? 'primary' : 'accent'}
              size="mobile"
              icon={<ImageIcon className={iconSizeMobile} weight="fill" />}
              onClick={onToggleBackground}
              aria-label={
                backgroundEnabled
                  ? t('groupCall-disableBackground') || 'Disable background'
                  : t('groupCall-enableBackground') || 'Enable background'
              }
              title={
                backgroundEnabled
                  ? t('groupCall-disableBackground') || 'Disable background'
                  : t('groupCall-enableBackground') || 'Enable background'
              }
              data-testid={`${prefixDataTestId}-background-btn-mobile`}
            />
          )}
          {onToggleRaiseHand && (
            <ControlBarButton
              variant={handRaised ? 'warning' : 'accent'}
              size="mobile"
              icon={<HandIcon className={iconSizeMobile} weight="fill" />}
              onClick={onToggleRaiseHand}
              aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
              data-testid={`${prefixDataTestId}-raise-hand-btn-mobile`}
            />
          )}
          {onSendReaction && (
            <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
              <PopoverTrigger asChild>
                <ControlBarButton
                  variant="accent"
                  size="mobile"
                  icon={<SmileyIcon className={iconSizeMobile} weight="fill" />}
                  onClick={() => {}}
                  aria-label="Send reaction"
                  title="Send reaction"
                  data-testid={`${prefixDataTestId}-reactions-btn-mobile`}
                />
              </PopoverTrigger>
              <PopoverContent
                className="gba:w-auto gba:p-2"
                side="top"
                data-testid={`${prefixDataTestId}-reactions-popover-mobile`}
              >
                <ReactionsPicker
                  onSelect={emoji => {
                    onSendReaction(emoji)
                    setReactionsOpen(false)
                  }}
                  layout="inline"
                  prefixDataTestId={prefixDataTestId}
                  testIdSuffix="mobile"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {showMoreMenu && (
        <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <PopoverTrigger asChild>
            <ControlBarButton
              variant="accent"
              size="mobile"
              icon={<DotsThreeIcon className={iconSizeMobile} weight="fill" />}
              onClick={() => {}}
              aria-label="More options"
              title="More options"
              data-testid={`${prefixDataTestId}-more-btn`}
            />
          </PopoverTrigger>
          <PopoverContent
            className="gba:w-64 gba:p-3"
            side="top"
            align="end"
            data-testid={`${prefixDataTestId}-more-menu`}
          >
            <MoreMenuContent
              callType={callType}
              backgroundEnabled={backgroundEnabled}
              handRaised={handRaised}
              onToggleBackground={onToggleBackground}
              onToggleRaiseHand={onToggleRaiseHand}
              onSendReaction={onSendReaction}
              onClose={() => setMoreMenuOpen(false)}
              t={t}
              prefixDataTestId={prefixDataTestId}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
