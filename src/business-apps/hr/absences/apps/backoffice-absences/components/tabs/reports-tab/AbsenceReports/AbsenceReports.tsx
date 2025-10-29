import { Card, Spin, Alert } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { RiBarChartLine } from '@remixicon/react'
import { useState, useEffect } from 'react'
import { env } from '@/common/env/EnvUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface ResourceUrl {
  id: string
  url: string
  name: string
  name_i18n: Record<string, string>
  description?: string | null
  description_i18n?: Record<string, string>
  [key: string]: any
}
interface MenuItem {
  id: string
  name: string
  description?: string
  nameTranslated?: Record<string, string>
  descriptionTranslated?: Record<string, string>
  icon: string | null
  children?: MenuItem[]
  resourceUrl?: ResourceUrl
  [key: string]: any
}

interface Report {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: string
  favorite: boolean
  url: string
}

const getTranslatedValue = (
  translatedObject: Record<string, string> | undefined,
  fallback: string,
  currentLocale: string
): string => {
  if (!translatedObject) return fallback

  if (translatedObject[currentLocale]) {
    return translatedObject[currentLocale]
  }

  if (translatedObject['en-US']) {
    return translatedObject['en-US']
  }

  const firstTranslation = Object.values(translatedObject)[0]
  return firstTranslation || fallback
}

const transformMenuItemsToReports = (menuItems: MenuItem[], currentLocale: string): Report[] => {
  const reports: Report[] = []

  const processItems = (items: MenuItem[]) => {
    items.forEach(item => {
      if (item.resourceUrl?.url) {
        if (item.name === 'Absence Reports') {
          reports.push({
            id: item.id,
            title: getTranslatedValue(item.nameTranslated, item.name, currentLocale),
            description: getTranslatedValue(
              item.descriptionTranslated,
              item.description || 'No description available',
              currentLocale
            ),
            icon: <RiBarChartLine className="h-5 w-5" />,
            category: getTranslatedValue(item.resourceUrl.name_i18n, item.resourceUrl.name || 'Report', currentLocale),
            favorite: false,
            url: `${env('NEXT_PUBLIC_BASE_URL') || ''}${item.resourceUrl.url}`
          })
        }
      }

      if (item.children && item.children.length > 0) {
        processItems(item.children)
      }
    })
  }

  processItems(menuItems)
  return reports
}

export const AbsenceReports: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLocale, setCurrentLocale] = useState<string>(getCurrentActiveUserLocale() ?? 'en-US')

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!accessToken) {
        setError('No access token available')
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`${env('NEXT_PUBLIC_NAVIGATION_SERVICE_API')}/menuItems`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin'
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!data || !Array.isArray(data.menuItems)) {
          throw new Error('Invalid response format: menuItems array not found')
        }

        const reports = transformMenuItemsToReports(data.menuItems, currentLocale)
        setFilteredReports(reports)
      } catch (err) {
        console.error('Error fetching menu items:', err)
        setError(err instanceof Error ? err.message : 'Failed to load menu items. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchMenuItems()
  }, [accessToken, currentLocale])

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale() ?? 'en-US'
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()

    const interval = setInterval(checkLocale, 1000)

    return () => clearInterval(interval)
  }, [currentLocale])

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    )
  }

  if (filteredReports.length === 0) {
    return (
      <div className="gba:p-4">
        <Alert message="No Absence Reports found" type="info" showIcon />
      </div>
    )
  }

  const absenceReport = filteredReports[0]

  return (
    <div className="gba:w-full">
      <div className="gba:bg-card gba:rounded-lg gba:border">
        <div className="gba:p-4">
          <a
            href={absenceReport.url}
            onClick={e => {
              e.preventDefault()
              navigateTo(absenceReport.url)
            }}
            className="gba:block gba:hover:no-underline"
          >
            <Card
              className="gba:border-0 gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer"
              hoverable={false}
            >
              <div className="gba:p-4">
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:bg-muted gba:p-3 gba:rounded-lg">
                    <RiBarChartLine className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="gba:text-base gba:font-medium gba:text-foreground">{absenceReport.title}</h3>
                    {absenceReport.category && (
                      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{absenceReport.category}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </a>
        </div>
      </div>
    </div>
  )
}
