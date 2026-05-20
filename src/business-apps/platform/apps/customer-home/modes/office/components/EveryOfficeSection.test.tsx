import React from 'react'
import { render, screen } from '@testing-library/react'
import { EveryOfficeSection } from './EveryOfficeSection'
import { useFeature } from '@/common/hooks/useFeature'

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: jest.fn(),
  buildPlatformUrl: jest.fn((path: string) => path)
}))

jest.mock('@/common/hooks/useFeature', () => ({
  useFeature: jest.fn()
}))

const mockUseFeature = useFeature as jest.MockedFunction<typeof useFeature>

describe('EveryOfficeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Whiteboards and Nexus when preview is explicitly enabled', () => {
    mockUseFeature.mockReturnValue(true)

    render(<EveryOfficeSection data-testid="customer-home-office" />)

    expect(screen.getByTestId('customer-home-office-whiteboards')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-office-nexus')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-office-documents')).toBeInTheDocument()
  })

  it('hides Whiteboards and Nexus when preview is disabled', () => {
    mockUseFeature.mockReturnValue(false)

    render(<EveryOfficeSection data-testid="customer-home-office" />)

    expect(screen.queryByTestId('customer-home-office-whiteboards')).not.toBeInTheDocument()
    expect(screen.queryByTestId('customer-home-office-nexus')).not.toBeInTheDocument()
    expect(screen.getByTestId('customer-home-office-documents')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-office-notes')).toBeInTheDocument()
  })

  it('hides Whiteboards and Nexus when preview is unset', () => {
    mockUseFeature.mockReturnValue(undefined)

    render(<EveryOfficeSection data-testid="customer-home-office" />)

    expect(screen.queryByTestId('customer-home-office-whiteboards')).not.toBeInTheDocument()
    expect(screen.queryByTestId('customer-home-office-nexus')).not.toBeInTheDocument()
    expect(screen.getByTestId('customer-home-office-documents')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-office-drive')).toBeInTheDocument()
  })
})
