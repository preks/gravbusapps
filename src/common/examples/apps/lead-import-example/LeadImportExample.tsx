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

// Lead table fields sourced from GraphQL schema introspection of both:
//   CRM:  nw_crm.lead          (Lead entity)
//   IRM:  nw_investment_relations.investment_lead  (InvestmentLead entity)
//
// Fields marked "(CRM)" exist only on the CRM Lead table.
// Fields marked "(IRM)" exist only on the IRM InvestmentLead table.
// Unmarked fields exist in both tables under the same field name.
const LEAD_TARGET_FIELDS = [
  // ── Personal (shared) ────────────────────────────────────────────────────
  { value: 'firstName', label: 'First Name', type: 'direct' },
  { value: 'lastName', label: 'Last Name', type: 'direct' },
  { value: 'email', label: 'Email', type: 'direct' },
  { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },
  { value: 'position', label: 'Position', type: 'direct' },
  { value: 'academicTitleRef', label: 'Academic Title', type: 'catalog', catalog: 'AcademicTitle' },
  { value: 'salutationRef', label: 'Salutation', type: 'catalog', catalog: 'Salutation' },

  // ── Company (shared) ─────────────────────────────────────────────────────
  { value: 'companyName', label: 'Company Name', type: 'direct' },
  { value: 'companyEmail', label: 'Company Email', type: 'direct' },
  { value: 'companyPhone', label: 'Company Phone', type: 'direct' },
  { value: 'companyWebsite', label: 'Company Website', type: 'direct' },
  { value: 'legalFormRef', label: 'Legal Form', type: 'catalog', catalog: 'LegalForm' },
  // CRM: numberOfEmployees / IRM: companySize — different field names
  { value: 'numberOfEmployeesRef', label: 'Company Size (CRM)', type: 'catalog', catalog: 'CompanySize' },
  { value: 'companySizeRef', label: 'Company Size (IRM)', type: 'catalog', catalog: 'CompanySize' },
  // CRM: annualRevenue / IRM: accountAnnualRevenueBand
  { value: 'annualRevenueRef', label: 'Annual Revenue (CRM)', type: 'catalog', catalog: 'AnnualRevenue' },
  {
    value: 'accountAnnualRevenueBandRef',
    label: 'Annual Revenue Band (IRM)',
    type: 'catalog',
    catalog: 'AccountAnnualRevenueBand'
  },
  // CRM: industry / IRM: industryClass
  { value: 'industryRef', label: 'Industry (CRM)', type: 'catalog', catalog: 'IndustryClass' },
  { value: 'industryClassRef', label: 'Industry (IRM)', type: 'catalog', catalog: 'IndustryClass' },

  // ── Address ───────────────────────────────────────────────────────────────
  { value: 'city', label: 'City (CRM)', type: 'direct' }, // CRM field name
  { value: 'locality', label: 'Locality (IRM)', type: 'direct' }, // IRM field name
  { value: 'postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'addressLine', label: 'Address Line', type: 'direct' },
  { value: 'countryRef', label: 'Country', type: 'catalog', catalog: 'Country' },
  { value: 'regionRef', label: 'Region', type: 'catalog', catalog: 'Region' },

  // ── Lead Info (shared) ────────────────────────────────────────────────────
  { value: 'code', label: 'Code', type: 'direct' },
  { value: 'description', label: 'Description', type: 'direct' },
  { value: 'leadRatingRef', label: 'Lead Rating', type: 'catalog', catalog: 'LeadRating' },
  { value: 'sensitive', label: 'Sensitive', type: 'direct' },
  { value: 'sourceCompanyName', label: 'Source Company Name', type: 'direct' },
  { value: 'sourceIndividualName', label: 'Source Individual Name', type: 'direct' },
  { value: 'leadSourceType', label: 'Lead Source Type', type: 'direct' },
  { value: 'conversionDate', label: 'Conversion Date', type: 'direct' },
  { value: 'timeZoneRef', label: 'Time Zone', type: 'catalog', catalog: 'TimeZone' },
  // Both CRM and IRM have leadSourceRef and leadStatusRef
  { value: 'leadSourceRef', label: 'Lead Source', type: 'catalog', catalog: 'LeadSource' },
  { value: 'leadStatusRef', label: 'Lead Status', type: 'catalog', catalog: 'LeadStatus' },
  // CRM additionally has source/sourceRef and status/statusRef as separate catalog fields
  { value: 'sourceRef', label: 'Source (CRM)', type: 'catalog', catalog: 'LeadSource' },
  { value: 'statusRef', label: 'Status (CRM)', type: 'catalog', catalog: 'LeadStatus' },

  // ── CRM-only fields ───────────────────────────────────────────────────────
  { value: 'name', label: 'Lead Name (CRM)', type: 'direct' },
  { value: 'rating', label: 'Rating - raw text (CRM)', type: 'direct' },
  { value: 'salesCampaignId', label: 'Sales Campaign (CRM)', type: 'direct' },

  // ── IRM Investment-specific fields ────────────────────────────────────────
  { value: 'investmentName', label: 'Investment Name (IRM)', type: 'direct' },
  { value: 'investmentGroupRef', label: 'Investment Group (IRM)', type: 'catalog', catalog: 'InvestmentGroup' },
  { value: 'investmentTypeRef', label: 'Investment Type (IRM)', type: 'catalog', catalog: 'InvestmentType' },
  { value: 'investmentRoleRef', label: 'Investment Role (IRM)', type: 'catalog', catalog: 'InvestmentRole' },
  {
    value: 'investmentStakeTypeRef',
    label: 'Investment Stake Type (IRM)',
    type: 'catalog',
    catalog: 'InvestmentStakeType'
  },
  { value: 'stakePercentage', label: 'Stake Percentage (IRM)', type: 'direct' },
  { value: 'marketValue', label: 'Market Value (IRM)', type: 'direct' },
  { value: 'initialInvestmentAmount', label: 'Initial Investment Amount (IRM)', type: 'direct' },
  { value: 'loanAmount', label: 'Loan Amount (IRM)', type: 'direct' },
  { value: 'loanInterestRate', label: 'Loan Interest Rate (IRM)', type: 'direct' },
  { value: 'requiredCapitalAmount', label: 'Required Capital Amount (IRM)', type: 'direct' },
  { value: 'forecastedProfitAmount', label: 'Forecasted Profit Amount (IRM)', type: 'direct' },
  { value: 'annualNetColdRent', label: 'Annual Net Cold Rent (IRM)', type: 'direct' },
  { value: 'buildingYear', label: 'Building Year (IRM)', type: 'direct' },
  { value: 'size', label: 'Size (IRM)', type: 'direct' },
  {
    value: 'sizeMeasurementUnitRef',
    label: 'Size Measurement Unit (IRM)',
    type: 'catalog',
    catalog: 'SizeMeasurementUnit'
  }
] as const

const LeadImportExample: React.FC<BusinessAppContextProps> = context => {
  // State
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>('')
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null)
  const [editedMappings, setEditedMappings] = useState<FieldMapping[]>([])
  const [unmappedSourceFields, setUnmappedSourceFields] = useState<string[]>([])
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
      setUnmappedSourceFields(agentResult.unmappedSourceFields ?? [])
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

      if (field === 'targetField') {
        const targetFieldInfo = LEAD_TARGET_FIELDS.find(tf => tf.value === value)
        if (targetFieldInfo?.type === 'catalog') {
          updated[index].transformationType = 'catalog'
          updated[index].catalogIdentifier = (targetFieldInfo as any).catalog
        } else {
          updated[index].transformationType = 'direct'
          delete updated[index].catalogIdentifier
        }
      }

      return updated
    })
  }, [])

  // Remove mapping — source field moves to unmapped list, target field becomes available again
  const removeMapping = useCallback((index: number) => {
    setEditedMappings(prev => {
      const removedSourceField = prev[index]?.sourceField
      if (removedSourceField) {
        setUnmappedSourceFields(current => [...current, removedSourceField])
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // Re-add an unmapped source field as a new mapping row with no target selected
  const remapSourceField = useCallback((sourceField: string) => {
    setUnmappedSourceFields(prev => prev.filter(f => f !== sourceField))
    setEditedMappings(prev => [...prev, { sourceField, targetField: '', transformationType: 'direct' }])
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
        entry => entry.code?.toLowerCase() === search || entry.value?.toLowerCase() === search
      )
      if (exactMatch) return exactMatch.id

      // Fuzzy match on value
      const fuzzyMatch = entries.find(entry => entry.value?.toLowerCase().includes(search))
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
    setUnmappedSourceFields([])
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
                <div className="gba:text-sm gba:text-muted-foreground">
                  <p>
                    AI detected {agentResponse.sourceFields.length} source fields and mapped {editedMappings.length} of
                    them to lead table fields.
                  </p>
                </div>

                {/* Mapped Fields */}
                <div>
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-2">Mapped Fields</h3>
                  <div className="gba:space-y-3">
                    {editedMappings.map((mapping, index) => {
                      const usedByOtherRows = new Set(
                        editedMappings.filter((_, i) => i !== index).map(m => m.targetField)
                      )
                      const availableFields = LEAD_TARGET_FIELDS.filter(
                        tf => !usedByOtherRows.has(tf.value) || tf.value === mapping.targetField
                      )
                      return (
                        <div
                          key={index}
                          className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg"
                        >
                          <div className="gba:flex-1">
                            <Label className="gba:text-xs gba:text-muted-foreground">Source Field</Label>
                            <div className="gba:font-medium gba:text-sm">{mapping.sourceField}</div>
                          </div>

                          <div className="gba:text-muted-foreground">→</div>

                          <div className="gba:flex-1">
                            <Label className="gba:text-xs gba:text-muted-foreground">Target Field</Label>
                            <Select
                              value={mapping.targetField}
                              onValueChange={value => updateMapping(index, 'targetField', value)}
                            >
                              <SelectTrigger className="gba:w-full">
                                <SelectValue placeholder="Select a field..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map(tf => (
                                  <SelectItem key={tf.value} value={tf.value}>
                                    {tf.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="gba:w-20">
                            <Label className="gba:text-xs gba:text-muted-foreground">Type</Label>
                            <div className="gba:text-xs gba:font-medium gba:mt-1">
                              {mapping.transformationType === 'catalog' ? 'Catalog' : 'Direct'}
                            </div>
                          </div>

                          <Button variant="ghost" size="sm" onClick={() => removeMapping(index)}>
                            <XCircleIcon className="gba:w-4 gba:h-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Unmapped Source Fields */}
                {unmappedSourceFields.length > 0 && (
                  <div>
                    <h3 className="gba:text-sm gba:font-semibold gba:mb-2">Unmapped Source Fields</h3>
                    <div className="gba:space-y-2">
                      {unmappedSourceFields.map(sourceField => (
                        <div
                          key={sourceField}
                          className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:border-dashed"
                        >
                          <span className="gba:text-sm gba:text-muted-foreground">{sourceField}</span>
                          <Button variant="outline" size="sm" onClick={() => remapSourceField(sourceField)}>
                            Map Field
                          </Button>
                        </div>
                      ))}
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
