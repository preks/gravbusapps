import React from 'react'
import { render, screen } from '@testing-library/react'
import { EveryOneSection } from './EveryOneSection'
import { useFeature } from '@/common/hooks/useFeature'

function MockIcon({ children, ...props }: any) {
  return <svg {...props}>{children}</svg>
}

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))
jest.mock('@phosphor-icons/react', () => {
  return {
    ChatCircle: MockIcon,
    CalendarBlank: MockIcon,
    Bell: MockIcon,
    EnvelopeIcon: MockIcon,
    ArrowRight: MockIcon
  }
})

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: jest.fn(),
  buildPlatformUrl: jest.fn((path: string) => path)
}))

jest.mock('@/common/hooks/useFeature', () => ({
  useFeature: jest.fn()
}))

const mockUseFeature = useFeature as jest.MockedFunction<typeof useFeature>

describe('EveryOneSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the existing EveryOne cards when preview is enabled', () => {
    mockUseFeature.mockReturnValue(true)

    render(<EveryOneSection data-testid="customer-home-one" />)

    expect(screen.getByTestId('customer-home-one-chat')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-calendar')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-reminders')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-mail')).toBeInTheDocument()
  })

  it('hides the Mail card when preview is disabled', () => {
    mockUseFeature.mockReturnValue(false)

    render(<EveryOneSection data-testid="customer-home-one" />)

    expect(screen.getByTestId('customer-home-one-chat')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-calendar')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-reminders')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-home-one-mail')).not.toBeInTheDocument()
  })

  it('hides the Mail card when preview is unset', () => {
    mockUseFeature.mockReturnValue(undefined)

    render(<EveryOneSection data-testid="customer-home-one" />)

    expect(screen.getByTestId('customer-home-one-chat')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-calendar')).toBeInTheDocument()
    expect(screen.getByTestId('customer-home-one-reminders')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-home-one-mail')).not.toBeInTheDocument()
  })
})
