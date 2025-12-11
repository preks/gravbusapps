import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { ShareEntityDialog, ShareEntityConfig } from '@/components/share-entity'

interface BlinkContextType {
  openShareDialog: (entity: ShareEntityConfig) => void
  closeShareDialog: () => void
  isOpen: boolean
}

const BlinkContext = createContext<BlinkContextType | null>(null)

/**
 * Hook to access Blink functionality from any component
 * Must be used within a BlinkProvider
 *
 * @example
 * ```tsx
 * const { openShareDialog } = useBlink()
 *
 * openShareDialog({
 *   entityType: 'lead',
 *   entityId: leadId,
 *   entityName: lead.name,
 *   entityUrl: `/platform/crm/lead-record?leadId=${leadId}`
 * })
 * ```
 */
export const useBlink = () => {
  const context = useContext(BlinkContext)
  if (!context) {
    throw new Error('useBlink must be used within BlinkProvider')
  }
  return context
}

/**
 * Optional hook to access Blink functionality
 * Returns null if not within a BlinkProvider (doesn't throw)
 *
 * Use this when you want to conditionally add blink functionality
 * without requiring the component to be wrapped in a BlinkProvider
 */
export const useBlinkOptional = () => {
  const context = useContext(BlinkContext)
  return context // Returns null if not in provider
}

interface BlinkProviderProps {
  children: React.ReactNode
  accessToken: string
  currentUserId: string
}

/**
 * BlinkProvider - Provides global Blink share functionality
 *
 * This provider manages a single ShareEntityDialog instance that can be opened
 * from anywhere in the component tree using the useBlink() hook.
 *
 * Automatically wrapped around all business app components during build/publish.
 */
export const BlinkProvider: React.FC<BlinkProviderProps> = ({ children, accessToken, currentUserId }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentEntity, setCurrentEntity] = useState<ShareEntityConfig | null>(null)

  const openShareDialog = useCallback((entity: ShareEntityConfig) => {
    setCurrentEntity(entity)
    setIsOpen(true)
  }, [])

  const closeShareDialog = useCallback(() => {
    setIsOpen(false)
  }, [])

  const contextValue = useMemo(
    () => ({
      openShareDialog,
      closeShareDialog,
      isOpen
    }),
    [openShareDialog, closeShareDialog, isOpen]
  )

  return (
    <BlinkContext.Provider value={contextValue}>
      {children}
      {currentEntity && (
        <ShareEntityDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          accessToken={accessToken}
          currentUserId={currentUserId}
          entity={currentEntity}
        />
      )}
    </BlinkContext.Provider>
  )
}

export default BlinkProvider
