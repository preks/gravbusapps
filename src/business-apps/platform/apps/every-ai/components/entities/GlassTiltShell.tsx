import React from 'react'

/**
 * Calm premium card surface for the references rail: near-white with a whisper
 * of blue, a crisp hairline border, and one soft neutral shadow. On hover the
 * card lifts a touch and the border picks up a hint of blue — no 3D, no glow.
 *
 * NOTE: Tailwind here is v4 with `prefix(gba)`, so the prefix comes BEFORE
 * variants (`gba:hover:...`), never `hover:gba:...` (which silently does not
 * compile).
 */
const SURFACE =
  'gba:rounded-xl gba:border gba:border-slate-200/90 ' +
  'gba:bg-gradient-to-b gba:from-white gba:to-sky-50/50 ' +
  'gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ' +
  'gba:transition-all gba:duration-200 ' +
  'gba:hover:-translate-y-0.5 gba:hover:border-sky-300/70 ' +
  'gba:hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_14px_32px_-14px_rgba(30,64,175,0.22)]'

export interface GlassTiltShellProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  'data-testid'?: string
}

export const GlassTiltShell: React.FC<GlassTiltShellProps> = ({
  children,
  onClick,
  className = '',
  'data-testid': dataTestId
}) => {
  const clickProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }
      }
    : {}

  return (
    <div className={className}>
      <div
        {...clickProps}
        data-testid={dataTestId}
        className={`gba:relative gba:overflow-hidden ${SURFACE} ${onClick ? 'gba:cursor-pointer' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

export default GlassTiltShell
