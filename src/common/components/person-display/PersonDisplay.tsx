import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'

export interface PersonDisplayProps {
  /** Display name (e.g. displayName, fullName, or "firstName lastName") */
  displayName: string
  /** Optional picture URL or base64 thumbnail */
  pictureThumbnail?: string | null
  /** Optional: when provided with onClick, makes the block clickable to navigate to employee record */
  employeeId?: string
  /** Optional: called with employeeId when user clicks (e.g. navigateTo employee record) */
  onClick?: (employeeId: string) => void
  /** Optional data-testid prefix for the root element */
  dataTestId?: string
  /** Optional class for the root wrapper */
  className?: string
}

/**
 * Renders a person with optional avatar and display name.
 * When onClick and employeeId are provided, the content is wrapped in a button that calls onClick(employeeId).
 */
export const PersonDisplay: React.FC<PersonDisplayProps> = ({
  displayName,
  pictureThumbnail,
  employeeId,
  onClick,
  dataTestId,
  className = ''
}) => {
  const name = displayName?.trim() || '–'
  const isClickable = !!(onClick && employeeId)
  const avatarSrc =
    pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined
  const initials =
    name !== '–'
      ? name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '–'

  const content = (
    <div className={`gba:flex gba:items-center gba:gap-2 ${className}`.trim()}>
      {avatarSrc ? (
        <Avatar
          size="default"
          className="gba:h-8 gba:w-8"
          data-testid={dataTestId ? `${dataTestId}-avatar` : undefined}
        >
          <AvatarImage src={avatarSrc} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ) : name !== '–' ? (
        <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
          {initials}
        </div>
      ) : null}
      <span className={`gba:font-semibold gba:text-sm ${isClickable ? 'gba:hover:underline' : ''}`.trim()}>
        {name === '–' ? <span className="gba:text-muted-foreground">–</span> : name}
      </span>
    </div>
  )

  if (onClick && employeeId) {
    return (
      <button
        type="button"
        onClick={() => onClick(employeeId)}
        className="group gba:text-left gba:w-full hover:gba:opacity-80 gba:cursor-pointer"
        data-testid={dataTestId ?? undefined}
      >
        {content}
      </button>
    )
  }

  return <div data-testid={dataTestId}>{content}</div>
}
