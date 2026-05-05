import React from 'react'
import { render, screen } from '@testing-library/react'
import { GraphiQLPanel } from './GraphiQLPanel'

jest.mock('@/common/utils/serviceResolver', () => ({
  CUSTOM_FLOW_ENGINE_API_URL: 'http://flow-engine.test'
}))

jest.mock('@graphiql/plugin-explorer', () => ({
  explorerPlugin: () => ({})
}))

jest.mock('graphiql', () => ({
  GraphiQL: Object.assign(
    ({ defaultQuery }: { defaultQuery: string }) => <pre data-testid="default-query">{defaultQuery}</pre>,
    { Logo: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }
  )
}))

describe('GraphiQLPanel', () => {
  it('builds the default query with the TypeName root field', () => {
    render(<GraphiQLPanel accessToken="token-123" namespace="default" entityKey="asset_location" />)

    expect(screen.getByTestId('default-query')).toHaveTextContent('AssetLocation')
    expect(screen.getByTestId('default-query')).not.toHaveTextContent('AssetLocationList')
  })
})
