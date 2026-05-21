export interface SpreadsheetCollaborationHealthBannerProps {
  testId: string
  collaborationHealth: 'connected' | 'failed' | 'reconnecting'
}

export function SpreadsheetCollaborationHealthBanner({
  testId,
  collaborationHealth
}: SpreadsheetCollaborationHealthBannerProps) {
  if (collaborationHealth !== 'failed') return null

  return (
    <div
      className="gba:fixed gba:top-0 gba:left-0 gba:right-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:bg-red-600 gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-white"
      data-testid={`${testId}-collab-health-banner`}
    >
      <span>Collaboration connection lost. Changes may not sync until you reload.</span>
    </div>
  )
}
