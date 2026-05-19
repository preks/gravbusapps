import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  HeaderSlot,
  IconAvatar,
  RecordLayout,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { BuildingsIcon, CurrencyDollarIcon, FileTextIcon, IdentificationCardIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentCompany } from '@/common/data/investment/hooks/useInvestmentCompany'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { DetailsView } from './views/details-view/DetailsView'
import { DocumentView } from './views/document-view/DocumentView'
import type { CompanyRecordContentProps, CompanyRecordProps } from './types'
import translations from './_i18n'

const ALLOWED_TABS = ['details', 'documents'] as const
type TabKey = (typeof ALLOWED_TABS)[number]

const isAllowedTab = (value?: string | null): value is TabKey => {
  return (ALLOWED_TABS as readonly string[]).includes(value || '')
}

const getCompanyAvatarSource = (pictureThumbnail?: string, picture?: unknown): string | undefined => {
  if (pictureThumbnail) return `data:image/jpeg;base64,${pictureThumbnail}`
  return typeof picture === 'string' ? `data:image/jpeg;base64,${picture}` : undefined
}

export const CompanyRecordContent: React.FC<CompanyRecordContentProps> = ({
  investmentCompanyId,
  onBack,
  ...props
}) => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (globalThis.window === undefined) return 'details'
    const tab = new URLSearchParams(globalThis.location.search).get('tab')
    return isAllowedTab(tab) ? tab : 'details'
  })

  const {
    company: investmentCompany,
    loading,
    error,
    refetch: refetchCompany
  } = useInvestmentCompany(props.accessToken, investmentCompanyId)

  useEffect(() => {
    if (globalThis.window === undefined) return

    const params = new URLSearchParams(globalThis.location.search)
    if (!params.get('tab')) {
      params.set('tab', activeTab)
      globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
    }
  }, [])

  useEffect(() => {
    if (globalThis.window === undefined) return

    const onPopState = () => {
      const tab = new URLSearchParams(globalThis.location.search).get('tab')
      setActiveTab(isAllowedTab(tab) ? tab : 'details')
    }

    globalThis.addEventListener('popstate', onPopState)
    return () => globalThis.removeEventListener('popstate', onPopState)
  }, [])

  const handleTabChange = useCallback((value: string) => {
    if (!isAllowedTab(value)) return

    setActiveTab(value)
    if (globalThis.window === undefined) return

    const params = new URLSearchParams(globalThis.location.search)
    params.set('tab', value)
    globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
  }, [])

  useProcessCompletion({
    onSuccess: refetchCompany
  })

  const investmentCompanyName = investmentCompany?.name || t('unnamed-company')

  const investmentCompanyAvatar = useMemo(() => {
    const avatarSrc = getCompanyAvatarSource(investmentCompany?.pictureThumbnail, investmentCompany?.picture)

    if (avatarSrc) {
      return (
        <Avatar className="gba:w-16 gba:h-16">
          <AvatarImage src={avatarSrc} alt={investmentCompanyName} />
          <AvatarFallback className="gba:text-xl gba:font-semibold">
            {investmentCompanyName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )
    }

    return <IconAvatar icon={BuildingsIcon} variant="decorative" size="xl" />
  }, [investmentCompany?.picture, investmentCompany?.pictureThumbnail, investmentCompanyName])

  const headerActions = useMemo(
    () => (
      <AppAction
        data-testid="investment-company-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.investmentCompanyEntity,
            contextData: { investmentCompanyId }
          }
        ]}
        shareContext={{
          entityType: 'investment-company',
          entityId: investmentCompanyId,
          entityName: investmentCompanyName,
          entityUrl: `/platform/irm/company-record?investmentCompanyId=${investmentCompanyId}`
        }}
        prefixDataTestId="investment-company-record-action"
        accessToken={props.accessToken}
      />
    ),
    [investmentCompanyId, investmentCompanyName, props.accessToken]
  )

  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'investment-company-details',
        items: [
          {
            label: t('code-label'),
            value: investmentCompany?.code || t('not-set'),
            icon: BuildingsIcon
          },
          {
            label: t('currency-label'),
            value:
              investmentCompany?.currency?.value ||
              investmentCompany?.currency?.code ||
              investmentCompany?.currencyRef ||
              t('not-set'),
            icon: CurrencyDollarIcon
          },
          {
            label: t('registration-number-label'),
            value: investmentCompany?.commercialRegistrationNumber || t('not-set'),
            icon: IdentificationCardIcon
          }
        ]
      }
    ],
    [
      investmentCompany?.code,
      investmentCompany?.commercialRegistrationNumber,
      investmentCompany?.currency,
      investmentCompany?.currencyRef,
      t
    ]
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'details',
          label: t('details-tab'),
          icon: <BuildingsIcon className="gba:mr-2" />,
          content: investmentCompany ? <DetailsView investmentCompany={investmentCompany} {...props} /> : null
        },
        {
          value: 'documents',
          label: t('documents-tab'),
          icon: <FileTextIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <DocumentView investmentCompanyId={investmentCompanyId} context={props} />
            </div>
          )
        }
      ]
    }),
    [activeTab, handleTabChange, investmentCompany, investmentCompanyId, props, t]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !investmentCompany) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg gba:text-destructive" data-testid="investment-company-error-message">
            {error || t('not-found')}
          </p>
          <Button
            onClick={onBack}
            className="gba:mt-4"
            variant="default"
            data-testid="investment-company-error-back-button"
          >
            {t('back-to-companies')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <RecordLayout
      data-testid="investment-company-record"
      headerOrientation="horizontal"
      headerAvatar={investmentCompanyAvatar}
      headerOverline={t('record-overline')}
      onBack={onBack}
      headerTitle={investmentCompanyName}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActions={headerActions}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

const CompanyRecord: React.FC<CompanyRecordProps> = props => {
  const { t } = useTranslation(translations)
  const investmentCompanyId = useMemo(() => {
    if (props.investmentCompanyId) return props.investmentCompanyId
    if (globalThis.window === undefined) return undefined
    return new URLSearchParams(globalThis.location.search).get('investmentCompanyId') || undefined
  }, [props.investmentCompanyId])

  const handleBack = useCallback(() => {
    if (props.onBack) {
      props.onBack()
      return
    }

    navigateTo(buildPlatformUrl('/platform/irm/company-management'))
  }, [props])

  if (!investmentCompanyId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg gba:text-destructive" data-testid="investment-company-no-id-message">
            {t('id-required')}
          </p>
          <Button
            onClick={handleBack}
            className="gba:mt-4"
            variant="default"
            data-testid="investment-company-no-id-back-button"
          >
            {t('back-to-companies')}
          </Button>
        </div>
      </div>
    )
  }

  return <CompanyRecordContent investmentCompanyId={investmentCompanyId} onBack={handleBack} {...props} />
}

export default CompanyRecord
