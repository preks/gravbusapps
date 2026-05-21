import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SheetsAIPanel } from '../SheetsAIPanel'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>
}))

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined
}))

const mockGenerateFormula = jest.fn()
const mockApplyFormula = jest.fn().mockResolvedValue(true)
const mockRunAnalyze = jest.fn()
const mockSendMessage = jest.fn().mockResolvedValue(undefined)
const mockRunReview = jest.fn()

jest.mock('@newwork/nw-design-system', () => {
  const TabsContext = React.createContext({ value: '', onValueChange: () => {} })
  return {
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) => {
        const map: Record<string, string> = {
          'sheets-ai-title-formula': 'Generate a formula',
          'sheets-ai-title-analyze': 'Analyze data',
          'sheets-ai-title-review': 'Smart review',
          'sheets-ai-title-insights': 'AI insights',
          'sheets-ai-title-default': 'Sheets AI',
          'sheets-ai-tab-analyze': 'Analyze',
          'sheets-ai-tab-review': 'Review',
          'sheets-ai-tab-insights': 'Insights',
          'sheets-ai-formula-description': 'Describe the formula you need in plain language.',
          'sheets-ai-columns-label': 'Columns:',
          'sheets-ai-ellipsis': '...',
          'sheets-ai-formula-placeholder': 'e.g., "Sum sales where region is EMEA"',
          'sheets-ai-generate-formula': 'Generate Formula',
          'sheets-ai-copy': 'Copy',
          'sheets-ai-preview-result': `Preview result (sample row): ${vars?.value ?? ''}`,
          'sheets-ai-columns-detected': `${vars?.rows ?? 0} rows x ${vars?.columns ?? 0} columns detected`,
          'sheets-ai-analyzing': 'Analyzing...',
          'sheets-ai-analyze-sheet': 'Analyze Sheet',
          'sheets-ai-completeness': `Completeness: ${vars?.score ?? ''}`,
          'sheets-ai-consistency': `Consistency: ${vars?.score ?? ''}`,
          'sheets-ai-validity': `Validity: ${vars?.score ?? ''}`,
          'sheets-ai-narrative': 'Narrative',
          'sheets-ai-anomalies': 'Anomalies',
          'sheets-ai-severity-low': 'low',
          'sheets-ai-severity-medium': 'medium',
          'sheets-ai-severity-high': 'high',
          'sheets-ai-no-anomalies': 'No high-impact anomalies detected.',
          'sheets-ai-no-analysis': 'No analysis yet',
          'sheets-ai-analysis-empty-description': 'Run AI quality checks and summary narrative.',
          'sheets-ai-last-reviewed': 'Last reviewed:',
          'sheets-ai-running-review': 'Running Smart Review...',
          'sheets-ai-run-review': 'Run Smart Review',
          'sheets-ai-overall-quality-score': 'Overall Quality Score',
          'sheets-ai-add-summary-to-comments': 'Add Summary to Comments',
          'menu-save-checkpoint': 'Save checkpoint',
          'sheets-ai-no-review': 'No review yet',
          'sheets-ai-review-empty-description': 'Run smart review to assess sheet quality and highlight improvements.',
          'sheets-ai-no-insights': 'No insights yet',
          'sheets-ai-run-insights': 'Run AI insights',
          'analytics-rows-cols': `${vars?.rows ?? 0} rows · ${vars?.cols ?? 0} cols`,
          'analytics-generating': 'Generating…',
          'analytics-using-local-fallback': `Local fallback: ${vars?.error ?? ''}`,
          'analytics-insights-empty': 'Run AI insights to see highlights.'
        }
        return map[key] ?? key
      },
      locale: 'en-US'
    }),
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    Tabs: ({ value, onValueChange, children }: any) => (
      <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: any) => {
      const ctx = React.useContext(TabsContext)
      return <button onClick={() => ctx.onValueChange(value)}>{children}</button>
    },
    TabsContent: ({ value, children }: any) => {
      const ctx = React.useContext(TabsContext)
      return ctx.value === value ? <div>{children}</div> : null
    }
  }
})

jest.mock('../../hooks/useSheetsAIFormula', () => ({
  useSheetsAIFormula: () => ({
    intent: 'generate formula',
    setIntent: jest.fn(),
    selectedColumn: 'Sales',
    setSelectedColumn: jest.fn(),
    generatedFormula: '=SUM(Sales)',
    explanation: 'Sums Sales',
    previewValue: '120',
    isGenerating: false,
    isApplying: false,
    error: null,
    generateFormula: mockGenerateFormula,
    applyFormula: mockApplyFormula
  })
}))

jest.mock('../../hooks/useSheetsAIAnalyze', () => ({
  useSheetsAIAnalyze: () => ({
    result: null,
    isLoading: false,
    error: null,
    runAnalysis: mockRunAnalyze
  })
}))

jest.mock('../../hooks/useSheetsAIChat', () => ({
  useSheetsAIChat: () => ({
    messages: [],
    isSending: false,
    error: null,
    sendMessage: mockSendMessage
  })
}))

jest.mock('../../hooks/useSheetsAIReview', () => ({
  useSheetsAIReview: () => ({
    review: null,
    lastReviewedAt: null,
    isRunning: false,
    error: null,
    runReview: mockRunReview
  })
}))

describe('SheetsAIPanel', () => {
  it('renders formula tools by default and shows Analyze/Review/Insights when opened in analyze mode', () => {
    const baseProps = {
      isOpen: true,
      onClose: jest.fn(),
      appId: 'app_1',
      sheetId: 'sheet_1',
      sheetName: 'Sales',
      accessToken: 'token',
      columns: [{ id: 'c1', name: 'Sales', label: 'Sales', type: 'number', isVisible: true } as any],
      sheetData: [{ Sales: 10 }],
      onApplyFormula: jest.fn().mockResolvedValue(true),
      onCreateReviewComment: jest.fn().mockResolvedValue(true),
      onOpenCheckpointDialog: jest.fn()
    }

    const { unmount } = render(<SheetsAIPanel {...baseProps} />)
    expect(screen.getByRole('button', { name: /Generate Formula/i })).toBeTruthy()
    expect(screen.getByPlaceholderText(/Sum sales where region is EMEA/i)).toBeTruthy()
    unmount()

    render(<SheetsAIPanel {...baseProps} initialTab="analyze" />)
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insights' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Analyze Sheet/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByRole('button', { name: /Run Smart Review/i })).toBeTruthy()
  })

  it('calls generate formula action in Formula tab', () => {
    render(
      <SheetsAIPanel
        isOpen={true}
        onClose={jest.fn()}
        appId="app_1"
        sheetId="sheet_1"
        sheetName="Sales"
        accessToken="token"
        columns={[{ id: 'c1', name: 'Sales', label: 'Sales', type: 'number', isVisible: true } as any]}
        sheetData={[{ Sales: 10 }]}
        onApplyFormula={jest.fn().mockResolvedValue(true)}
        onCreateReviewComment={jest.fn().mockResolvedValue(true)}
        onOpenCheckpointDialog={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Generate Formula/i }))
    expect(mockGenerateFormula).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Apply Formula/i })).toBeNull()
  })
})
