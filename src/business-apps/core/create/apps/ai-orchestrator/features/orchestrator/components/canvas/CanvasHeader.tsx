/**
 * CanvasHeader - Header bar for the canvas panel that aligns with the chat header.
 */

interface CanvasHeaderProps {
  title?: string
  actions?: React.ReactNode
  testId?: string
}

export const CanvasHeader = ({ title, actions, testId = 'canvas-header' }: CanvasHeaderProps) => {
  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0 gba:bg-background gba:h-[56px] gba:-ml-px gba:border-l gba:border-l-border"
      data-testid={testId}
    >
      {title && (
        <span className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:text-foreground">{title}</span>
      )}
      {actions && <div className="gba:flex gba:items-center gba:gap-2">{actions}</div>}
    </div>
  )
}
