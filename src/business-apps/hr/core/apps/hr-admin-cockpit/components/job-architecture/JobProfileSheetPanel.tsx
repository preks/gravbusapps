import { useMemo } from 'react'
import { CaretLeftIcon, CaretRightIcon, FileCodeIcon, PencilSimpleLineIcon } from '@phosphor-icons/react'
import {
  Badge,
  Button,
  ScrollArea,
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useTranslation
} from '@newwork/nw-design-system'
import JobProfileForm from '@/business-apps/mdm/forms/job-profile-form/JobProfileForm'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import {
  DetailPanelField as Field,
  DetailPanelSection as Section
} from '@/business-apps/hr/core/apps/shared/components/DetailPanelLayout'
import { useDataQualityContext } from '../../hooks/dataQualityHooks'
import { useJobReferenceData } from '../../hooks/useJobReferenceData'
import type { JobArchitectureListItem } from '../../types/dataQuality.types'
import { buildJobProfileFormSeed } from '../../utils/buildJobProfileFormSeed'
import translations from '../../_i18n'

const SHEET_Z_INDEX_STYLE = `
  [data-slot='sheet-overlay'] { z-index: 1000 !important; }
  [data-slot='sheet-content'] { z-index: 1001 !important; }
  [data-slot='popover-content'] { z-index: 1002 !important; }
`

function translateFallbackValue(value: string, t: (key: string) => string): string {
  return value.startsWith('unknown-') ? t(value) : value
}

interface JobProfileSheetPanelProps {
  readonly items: JobArchitectureListItem[]
  readonly currentIndex: number
  readonly onIndexChange: (idx: number) => void
  readonly onClose: () => void
  readonly accessToken: string
}

export function JobProfileSheetPanel({
  items,
  currentIndex,
  onIndexChange,
  onClose,
  accessToken
}: Readonly<JobProfileSheetPanelProps>) {
  const item = items[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < items.length - 1

  const { t } = useTranslation(translations)
  const { jobFunctions, jobFunctionsForForm, jobLevels } = useJobReferenceData(accessToken)
  const ctx = useDataQualityContext()

  const selectedJobProfile = useMemo(
    () => (item ? buildJobProfileFormSeed(item, { jobFunctions, jobLevels }) : undefined),
    [item, jobFunctions, jobLevels]
  )

  if (item == null) return null

  const profileKey = `${item.id}:${item.profileDetail?.version ?? 'no-version'}`
  const profileDetail = item.profileDetail
  const skills = profileDetail?.skills ?? []

  return (
    <Sheet
      open
      onOpenChange={open => {
        if (open) return
        onClose()
      }}
    >
      <style>{SHEET_Z_INDEX_STYLE}</style>
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
              <FileCodeIcon className="gba:h-5 gba:w-5 gba:shrink-0" />
              <SheetTitle className="gba:text-left gba:truncate">{t('profile-sheet-title')}</SheetTitle>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
              <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                {currentIndex + 1} / {items.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={hasPrev === false}
                onClick={() => onIndexChange(currentIndex - 1)}
              >
                <CaretLeftIcon className="gba:size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={hasNext === false}
                onClick={() => onIndexChange(currentIndex + 1)}
              >
                <CaretRightIcon className="gba:size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="gba:flex-1 gba:min-h-0">
          <div key={profileKey} className="gba:px-6 gba:py-4">
            <Section title={t('profile-section-basic')}>
              <Field label={t('profile-label-name')}>{item.name}</Field>
              <Field label={t('profile-label-code')}>
                {profileDetail?.code ? <Badge variant="info">{profileDetail.code}</Badge> : null}
              </Field>
              <Field label={t('profile-label-description')}>{profileDetail?.description}</Field>
              <Field label={t('profile-label-job-function')}>
                {profileDetail?.jobFunction ? (
                  <Badge variant="outline">
                    {profileDetail.jobFunction.name}{' '}
                    {profileDetail.jobFunction.code ? `(${profileDetail.jobFunction.code})` : ''}
                  </Badge>
                ) : null}
              </Field>
              <Field label={t('profile-label-job-level')}>
                {profileDetail?.jobLevel ? (
                  <Badge variant="outline">
                    {profileDetail.jobLevel.name}{' '}
                    {profileDetail.jobLevel.code ? `(${profileDetail.jobLevel.code})` : ''}
                    {profileDetail.jobLevel.hierarchyOrder == null
                      ? ''
                      : ` - ${t('profile-skill-level', { level: profileDetail.jobLevel.hierarchyOrder })}`}
                  </Badge>
                ) : null}
              </Field>
            </Section>

            <Section title={t('profile-section-skills')}>
              {skills.length > 0 ? (
                skills.map(skill => (
                  <Field
                    key={`${skill.name}:${skill.requiredLevel ?? 'none'}`}
                    label={translateFallbackValue(skill.name, t)}
                  >
                    {skill.requiredLevel == null ? (
                      <Badge variant="secondary">{t('profile-skill-level-unspecified')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('profile-skill-level', { level: skill.requiredLevel })}</Badge>
                    )}
                  </Field>
                ))
              ) : (
                <div className="gba:py-1.5 gba:text-sm gba:text-muted-foreground">{t('empty-no-items')}</div>
              )}
            </Section>
          </div>
        </ScrollArea>
        <SheetFooter className="gba:border-t gba:border-border gba:px-6 gba:py-3">
          <div className="gba:flex gba:justify-end gba:gap-2">
            <ErrorBoundary>
              <JobProfileForm
                key={profileKey}
                childAddButton={
                  <Button>
                    <PencilSimpleLineIcon /> {t('profile-btn-edit')}
                  </Button>
                }
                jobProfile={selectedJobProfile}
                prefixDataTestId="hr-admin-cockpit-ja"
                accessToken={accessToken}
                refetch={() => {
                  onClose()
                  ctx.refetch()
                }}
                isDrawerActive={true}
                jobFunctions={jobFunctionsForForm}
                jobLevels={jobLevels}
              />
            </ErrorBoundary>
            <SheetClose asChild>
              <Button variant="outline">{t('profile-btn-close')}</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
