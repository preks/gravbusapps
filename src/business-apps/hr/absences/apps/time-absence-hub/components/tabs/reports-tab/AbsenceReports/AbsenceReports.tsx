import { Alert, AlertDescription, AlertTitle, Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ChartBarIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface MenuResource {
  url?: string
  name?: string
  name_i18n?: Record<string, string>
}

interface MenuNode {
  id: string
  name: string
  nameTranslated?: Record<string, string>
  children?: MenuNode[]
  resourceUrl?: MenuResource
}

interface LegacyAbsenceReport {
  id: string
  title: string
  category: string
  url: string
}

const DEFAULT_LOCALE = 'en-US'
const ABSENCE_REPORT_MENU_NAME = 'Absence Reports'
const LOCALE_POLL_INTERVAL_MS = 1000

const getLocalizedText = (
  translations: Record<string, string> | undefined,
  fallback: string,
  locale: string
): string => {
  if (!translations) {
    return fallback
  }

  if (translations[locale]) {
    return translations[locale]
  }

  if (translations[DEFAULT_LOCALE]) {
    return translations[DEFAULT_LOCALE]
  }

  const firstAvailable = Object.values(translations)[0]
  return firstAvailable || fallback
}

const getActiveLocale = (): string => getCurrentActiveUserLocale() ?? DEFAULT_LOCALE

const findAbsenceReportMenuItem = (menuItems: MenuNode[], locale: string): LegacyAbsenceReport | null => {
  const queue: MenuNode[] = [...menuItems]

  while (queue.length > 0) {
    const currentNode = queue.shift()

    if (!currentNode) {
      continue
    }

    if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
      queue.push(...currentNode.children)
    }

    if (currentNode.name !== ABSENCE_REPORT_MENU_NAME) {
      continue
    }

    const reportPath = currentNode.resourceUrl?.url
    if (!reportPath) {
      continue
    }

    return {
      id: currentNode.id,
      title: getLocalizedText(currentNode.nameTranslated, currentNode.name, locale),
      category: getLocalizedText(currentNode.resourceUrl?.name_i18n, currentNode.resourceUrl?.name ?? 'Report', locale),
      url: `${env('NEXT_PUBLIC_BASE_URL') || ''}${reportPath}`
    }
  }

  return null
}

interface MenuItemsResponse {
  menuItems?: MenuNode[]
}

interface ReportFetchResult {
  report: LegacyAbsenceReport | null
  isPermissionError: boolean
}

const fetchLegacyAbsenceReport = async (accessToken: string, locale: string): Promise<ReportFetchResult> => {
  const response = await fetch(`${env('NEXT_PUBLIC_NAVIGATION_SERVICE_API')}/menuItems`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  })

  if (response.status === 403) {
    return { report: null, isPermissionError: true }
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = (await response.json()) as MenuItemsResponse
  if (!Array.isArray(responseData.menuItems)) {
    throw new Error('Invalid response format: menuItems array not found')
  }

  return {
    report: findAbsenceReportMenuItem(responseData.menuItems, locale),
    isPermissionError: false
  }
}

interface ReportCardProps {
  report: LegacyAbsenceReport
}

const ReportCard: React.FC<ReportCardProps> = ({ report }) => (
  <div className="gba:w-full">
    <div className="gba:bg-card gba:rounded-lg gba:border">
      <div className="gba:p-4">
        <a
          href={report.url}
          onClick={event => {
            event.preventDefault()
            navigateTo(report.url)
          }}
          className="gba:block gba:hover:no-underline"
        >
          <Card className="gba:border-0 gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer">
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:bg-muted gba:p-3 gba:rounded-lg">
                  <ChartBarIcon size={24} className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
                </div>
                <div>
                  <h3 className="gba:text-base gba:font-medium gba:text-foreground">{report.title}</h3>
                  {report.category && (
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{report.category}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>
    </div>
  </div>
)

export const AbsenceReports: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [locale, setLocale] = useState<string>(getActiveLocale)
  const [report, setReport] = useState<LegacyAbsenceReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPermissionError, setIsPermissionError] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      setErrorMessage('No access token available')
      setReport(null)
      return
    }

    const loadReport = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      setIsPermissionError(false)

      try {
        const result = await fetchLegacyAbsenceReport(accessToken, locale)
        setReport(result.report)
        setIsPermissionError(result.isPermissionError)

        if (result.isPermissionError) {
          setErrorMessage('Legacy absence reports are not available for your current permissions.')
        }
      } catch (error) {
        console.error('Error fetching menu items:', error)
        setReport(null)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load menu items. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadReport()
  }, [accessToken, locale])

  useEffect(() => {
    const localeInterval = setInterval(() => {
      const nextLocale = getActiveLocale()
      setLocale(previousLocale => (previousLocale === nextLocale ? previousLocale : nextLocale))
    }, LOCALE_POLL_INTERVAL_MS)

    return () => clearInterval(localeInterval)
  }, [])

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="gba:p-4">
        <Alert variant={isPermissionError ? 'default' : 'destructive'}>
          <AlertTitle>{isPermissionError ? 'Legacy reports unavailable' : 'Error'}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="gba:p-4">
        <Alert>
          <AlertTitle>No Absence Reports found</AlertTitle>
        </Alert>
      </div>
    )
  }

  return <ReportCard report={report} />
}
