/**
 * Icon-based reactions picker. Reusable in call controls and chat (message reactions).
 */

import React from 'react'
import { ThumbsUpIcon, HeartIcon, SmileyIcon, HandsClappingIcon, StarIcon } from '@phosphor-icons/react'

export interface ReactionOption {
  id: string
  label: string
  Icon: React.ElementType
}

export const REACTIONS: ReactionOption[] = [
  { id: 'thumbs-up', label: 'Thumbs up', Icon: ThumbsUpIcon },
  { id: 'heart', label: 'Heart', Icon: HeartIcon },
  { id: 'laugh', label: 'Laugh', Icon: SmileyIcon },
  { id: 'clap', label: 'Clap', Icon: HandsClappingIcon },
  { id: 'party', label: 'Party', Icon: StarIcon }
]

export type ReactionsPickerLayout = 'inline' | 'grid'

export interface ReactionsPickerProps {
  onSelect: (reactionId: string) => void
  layout?: ReactionsPickerLayout
  prefixDataTestId?: string
  testIdSuffix?: string
  /** Optional label for the section (e.g. in more menu) */
  sectionLabel?: string
}

const iconSize = 28

export const ReactionsPicker: React.FC<ReactionsPickerProps> = ({
  onSelect,
  layout = 'inline',
  prefixDataTestId = 'rtk-group-call',
  testIdSuffix = '',
  sectionLabel
}) => {
  const suffix = testIdSuffix ? `-${testIdSuffix}` : ''

  const buttons = (
    <>
      {REACTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={
            layout === 'inline'
              ? 'gba:p-2 gba:rounded-lg hover:gba:bg-accent gba:transition-all gba:flex gba:items-center gba:justify-center gba:text-foreground'
              : 'gba:aspect-square gba:p-3 gba:rounded-xl hover:gba:bg-accent gba:transition-all gba:flex gba:items-center gba:justify-center hover:gba:scale-110 active:gba:scale-95 gba:text-foreground'
          }
          title={`Send ${label}`}
          data-testid={`${prefixDataTestId}-reaction-${id}${suffix}`}
          aria-label={`Send ${label} reaction`}
        >
          <Icon size={iconSize} weight="fill" className="gba:shrink-0" />
        </button>
      ))}
    </>
  )

  return (
    <>
      {sectionLabel && (
        <div className="gba:px-1 gba:py-1">
          <span className="gba:text-xs gba:text-muted-foreground gba:font-semibold gba:uppercase gba:tracking-wide">
            {sectionLabel}
          </span>
        </div>
      )}
      <div
        className={layout === 'inline' ? 'gba:flex gba:gap-1' : 'gba:grid gba:grid-cols-5 gba:gap-2 gba:px-1 gba:py-2'}
      >
        {buttons}
      </div>
    </>
  )
}
