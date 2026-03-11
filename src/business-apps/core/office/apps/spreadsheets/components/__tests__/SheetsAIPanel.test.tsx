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
  const React = require('react')
  const TabsContext = React.createContext({ value: '', onValueChange: (_value: string) => {} })
  return {
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
  it('renders all four tabs and switches tab content', () => {
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

    expect(screen.getByRole('button', { name: 'Formula' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Chat' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    expect(screen.getByRole('button', { name: /Analyze Sheet/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    expect(screen.getByPlaceholderText(/Ask about your data/i)).toBeTruthy()
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
