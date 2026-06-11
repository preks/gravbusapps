import React from 'react'
import { render, screen } from '@testing-library/react'
import { Learning } from '../Learning'

void React

const mockUseFeature = jest.fn()

jest.mock('@/common/hooks/useFeature', () => ({
  useFeature: (key: string) => mockUseFeature(key)
}))

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  PageLayout: ({ headerTitle, headerSubViews, headerContent, children }: any) => (
    <div>
      <h1>{headerTitle}</h1>
      <div>{headerContent}</div>
      <nav>
        {headerSubViews.items.map((item: any) => (
          <button key={item.value}>{item.label}</button>
        ))}
      </nav>
      {children}
    </div>
  ),
  Spinner: (props: any) => <div data-testid={props['data-testid'] || 'spinner'} />,
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('../components/CourseBuilderDialog', () => ({
  CourseBuilderDialog: () => <div data-testid="learning-builder-dialog" />
}))

jest.mock('../tabs/CourseLibraryTab', () => ({
  CourseLibraryTab: () => <div data-testid="course-library-tab" />
}))

const context = {
  accessToken: 'token',
  userInfo: { id: 'user-1' }
} as any

describe('Learning', () => {
  beforeEach(() => {
    mockUseFeature.mockReset()
    window.history.replaceState({}, '', '/learning')
  })

  it('renders nothing when the feature flag is disabled', () => {
    mockUseFeature.mockReturnValue(false)

    const { container } = render(<Learning {...context} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the page shell and all tabs when the feature flag is enabled', () => {
    mockUseFeature.mockReturnValue(true)

    render(<Learning {...context} />)

    expect(screen.getByTestId('learning-app')).toBeInTheDocument()
    expect(screen.getByText('learning-app-title')).toBeInTheDocument()
    expect(screen.getAllByText('learning-tab-dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('learning-tab-library')).toBeInTheDocument()
    expect(screen.getByText('learning-tab-assignments')).toBeInTheDocument()
    expect(screen.getByText('learning-tab-analytics')).toBeInTheDocument()
    expect(screen.getByText('learning-tab-audit')).toBeInTheDocument()
    expect(screen.getByTestId('create-course-button')).toBeInTheDocument()
  })
})
