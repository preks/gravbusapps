import React, { useState } from 'react'
import {
  PageLayout,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  Spinner,
  Badge,
  Separator
} from '@newwork/nw-design-system'
import { Play, Database } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { HttpMethod } from '@/common/network/rest/RestClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

interface DataSeederProps extends BusinessAppContextProps {}

const PREFIX = 'DataSeeder'

interface RequestResult {
  index?: number
  success: boolean
  status?: number
  data?: any
  error?: string
}

const DataSeeder: React.FC<DataSeederProps> = context => {
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<HttpMethod>(HttpMethod.POST)
  const [bodyJson, setBodyJson] = useState('{\n  "example": "value"\n}')
  const [mimicBulk, setMimicBulk] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState<RequestResult[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  const restClient = useRestClient()
  const dataTestId = (suffix: string) => formatDataTestId(PREFIX, suffix)

  const validateJson = (json: string): { valid: boolean; parsed?: any; error?: string } => {
    try {
      const parsed = JSON.parse(json)
      return { valid: true, parsed }
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
    }
  }

  const executeRequest = async (requestBody?: any, index?: number): Promise<RequestResult> => {
    try {
      const headers = {
        Authorization: `Bearer ${context.accessToken}`
      }

      let response: any

      switch (method) {
        case HttpMethod.GET:
          response = await restClient.get(url, { headers })
          break
        case HttpMethod.POST:
          response = await restClient.post(url, requestBody, { headers })
          break
        case HttpMethod.PUT:
          response = await restClient.put(url, requestBody, { headers })
          break
        case HttpMethod.PATCH:
          response = await restClient.patch(url, requestBody, { headers })
          break
        case HttpMethod.DELETE:
          response = await restClient.delete(url, { headers })
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }

      return {
        index,
        success: true,
        status: 200,
        data: response
      }
    } catch (error) {
      return {
        index,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const handleExecute = async () => {
    setValidationError(null)
    setResults([])

    if (!url.trim()) {
      setValidationError('URL is required')
      return
    }

    const bodyValidation = validateJson(bodyJson)
    if (!bodyValidation.valid && method !== HttpMethod.GET && method !== HttpMethod.DELETE) {
      setValidationError(`Invalid body JSON: ${bodyValidation.error}`)
      return
    }

    setIsExecuting(true)

    try {
      if (mimicBulk) {
        // Bulk mode: body should be an array
        if (!Array.isArray(bodyValidation.parsed)) {
          setValidationError('In bulk mode, body must be a JSON array')
          setIsExecuting(false)
          return
        }

        const bulkResults: RequestResult[] = []
        for (let i = 0; i < bodyValidation.parsed.length; i++) {
          const item = bodyValidation.parsed[i]
          const result = await executeRequest(item, i)
          bulkResults.push(result)
        }
        setResults(bulkResults)
      } else {
        // Single request mode
        const result = await executeRequest(bodyValidation.parsed)
        setResults([result])
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setIsExecuting(false)
    }
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return (
    <PageLayout
      headerPhosphorIcon={{
        icon: Database,
        variant: 'default',
        size: 'lg',
        label: 'Data Seeder'
      }}
      headerTitle="Data Seeder"
      headerDescription="Execute REST API calls for data seeding and testing"
      data-testid={dataTestId('Page')}
    >
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-4" data-testid={dataTestId('MainGrid')}>
        <Card data-testid={dataTestId('RequestCard')}>
          <CardHeader>
            <CardTitle>Request Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div>
                <Label htmlFor="url" data-testid={dataTestId('UrlLabel')}>
                  Endpoint URL
                </Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="e.g., /api/v1/resource"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  disabled={isExecuting}
                  data-testid={dataTestId('UrlInput')}
                />
              </div>

              <div>
                <Label htmlFor="method" data-testid={dataTestId('MethodLabel')}>
                  HTTP Method
                </Label>
                <Select value={method} onValueChange={value => setMethod(value as HttpMethod)} disabled={isExecuting}>
                  <SelectTrigger id="method" data-testid={dataTestId('MethodSelect')}>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent data-testid={dataTestId('MethodSelectContent')}>
                    <SelectItem value={HttpMethod.GET} data-testid={dataTestId('MethodOption-GET')}>
                      GET
                    </SelectItem>
                    <SelectItem value={HttpMethod.POST} data-testid={dataTestId('MethodOption-POST')}>
                      POST
                    </SelectItem>
                    <SelectItem value={HttpMethod.PUT} data-testid={dataTestId('MethodOption-PUT')}>
                      PUT
                    </SelectItem>
                    <SelectItem value={HttpMethod.PATCH} data-testid={dataTestId('MethodOption-PATCH')}>
                      PATCH
                    </SelectItem>
                    <SelectItem value={HttpMethod.DELETE} data-testid={dataTestId('MethodOption-DELETE')}>
                      DELETE
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="body" data-testid={dataTestId('BodyLabel')}>
                  Body (JSON)
                </Label>
                <textarea
                  id="body"
                  className="gba:w-full gba:min-h-[200px] gba:p-2 gba:border gba:rounded gba:font-mono gba:text-sm gba:bg-background gba:text-foreground"
                  value={bodyJson}
                  onChange={e => setBodyJson(e.target.value)}
                  disabled={isExecuting}
                  data-testid={dataTestId('BodyInput')}
                />
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <input
                  type="checkbox"
                  id="mimicBulk"
                  checked={mimicBulk}
                  onChange={e => setMimicBulk(e.target.checked)}
                  disabled={isExecuting}
                  data-testid={dataTestId('MimicBulkSwitch')}
                  className="gba:w-4 gba:h-4"
                />
                <Label htmlFor="mimicBulk" data-testid={dataTestId('MimicBulkLabel')}>
                  Mimic Bulk (Body must be an array, each item sent separately)
                </Label>
              </div>

              {validationError && (
                <Alert variant="destructive" data-testid={dataTestId('ValidationError')}>
                  {validationError}
                </Alert>
              )}

              <Button
                onClick={handleExecute}
                disabled={isExecuting}
                className="gba:w-full"
                data-testid={dataTestId('ExecuteButton')}
              >
                {isExecuting ? (
                  <>
                    <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                    Execute Request{mimicBulk ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid={dataTestId('ResponseCard')}>
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <CardTitle>Results</CardTitle>
              {results.length > 0 && (
                <div className="gba:flex gba:gap-2" data-testid={dataTestId('ResultsSummary')}>
                  {successCount > 0 && (
                    <Badge variant="success" data-testid={dataTestId('SuccessCount')}>
                      {successCount} Success
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive" data-testid={dataTestId('ErrorCount')}>
                      {errorCount} Failed
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground" data-testid={dataTestId('NoResults')}>
                No results yet. Configure and execute a request.
              </div>
            ) : (
              <div className="gba:space-y-4" data-testid={dataTestId('ResultsList')}>
                {results.map((result, idx) => (
                  <div key={idx} data-testid={dataTestId(`Result-${idx}`)}>
                    {mimicBulk && (
                      <div className="gba:font-semibold gba:mb-2" data-testid={dataTestId(`ResultIndex-${idx}`)}>
                        Request #{result.index !== undefined ? result.index + 1 : idx + 1}
                      </div>
                    )}
                    {result.success ? (
                      <div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                          <Badge variant="success" data-testid={dataTestId(`ResultStatus-${idx}`)}>
                            Success
                          </Badge>
                          {result.status && (
                            <span className="gba:text-sm gba:text-muted-foreground">Status: {result.status}</span>
                          )}
                        </div>
                        <pre
                          className="gba:bg-muted gba:p-3 gba:rounded gba:text-xs gba:overflow-auto gba:max-h-[400px]"
                          data-testid={dataTestId(`ResultData-${idx}`)}
                        >
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <Alert variant="destructive" data-testid={dataTestId(`ResultError-${idx}`)}>
                        <div className="gba:font-semibold">Error</div>
                        <div className="gba:text-sm gba:mt-1">{result.error}</div>
                      </Alert>
                    )}
                    {idx < results.length - 1 && <Separator className="gba:mt-4" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}

export default DataSeeder
