import React, { useMemo } from 'react'
import { GraphiQL } from 'graphiql'
import { explorerPlugin } from '@graphiql/plugin-explorer'
import type { Fetcher } from '@graphiql/toolkit'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { toPascalCase } from '../utils/definitionFormUtils'

interface GraphiQLPanelProps {
  accessToken: string
  namespace: string
  entityKey?: string
  'data-testid'?: string
}

const explorer = explorerPlugin()

export const GraphiQLPanel: React.FC<GraphiQLPanelProps> = ({
  accessToken,
  namespace,
  entityKey,
  'data-testid': testId = 'graphiql-panel'
}) => {
  const fetcher: Fetcher = useMemo(
    () => async graphQLParams => {
      const url = `${CUSTOM_FLOW_ENGINE_API_URL}/custom-data/graphql`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-schema-namespace': namespace
        },
        body: JSON.stringify(graphQLParams)
      })
      return response.json()
    },
    [accessToken, namespace]
  )

  const defaultQuery = useMemo(() => {
    if (!entityKey) {
      return `# Click fields in the Explorer to build your query\n{\n  \n}`
    }
    const queryName = toPascalCase(entityKey) || 'Entity'
    return `{\n  ${queryName} {\n    id\n  }\n}`
  }, [entityKey])

  return (
    <div className="gba:h-full gba:w-full gba:overflow-hidden" data-testid={testId}>
      <GraphiQL
        fetcher={fetcher}
        defaultQuery={defaultQuery}
        plugins={[]}
        referencePlugin={explorer}
        visiblePlugin={explorer}
      >
        <GraphiQL.Logo> </GraphiQL.Logo>
      </GraphiQL>
    </div>
  )
}
