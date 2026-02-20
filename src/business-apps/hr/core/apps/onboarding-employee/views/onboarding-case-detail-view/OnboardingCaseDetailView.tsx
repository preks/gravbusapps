import React, { useMemo } from 'react'
import {
  Spinner,
  RecordLayout,
  IconAvatar,
  HeaderSlot,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useTranslation
} from '@newwork/nw-design-system'
import { ClipboardTextIcon, UserIcon, CalendarIcon, ClockIcon } from '@phosphor-icons/react'
import { useCases } from '../../hooks/useCases'
import { getStatusLabel } from '../onboarding-cases-view/utils/statusLabels'
import onboardingI18n from '../../_i18n'

export interface OnboardingCaseDetailViewProps {
  caseId: string
  onBack: () => void
  accessToken: string
}

const formatDate = (value: string | undefined) => (value ? new Date(value).toLocaleDateString(undefined) : '–')

export const OnboardingCaseDetailView: React.FC<OnboardingCaseDetailViewProps> = ({ caseId, onBack, accessToken }) => {
  const { t } = useTranslation(onboardingI18n)
  const { cases, loading, error } = useCases(accessToken)
  const caseData = useMemo(() => cases.find(c => c.caseId === caseId) ?? null, [cases, caseId])
  const headerDetailGroups = useMemo(() => {
    if (!caseData) return []
    const status = caseData.state?.metadata?.status
    const { label: statusLabel } = status ? getStatusLabel(status, t) : { label: '–' }
    return [
      {
        id: 'main',
        items: [
          {
            label: t('case-detail-label-status'),
            value: statusLabel,
            icon: ClipboardTextIcon
          },
          {
            label: t('case-detail-label-initiated'),
            value: caseData.initiator ?? '–',
            icon: UserIcon
          },
          {
            label: t('case-detail-label-created'),
            value: formatDate(caseData.createdAt),
            icon: CalendarIcon
          },
          {
            label: t('case-detail-label-updated'),
            value: formatDate(caseData.updatedAt),
            icon: ClockIcon
          }
        ]
      }
    ]
  }, [caseData, t])

  const title = caseData?.state?.metadata?.title ?? caseData?.title ?? caseData?.caseId ?? '–'
  const description = caseData?.state?.metadata?.description
  const workflowStatus = caseData?.workflowStatus
  const linkedFlows = caseData?.state?.linkedFlows ?? []

  if (loading && !caseData) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[50vh]"
        data-testid="onboarding-case-detail-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || (!loading && !caseData)) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[50vh] gba:gap-4"
        data-testid="onboarding-case-detail-error"
      >
        <div className="gba:text-lg gba:font-semibold gba:text-destructive">{error || t('case-detail-load-error')}</div>
        <button type="button" onClick={onBack} className="gba:text-sm gba:underline gba:text-primary">
          {t('case-detail-back-to-list')}
        </button>
      </div>
    )
  }

  return (
    <RecordLayout
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={ClipboardTextIcon} variant="decorative" size="xl" />}
      headerOverline={t('case-detail-overline')}
      onBack={onBack}
      headerTitle={title}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      views={[
        {
          value: 'overview',
          label: t('case-detail-tab-overview'),
          icon: <ClipboardTextIcon className="gba:w-5 gba:h-5" />,
          content: (
            <div className="gba:space-y-4 gba:p-4">
              {description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-base">{t('case-detail-description')}</CardTitle>
                  </CardHeader>
                  <CardContent className="gba:pt-0">
                    <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-pre-wrap">{description}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">{t('case-detail-section-summary')}</CardTitle>
                </CardHeader>
                <CardContent className="gba:pt-0 gba:space-y-2">
                  <div className="gba:flex gba:gap-2 gba:items-center">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                      {t('case-detail-workflow-status')}:
                    </span>
                    <span className="gba:text-sm">{workflowStatus ?? '–'}</span>
                  </div>
                  <div className="gba:flex gba:gap-2 gba:items-center">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                      {t('onboarding-employee-column-flows')}:
                    </span>
                    <span className="gba:text-sm">
                      {linkedFlows.filter(f => f.status === 'COMPLETED').length} / {linkedFlows.length}
                    </span>
                  </div>
                  <div className="gba:flex gba:gap-2 gba:items-center">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                      {t('case-detail-case-id')}:
                    </span>
                    <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">{caseData!.caseId}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }
      ]}
      defaultView="overview"
      onViewChange={() => {}}
    />
  )
}
