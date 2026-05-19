import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGlobalSearchClient } from '@/common/network/global-search'
import { ApiGlobalSearchAdapter } from './adapters'
import { GlobalSearchContent, GlobalSearchProvider } from './components'

export interface GlobalSearchProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const TEST_ID = 'global-search'

interface GlobalSearchAdditionalData {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const resolveGlobalSearchAdditionalData = (
  additionalData: BusinessAppContextProps['additionalData']
): GlobalSearchAdditionalData => {
  const isOpen = additionalData?.isOpen
  const onOpenChange = additionalData?.onOpenChange

  if (typeof isOpen !== 'boolean' || typeof onOpenChange !== 'function') {
    throw new Error('GlobalSearch requires additionalData.isOpen and additionalData.onOpenChange')
  }

  return {
    isOpen,
    onOpenChange
  }
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ accessToken, additionalData }) => {
  const globalSearchClient = useGlobalSearchClient(accessToken)
  const adapter = useMemo(() => new ApiGlobalSearchAdapter({ client: globalSearchClient }), [globalSearchClient])
  const { isOpen, onOpenChange } = resolveGlobalSearchAdditionalData(additionalData)

  return (
    <div className="gba:h-full gba:w-full" data-testid={TEST_ID}>
      <GlobalSearchProvider
        open={isOpen}
        onOpenChange={onOpenChange}
        accessToken={accessToken}
        adapter={adapter}
        enableKeyboardShortcut={false}
      >
        <GlobalSearchContent />
      </GlobalSearchProvider>
    </div>
  )
}
