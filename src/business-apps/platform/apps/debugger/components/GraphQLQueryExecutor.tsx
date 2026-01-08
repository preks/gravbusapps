import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Label, Alert, Spinner } from '@newwork/nw-design-system'
import { PlayIcon, CopyIcon } from '@phosphor-icons/react'
import { useGraphQLQuery } from '../hooks/useGraphQLQuery'
import { JsonViewer } from './JsonViewer'

interface GraphQLQueryExecutorProps {
  accessToken: string
}

export const GraphQLQueryExecutor: React.FC<GraphQLQueryExecutorProps> = ({ accessToken }) => {
  const { query, setQuery, result, error, isExecuting, execute } = useGraphQLQuery(accessToken)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GraphQL Query Executor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <textarea
            id="graphqlQuery"
            className="gba:w-full gba:min-h-[200px] gba:p-2 gba:border gba:rounded gba:font-mono gba:text-sm gba:bg-background gba:text-foreground"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter your GraphQL query here..."
            disabled={isExecuting}
          />
          <Button onClick={execute} disabled={isExecuting || !query.trim()}>
            {isExecuting ? (
              <>
                <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                Executing...
              </>
            ) : (
              <>
                <PlayIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                Execute Query
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <div className="gba:font-semibold">Error</div>
              <div className="gba:text-sm gba:mt-1">{error}</div>
            </Alert>
          )}

          {result && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <Label>Result</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <CopyIcon className="gba:w-4 gba:h-4 gba:mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <JsonViewer data={result} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
