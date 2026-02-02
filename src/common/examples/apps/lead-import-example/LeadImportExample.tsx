import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { SparkleIcon, CheckCircleIcon, XCircleIcon, DownloadIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import {
  LeadImportAnalyzerService,
  FieldMapping,
  LeadImportAnalyzerResponse
} from './services/LeadImportAnalyzerService'

// Types
interface ParsedRow {
  [key: string]: string
}

interface ConvertedLead {
  [key: string]: string | boolean | null
}

interface CatalogLookupCache {
  [catalogIdentifier: string]: {
    [searchValue: string]: string | null
  }
}

type AgentResponse = LeadImportAnalyzerResponse

const LeadImportExample: React.FC<BusinessAppContextProps> = context => {
  // State
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>('')
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null)
  const [editedMappings, setEditedMappings] = useState<FieldMapping[]>([])
  const [convertedLeads, setConvertedLeads] = useState<ConvertedLead[]>([])
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const aiServiceRef = useRef<LeadImportAnalyzerService | null>(null)

  // Initialize AI service
  useEffect(() => {
    if (context.accessToken) {
      aiServiceRef.current = new LeadImportAnalyzerService(context.accessToken)
    }
  }, [context.accessToken])

  // Available target fields for mapping
  const targetFields = [
    { value: 'firstName', label: 'First Name', type: 'direct' },
    { value: 'lastName', label: 'Last Name', type: 'direct' },
    { value: 'email', label: 'Email', type: 'direct' },
    { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },
    { value: 'position', label: 'Position', type: 'direct' },
    { value: 'companyName', label: 'Company Name', type: 'direct' },
    { value: 'companyEmail', label: 'Company Email', type: 'direct' },
    { value: 'companyPhone', label: 'Company Phone', type: 'direct' },
    { value: 'companyWebsite', label: 'Company Website', type: 'direct' },
    { value: 'city', label: 'City', type: 'direct' },
    { value: 'postalCode', label: 'Postal Code', type: 'direct' },
    { value: 'description', label: 'Description', type: 'direct' },
    { value: 'countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },
    { value: 'regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'Region' },
    {
      value: 'numberOfEmployeesRef',
      label: 'Company Size (Catalog)',
      type: 'catalog',
      catalog: 'CompanySize'
    },
    { value: 'industryRef', label: 'Industry (Catalog)', type: 'catalog', catalog: 'IndustryClass' },
    { value: 'leadSourceRef', label: 'Lead Source (Catalog)', type: 'catalog', catalog: 'LeadSource' },
    { value: 'leadStatusRef', label: 'Lead Status (Catalog)', type: 'catalog', catalog: 'LeadStatus' },
    { value: 'leadRatingRef', label: 'Lead Rating (Catalog)', type: 'catalog', catalog: 'LeadRating' }
  ]

  // Catalog data state
  const [catalogData, setCatalogData] = useState<{
    country: CatalogEntry[]
    companySize: CatalogEntry[]
    industry: CatalogEntry[]
    leadSource: CatalogEntry[]
  }>({
    country: [],
    companySize: [],
    industry: [],
    leadSource: []
  })

  // Catalog hooks
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })

  // Load catalog data
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [country, companySize, industry, leadSource] = await Promise.all([
          fetchCatalogEntriesByIdentifier('Country'),
          fetchCatalogEntriesByIdentifier('CompanySize'),
          fetchCatalogEntriesByIdentifier('IndustryClass'),
          fetchCatalogEntriesByIdentifier('LeadSource')
        ])

        setCatalogData({
          country: country.entries,
          companySize: companySize.entries,
          industry: industry.entries,
          leadSource: leadSource.entries
        })
      } catch (err) {
        console.error('Failed to load catalogs:', err)
      }
    }

    loadCatalogs()
  }, [fetchCatalogEntriesByIdentifier])

  // File handling
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)

      // Read file content
      const reader = new FileReader()
      reader.onload = event => {
        const text = event.target?.result as string
        setCsvText(text)
      }
      reader.readAsText(selectedFile)
    }
  }, [])

  // Parse CSV manually
  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    // Parse header
    const headerLine = lines[0]
    const headers: string[] = []
    let currentField = ''
    let insideQuotes = false

    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i]

      if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        headers.push(currentField.trim().replace(/^"|"$/g, ''))
        currentField = ''
      } else {
        currentField += char
      }
    }
    headers.push(currentField.trim().replace(/^"|"$/g, ''))

    // Parse rows
    const rows: ParsedRow[] = []
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const values: string[] = []
      currentField = ''
      insideQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          insideQuotes = !insideQuotes
        } else if (char === ',' && !insideQuotes) {
          values.push(currentField.trim().replace(/^"|"$/g, ''))
          currentField = ''
        } else {
          currentField += char
        }
      }
      values.push(currentField.trim().replace(/^"|"$/g, ''))

      // Create row object
      const row: ParsedRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }

    return rows
  }, [])

  // Call AI Agent
  const analyzeWithAgent = useCallback(async () => {
    if (!file) {
      setError('Please upload a file first')
      return
    }

    if (!aiServiceRef.current) {
      setError('AI service not initialized')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Parse CSV to get data (for display)
      if (csvText) {
        const parsed = parseCSV(csvText)
        setParsedData(parsed)
      }

      // Call AI service with file
      const agentResult = await aiServiceRef.current.analyzeImport(file)

      setAgentResponse(agentResult)
      setEditedMappings(agentResult.fieldMappings)
      setStep('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [file, csvText, parseCSV])

  // Update mapping
  const updateMapping = useCallback((index: number, field: 'targetField' | 'transformationType', value: string) => {
    setEditedMappings(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // Update catalog identifier if switching to catalog type
      if (field === 'targetField') {
        const targetFieldInfo = targetFields.find(tf => tf.value === value)
        if (targetFieldInfo?.type === 'catalog') {
          updated[index].transformationType = 'catalog'
          updated[index].catalogIdentifier = targetFieldInfo.catalog
        } else {
          updated[index].transformationType = 'direct'
          delete updated[index].catalogIdentifier
        }
      }

      return updated
    })
  }, [])

  // Remove mapping
  const removeMapping = useCallback((index: number) => {
    setEditedMappings(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Add new mapping
  const addMapping = useCallback((sourceField: string) => {
    setEditedMappings(prev => [
      ...prev,
      {
        sourceField,
        targetField: 'firstName', // Default target
        transformationType: 'direct'
      }
    ])
  }, [])

  // Catalog lookup helper
  const lookupCatalogEntry = useCallback(
    (catalogIdentifier: string, searchValue: string): string | null => {
      if (!searchValue || searchValue.trim() === '') return null

      let entries: CatalogEntry[] = []

      switch (catalogIdentifier) {
        case 'Country':
          entries = catalogData.country
          break
        case 'CompanySize':
          entries = catalogData.companySize
          break
        case 'IndustryClass':
          entries = catalogData.industry
          break
        case 'LeadSource':
          entries = catalogData.leadSource
          break
        default:
          return null
      }

      if (entries.length === 0) return null

      const search = searchValue.toLowerCase().trim()

      // Exact match on code or value
      const exactMatch = entries.find(
        entry => entry.code?.toLowerCase() === search || entry.value.toLowerCase() === search
      )
      if (exactMatch) return exactMatch.id

      // Fuzzy match on value
      const fuzzyMatch = entries.find(entry => entry.value.toLowerCase().includes(search))
      if (fuzzyMatch) return fuzzyMatch.id

      return null
    },
    [catalogData]
  )

  // Convert data
  const convertData = useCallback(() => {
    if (parsedData.length === 0 || editedMappings.length === 0) {
      setError('No data or mappings available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const catalogCache: CatalogLookupCache = {}

      const converted: ConvertedLead[] = parsedData.map(row => {
        const lead: ConvertedLead = {}

        editedMappings.forEach(mapping => {
          const sourceValue = row[mapping.sourceField]

          if (mapping.transformationType === 'direct') {
            lead[mapping.targetField] = sourceValue || null
          } else if (mapping.transformationType === 'catalog' && mapping.catalogIdentifier) {
            // Use cache
            if (!catalogCache[mapping.catalogIdentifier]) {
              catalogCache[mapping.catalogIdentifier] = {}
            }

            if (sourceValue in catalogCache[mapping.catalogIdentifier]) {
              lead[mapping.targetField] = catalogCache[mapping.catalogIdentifier][sourceValue]
            } else {
              const catalogId = lookupCatalogEntry(mapping.catalogIdentifier, sourceValue)
              catalogCache[mapping.catalogIdentifier][sourceValue] = catalogId
              lead[mapping.targetField] = catalogId
            }
          }
        })

        return lead
      })

      setConvertedLeads(converted)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setIsLoading(false)
    }
  }, [parsedData, editedMappings, lookupCatalogEntry])

  // Download JSON
  const downloadJSON = useCallback(() => {
    const dataStr = JSON.stringify(convertedLeads, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'converted-leads.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [convertedLeads])

  // Reset
  const reset = useCallback(() => {
    setFile(null)
    setCsvText('')
    setParsedData([])
    setAgentResponse(null)
    setEditedMappings([])
    setConvertedLeads([])
    setStep('upload')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="gba:p-6 gba:max-w-7xl gba:mx-auto" data-testid="lead-import-example">
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <SparkleIcon className="gba:w-6 gba:h-6 gba:text-purple-600" weight="fill" />
          Lead Import with AI Mapping
        </h1>
        <p className="gba:text-gray-600 gba:mt-2">
          Upload a CSV file, let AI analyze and map the fields, then convert to CustomerLead format.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:mb-4">
          <XCircleIcon className="gba:w-4 gba:h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div>
                <Label htmlFor="file-upload">Select CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="gba:mt-2"
                />
              </div>

              {file && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
                  <CheckCircleIcon className="gba:w-4 gba:h-4 gba:text-green-600" weight="fill" />
                  File loaded: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              )}

              <Button onClick={analyzeWithAgent} disabled={!file || isLoading} className="gba:w-full">
                {isLoading ? (
                  <>
                    <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <SparkleIcon className="gba:w-4 gba:h-4 gba:mr-2" weight="fill" />
                    Analyze with AI Agent
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && agentResponse && (
        <div className="gba:space-y-4">
          <Card>
            <CardHeader>
              <div className="gba:flex gba:justify-between gba:items-center">
                <CardTitle>Step 2: Review and Edit Field Mappings</CardTitle>
                <Button variant="outline" size="sm" onClick={reset}>
                  Start Over
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-4">
                <div className="gba:text-sm gba:text-gray-600">
                  <p>
                    AI detected {agentResponse.sourceFields.length} fields and mapped {editedMappings.length} of them.
                  </p>
                  {agentResponse.unmappedSourceFields.length > 0 && (
                    <p className="gba:mt-1 gba:text-amber-600">
                      {agentResponse.unmappedSourceFields.length} fields remain unmapped
                    </p>
                  )}
                </div>

                {/* Mapped Fields */}
                <div>
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-2">Mapped Fields</h3>
                  <div className="gba:space-y-3">
                    {editedMappings.map((mapping, index) => (
                      <div
                        key={index}
                        className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg"
                      >
                        <div className="gba:flex-1">
                          <Label className="gba:text-xs gba:text-gray-500">Source Field</Label>
                          <div className="gba:font-medium gba:text-sm">{mapping.sourceField}</div>
                        </div>

                        <div className="gba:text-gray-400">→</div>

                        <div className="gba:flex-1">
                          <Label className="gba:text-xs gba:text-gray-500">Target Field</Label>
                          <Select
                            value={mapping.targetField}
                            onValueChange={value => updateMapping(index, 'targetField', value)}
                          >
                            <SelectTrigger className="gba:w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {targetFields.map(tf => (
                                <SelectItem key={tf.value} value={tf.value}>
                                  {tf.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="gba:w-20">
                          <Label className="gba:text-xs gba:text-gray-500">Type</Label>
                          <div className="gba:text-xs gba:font-medium gba:mt-1">
                            {mapping.transformationType === 'catalog' ? 'Catalog' : 'Direct'}
                          </div>
                        </div>

                        <Button variant="ghost" size="sm" onClick={() => removeMapping(index)}>
                          <XCircleIcon className="gba:w-4 gba:h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unmapped Fields */}
                {agentResponse.unmappedSourceFields.length > 0 && (
                  <div>
                    <h3 className="gba:text-sm gba:font-semibold gba:mb-2">Unmapped Fields</h3>
                    <div className="gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-lg gba:p-3">
                      <div className="gba:flex gba:flex-wrap gba:gap-2">
                        {agentResponse.unmappedSourceFields.map(field => (
                          <button
                            key={field}
                            onClick={() => addMapping(field)}
                            className="gba:px-3 gba:py-1 gba:text-xs gba:bg-white gba:border gba:border-gray-300 gba:rounded gba:hover:bg-gray-50 gba:transition-colors"
                          >
                            {field}
                          </button>
                        ))}
                      </div>
                      <p className="gba:text-xs gba:text-gray-600 gba:mt-2">Click a field to add it to the mappings</p>
                    </div>
                  </div>
                )}

                <Button onClick={convertData} disabled={isLoading} className="gba:w-full">
                  {isLoading ? (
                    <>
                      <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="gba:w-4 gba:h-4 gba:mr-2" weight="fill" />
                      Convert {parsedData.length} Leads
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <div className="gba:space-y-4">
          <Card>
            <CardHeader>
              <div className="gba:flex gba:justify-between gba:items-center">
                <CardTitle>Step 3: Conversion Result</CardTitle>
                <div className="gba:flex gba:gap-2">
                  <Button variant="outline" size="sm" onClick={downloadJSON}>
                    <DownloadIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                    Download JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={reset}>
                    Start Over
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-green-600">
                  <CheckCircleIcon className="gba:w-5 gba:h-5" weight="fill" />
                  Successfully converted {convertedLeads.length} leads
                </div>

                <div className="gba:bg-gray-50 gba:p-4 gba:rounded-lg gba:max-h-96 gba:overflow-auto">
                  <pre className="gba:text-xs gba:whitespace-pre-wrap">{JSON.stringify(convertedLeads, null, 2)}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export { LeadImportExample }
export default LeadImportExample
