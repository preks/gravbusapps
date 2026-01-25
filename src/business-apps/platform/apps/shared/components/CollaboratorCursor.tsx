import React from 'react'

export interface CollaboratorCursorProps {
  userName: string
  userColor: string
  position: {
    x: number
    y: number
  }
  isActive?: boolean
}

/**
 * CollaboratorCursor Component
 *
 * Displays a floating cursor indicator for document collaborators
 * Shows user name and uses their assigned color
 *
 * @example
 * ```tsx
 * <CollaboratorCursor
 *   userName="John Doe"
 *   userColor="#FF6B6B"
 *   position={{ x: 100, y: 200 }}
 *   isActive={true}
 * />
 * ```
 */
export const CollaboratorCursor: React.FC<CollaboratorCursorProps> = ({
  userName,
  userColor,
  position,
  isActive = true
}) => {
  if (!isActive) return null

  return (
    <div
      className="gba:fixed gba:pointer-events-none gba:z-50 gba:transition-all gba:duration-150"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="gba:drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673L8.09087 19.0644C8.45914 20.0772 9.80137 20.2346 10.3815 19.3038L13.4467 14.4352C13.6937 14.0367 14.1338 13.8017 14.6 13.8371L20.4611 14.2646C21.5593 14.3446 22.2916 13.1816 21.6687 12.2643L10.8944 -2.27559C10.263 -3.20771 8.81527 -2.97192 8.51291 -1.90642L5.65376 12.3673Z"
          fill={userColor}
          stroke="currentColor"
          strokeWidth="1.5"
          className="gba:text-background"
        />
      </svg>

      {/* User label */}
      <div
        className="gba:absolute gba:left-6 gba:top-0 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-white gba:whitespace-nowrap gba:shadow-lg gba:animate-in gba:fade-in gba:slide-in-from-left-2"
        style={{ backgroundColor: userColor }}
      >
        {userName}
      </div>
    </div>
  )
}

export default CollaboratorCursor
