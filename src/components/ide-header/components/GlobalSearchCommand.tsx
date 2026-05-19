import { useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@newwork/nw-design-system'
import {
  ApiGlobalSearchAdapter,
  GlobalSearchContent,
  GlobalSearchProvider
} from '@/business-apps/core/use/apps/global-search'
import { useGlobalSearchClient } from '@/common/network/global-search'

export interface GlobalSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken?: string
}

export const GlobalSearchCommand: React.FC<GlobalSearchCommandProps> = ({ open, onOpenChange, accessToken }) => {
  const globalSearchClient = useGlobalSearchClient(accessToken)
  const adapter = useMemo(() => new ApiGlobalSearchAdapter({ client: globalSearchClient }), [globalSearchClient])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="gba:!left-0 gba:!right-0 gba:!top-24 gba:!mx-auto gba:!w-full gba:!max-w-4xl gba:!min-w-0 gba:!translate-x-0 gba:!translate-y-0 gba:!overflow-hidden gba:!rounded-lg gba:!border gba:!border-border gba:!bg-background gba:!p-0 gba:!shadow-lg"
        data-testid="GlobalSearchCommand"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Search in NEWWORK</DialogTitle>
        </VisuallyHidden>
        <div className="gba:h-full gba:w-full gba:min-w-0 gba:overflow-hidden">
          <GlobalSearchProvider open={open} onOpenChange={onOpenChange} accessToken={accessToken} adapter={adapter}>
            <GlobalSearchContent />
          </GlobalSearchProvider>
        </div>
      </DialogContent>
    </Dialog>
  )
}
