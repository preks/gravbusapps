/**
 * Company Record Component
 * Main record view for Company entities following the LeadRecord pattern
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Spinner,
  RecordLayout,
  Button,
  useTranslation,
  IconAvatar,
  Avatar,
  AvatarImage,
  AvatarFallback,
  HeaderSlot
} from '@newwork/nw-design-system'
import {
  BuildingsIcon,
  FileTextIcon,
  HouseIcon,
  UsersIcon,
  TreeStructureIcon,
  CurrencyDollarIcon,
  UserIcon
} from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCompany } from '@/common/data/orgchart/hooks/useCompany'
import { HomeView } from './views/home-view/HomeView'
import { DocumentView } from './views/document-view/DocumentView'
import { EmployeeView } from './views/employee-view/EmployeeView'
import { OrganizationalUnitView } from './views/organizational-unit-view/OrganizationalUnitView'
import type { CompanyRecordProps, CompanyRecordContentProps } from './types'
import translations from './_i18n'

const CompanyRecordContent: React.FC<CompanyRecordContentProps> = ({ companyId, onBack, ...props }) => {
  const { t } = useTranslation(translations)

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'overview'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'overview'
  })

  // Use Company hook for data fetching
  const { company, loading, error, refetch } = useCompany(props.accessToken, companyId, 'record')

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    window.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('tab')) {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState(null, '', url.toString())
    }
    const onPop = () => {
      const next = new URLSearchParams(window.location.search).get('tab') || 'overview'
      setActiveTab(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [activeTab])

  // Listen for process completion events to refresh company data
  useEffect(() => {
    const handleProcessCompletion = async (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          await refetch()
          return
        }
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.company) {
          await refetch()
        }
      } catch {
        // Error is already caught and handled
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [companyId, refetch])

  // Header detail groups
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'company-details',
        items: [
          {
            label: t('company-code'),
            value: company?.code || t('not-available'),
            icon: BuildingsIcon
          },
          {
            label: t('director'),
            value: company?.director
              ? company.director.displayName ||
                `${company.director.firstName || ''} ${company.director.lastName || ''}`.trim() ||
                t('not-available')
              : t('not-available'),
            icon: UserIcon
          },
          {
            label: t('currency'),
            value: company?.currency?.value || company?.currencyRef || t('not-available'),
            icon: CurrencyDollarIcon
          }
        ]
      }
    ],
    [company, t]
  )

  // Company name for header
  const companyName = company?.name || t('company-unnamed')

  // Helper function to get company avatar source
  const getCompanyAvatarSource = (): string | undefined => {
    if (company?.pictureThumbnail && typeof company.pictureThumbnail === 'string') {
      return `data:image/jpeg;base64,${company.pictureThumbnail}`
    }
    if (company?.picture && typeof company.picture === 'string') {
      return `data:image/jpeg;base64,${company.picture}`
    }
    return undefined
  }

  // Company avatar - use picture/thumbnail if available, otherwise icon
  const companyAvatar = useMemo(() => {
    const avatarSrc = getCompanyAvatarSource()

    if (avatarSrc) {
      return (
        <Avatar className="gba:w-16 gba:h-16">
          <AvatarImage src={avatarSrc} alt={companyName} />
          <AvatarFallback className="gba:text-xl gba:font-semibold">
            {companyName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )
    }

    return <IconAvatar icon={BuildingsIcon} variant="decorative" size="xl" />
  }, [company?.picture, company?.pictureThumbnail, companyName])

  // Sub views configuration (tabs)
  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: t('overview'),
          icon: <HouseIcon className="gba:mr-2" />,
          content: <HomeView companyId={companyId} company={company} {...props} />
        },
        {
          value: 'employees',
          label: t('employees'),
          icon: <UsersIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <EmployeeView companyId={companyId} {...props} />
            </div>
          )
        },
        {
          value: 'organization',
          label: t('organization'),
          icon: <TreeStructureIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <OrganizationalUnitView companyId={companyId} {...props} />
            </div>
          )
        },
        {
          value: 'documents',
          label: t('documents'),
          icon: <FileTextIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <DocumentView companyId={companyId} {...props} />
            </div>
          )
        }
      ]
    }),
    [activeTab, handleTabChange, companyId, company, props, t]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg gba:text-destructive">{error || t('company-not-found')}</p>
          <Button onClick={onBack} className="gba:mt-4" variant="default" data-testid="company-error-back-button">
            {t('back-to-companies')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RecordLayout
      data-testid="company-record"
      headerOrientation="horizontal"
      headerAvatar={companyAvatar}
      headerOverline={t('company-category')}
      onBack={onBack}
      headerTitle={companyName}
      headerSubtitle={company?.description}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

const CompanyRecord: React.FC<CompanyRecordProps> = props => {
  const { t } = useTranslation(translations)
  const companyId = props.companyId || new URLSearchParams(window.location.search).get('companyId')

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Use browser history back
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back()
      } else {
        // Fallback if no history available
        navigateTo(buildPlatformUrl('/platform/mdm/organizational-data', { view: 'companies' }))
      }
    }
  }

  if (!companyId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg gba:text-destructive" data-testid="company-no-id-message">
            {t('company-id-required')}
          </p>
          <Button onClick={handleBack} className="gba:mt-4" variant="default" data-testid="company-no-id-back-button">
            {t('back-to-companies')}
          </Button>
        </div>
      </div>
    )
  }

  return <CompanyRecordContent companyId={companyId} onBack={handleBack} {...props} />
}

export { CompanyRecord, CompanyRecordContent }

export default CompanyRecord
