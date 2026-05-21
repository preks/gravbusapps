import { useCallback, useEffect, useState } from 'react'

export type AnalyticsPanelTab = 'charts' | 'insights' | 'summary' | 'pivot'
export type SheetsAITab = 'formula' | 'analyze' | 'review' | 'insights'
export type AICapability = 'charts' | SheetsAITab

export interface UseSpreadsheetSidePanelStateParams {
  accessToken: string
  activeSheetId: string
  refreshAutomationsFromDocumentService: () => Promise<void>
}

export interface UseSpreadsheetSidePanelStateResult {
  isAutomationsOpen: boolean
  isAnalyticsOpen: boolean
  isSheetsAIOpen: boolean
  analyticsInitialTab: AnalyticsPanelTab
  sheetsAIInitialTab: SheetsAITab
  handleOpenAICapability: (capability: AICapability) => void
  openAnalyticsPanel: () => void
  openAutomationsPanel: () => void
  closeAutomationsPanel: () => void
  closeAnalyticsPanel: () => void
  closeSheetsAIPanel: () => void
}

export function useSpreadsheetSidePanelState(
  params: UseSpreadsheetSidePanelStateParams
): UseSpreadsheetSidePanelStateResult {
  const { accessToken, activeSheetId, refreshAutomationsFromDocumentService } = params
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [isSheetsAIOpen, setIsSheetsAIOpen] = useState(false)
  const [analyticsInitialTab, setAnalyticsInitialTab] = useState<AnalyticsPanelTab>('charts')
  const [sheetsAIInitialTab, setSheetsAIInitialTab] = useState<SheetsAITab>('formula')

  useEffect(() => {
    if (!isAutomationsOpen || !accessToken) return
    void refreshAutomationsFromDocumentService()
  }, [isAutomationsOpen, activeSheetId, accessToken, refreshAutomationsFromDocumentService])

  const handleOpenAICapability = useCallback((capability: AICapability) => {
    if (capability === 'charts') {
      setAnalyticsInitialTab('charts')
      setIsSheetsAIOpen(false)
      setIsAutomationsOpen(false)
      setIsAnalyticsOpen(true)
      return
    }

    setSheetsAIInitialTab(capability)
    setIsAnalyticsOpen(false)
    setIsAutomationsOpen(false)
    setIsSheetsAIOpen(true)
  }, [])

  const openAnalyticsPanel = useCallback(() => {
    setAnalyticsInitialTab('charts')
    setIsSheetsAIOpen(false)
    setIsAutomationsOpen(false)
    setIsAnalyticsOpen(true)
  }, [])

  const openAutomationsPanel = useCallback(() => {
    setIsSheetsAIOpen(false)
    setIsAnalyticsOpen(false)
    setIsAutomationsOpen(true)
  }, [])

  const closeAutomationsPanel = useCallback(() => {
    setIsAutomationsOpen(false)
  }, [])

  const closeAnalyticsPanel = useCallback(() => {
    setIsAnalyticsOpen(false)
  }, [])

  const closeSheetsAIPanel = useCallback(() => {
    setIsSheetsAIOpen(false)
  }, [])

  return {
    isAutomationsOpen,
    isAnalyticsOpen,
    isSheetsAIOpen,
    analyticsInitialTab,
    sheetsAIInitialTab,
    handleOpenAICapability,
    openAnalyticsPanel,
    openAutomationsPanel,
    closeAutomationsPanel,
    closeAnalyticsPanel,
    closeSheetsAIPanel
  }
}
