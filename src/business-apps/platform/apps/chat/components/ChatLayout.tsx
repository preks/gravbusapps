/**
 * Outer chat layout: container, PerformanceMonitor, OfflineBanner, error Alert,
 * and flex slots for conversation list and chat view.
 */

import React, { type RefObject } from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { PerformanceMonitor } from './PerformanceMonitor'

export interface ChatLayoutProps {
  containerRef: RefObject<HTMLDivElement>
  prefixDataTestId: string
  errorMessage: string | null
  onDismissError: () => void
  isOffline: boolean
  offlineLabel: string
  conversationId: string | null
  messageCount: number
  showListView: boolean
  showChatView: boolean
  isSingleViewMode: boolean
  chatViewRef?: RefObject<HTMLDivElement>
  listSlot: React.ReactNode
  chatViewSlot: React.ReactNode
}

export function ChatLayout({
  containerRef,
  prefixDataTestId,
  errorMessage,
  onDismissError,
  isOffline,
  offlineLabel,
  conversationId,
  messageCount,
  showListView,
  showChatView,
  isSingleViewMode,
  chatViewRef,
  listSlot,
  chatViewSlot
}: Readonly<ChatLayoutProps>) {
  return (
    <div
      ref={containerRef}
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
      data-testid={prefixDataTestId}
    >
      <PerformanceMonitor conversationId={conversationId} messageCount={messageCount} />

      {isOffline && (
        <div className="gba:px-3 gba:py-2 gba:bg-warning/10 gba:border-b gba:border-warning/20">
          <p className="gba:text-xs gba:text-warning-foreground gba:text-center">{offlineLabel}</p>
        </div>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="gba:mx-2 gba:mt-2 gba:mb-0">
          <AlertDescription className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <span>{errorMessage}</span>
            <button
              onClick={onDismissError}
              className="gba:text-destructive-foreground gba:hover:opacity-70 gba:text-lg gba:font-bold gba:px-2"
              aria-label="Dismiss"
            >
              ×
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="gba:flex-1 gba:flex gba:flex-row gba:min-h-0 gba:h-full gba:overflow-hidden">
        {showListView && (
          <div
            className={`gba:flex gba:flex-col gba:h-full gba:border-r gba:border-border/50 gba:bg-muted/30 ${
              isSingleViewMode ? 'gba:w-full' : 'gba:w-72 gba:flex-shrink-0'
            }`}
          >
            {listSlot}
          </div>
        )}
        {showChatView && (
          <div
            ref={chatViewRef}
            className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:h-full gba:max-h-full gba:overflow-hidden gba:relative"
          >
            {chatViewSlot}
          </div>
        )}
      </div>
    </div>
  )
}
