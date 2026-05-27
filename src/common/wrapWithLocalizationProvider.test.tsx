import React from 'react'
import { render, screen } from '@testing-library/react'
import { wrapWithLocalizationProvider } from './wrapWithLocalizationProvider'

jest.mock('@newwork/nw-design-system', () => ({
  LocalizationProvider: ({ children }: React.PropsWithChildren<{ locale?: string }>) => (
    <div data-testid="localization-provider">{children}</div>
  )
}))

jest.mock('./utils/windowUtils', () => ({
  getCurrentActiveUserLocale: () => 'en-US'
}))

describe('wrapWithLocalizationProvider', () => {
  it('marks wrapped screens as not translatable by browser auto-translate', () => {
    const Screen = () => <div data-testid="screen">Screen</div>
    const WrappedScreen = wrapWithLocalizationProvider(Screen)

    render(<WrappedScreen accessToken="token" />)

    const guard = screen.getByTestId('screen').parentElement
    expect(guard).toHaveAttribute('translate', 'no')
    expect(guard).toHaveClass('notranslate')
  })
})
