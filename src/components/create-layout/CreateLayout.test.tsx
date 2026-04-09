import { render, screen } from '@testing-library/react'
import { CreateLayout } from './CreateLayout'

jest.mock('@newwork/nw-design-system', () => {
  const React = jest.requireActual('react')

  return {
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    ResizableHandle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    ResizablePanel: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    TabSwitch: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    TabSwitchList: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    TabSwitchTrigger: ({ children, startIcon, ...props }: any) => (
      <button type="button" {...props}>
        {startIcon}
        {children}
      </button>
    ),
    ResizablePanelGroup: React.forwardRef(({ children, ...props }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ setLayout: jest.fn() }))
      return <div {...props}>{children}</div>
    })
  }
})

jest.mock('@/common/components/premium-hero-background', () => ({
  PremiumHeroBackground: (props: any) => <div {...props} />
}))

describe('CreateLayout', () => {
  it('renders overview pages without the split chat layout and keeps the hero extra area', () => {
    render(
      <CreateLayout
        heroVariant="overview"
        heroTitle="Overview title"
        heroSubtitle="Overview subtitle"
        heroExtra={<button type="button">Primary action</button>}
        views={[
          { value: 'overview', label: 'Overview' },
          { value: 'details', label: 'Details' }
        ]}
        currentView="overview"
        canvasPanel={<div data-testid="overview-content">Overview content</div>}
        testId="create-layout-test"
      />
    )

    expect(screen.getByTestId('create-layout-test-body')).toBeInTheDocument()
    expect(screen.getByTestId('create-layout-test-hero-extra')).toBeInTheDocument()
    expect(screen.getByTestId('create-layout-test-hero-footer')).toBeInTheDocument()
    expect(screen.getByTestId('create-layout-test-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('create-layout-test-tab-overview')).toBeInTheDocument()
    expect(screen.getByTestId('create-layout-test-tab-details')).toBeInTheDocument()
    expect(screen.getByText('Primary action')).toBeInTheDocument()
    expect(screen.getByTestId('overview-content')).toBeInTheDocument()
    expect(screen.queryByTestId('create-layout-test-layout')).not.toBeInTheDocument()
    expect(screen.queryByTestId('create-layout-test-chat-panel')).not.toBeInTheDocument()
  })
})
