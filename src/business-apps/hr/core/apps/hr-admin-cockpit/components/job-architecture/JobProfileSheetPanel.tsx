import { useMemo } from 'react'
import { CaretLeftIcon, CaretRightIcon, FileCodeIcon, InfoIcon, PencilSimpleLineIcon } from '@phosphor-icons/react'
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
import { VerticalTable, type VerticalTableProps } from '@/business-apps/mdm/apps/generic-components/table/VerticalTable'
import JobProfileForm from '@/business-apps/mdm/forms/job-profile-form/JobProfileForm'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
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

function buildProfileDrawerItems(
  item: JobArchitectureListItem,
  t: (key: string, vars?: Record<string, unknown>) => string
): VerticalTableProps[] {
  const d = item.profileDetail
  const translateFallbackValue = (value: string) => (value.startsWith('unknown-') ? t(value) : value)
  const items: VerticalTableProps[] = [
    {
      icon: <InfoIcon />,
      title: t('profile-section-basic'),
      verticalTable: true,
      items: [
        { label: t('profile-label-name'), value: item.name },
        { label: t('profile-label-code'), value: d?.code ? <Badge variant="info">{d.code}</Badge> : '-' },
        { label: t('profile-label-description'), value: d?.description || '-' },
        {
          label: t('profile-label-job-function'),
          value: d?.jobFunction ? (
            <Badge variant="outline">
              {d.jobFunction.name} {d.jobFunction.code ? `(${d.jobFunction.code})` : ''}
            </Badge>
          ) : (
            '-'
          )
        },
        {
          label: t('profile-label-job-level'),
          value: d?.jobLevel ? (
            <Badge variant="outline">
              {d.jobLevel.name} {d.jobLevel.code ? `(${d.jobLevel.code})` : ''}
              {d.jobLevel.hierarchyOrder == null
                ? ''
                : ` - ${t('profile-skill-level', { level: d.jobLevel.hierarchyOrder })}`}
            </Badge>
          ) : (
            '-'
          )
        }
      ]
    }
  ]

  const skills = d?.skills ?? []
  if (skills.length > 0) {
    items.push({
      icon: <InfoIcon />,
      title: t('profile-section-skills'),
      verticalTable: true,
      items: skills.map(s => ({
        label: translateFallbackValue(s.name),
        value:
          s.requiredLevel == null ? (
            <Badge variant="secondary">{t('profile-skill-level-unspecified')}</Badge>
          ) : (
            <Badge variant="outline">{t('profile-skill-level', { level: s.requiredLevel })}</Badge>
          )
      }))
    })
  }

  return items
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

  const drawerItems = useMemo(() => (item ? buildProfileDrawerItems(item, t) : []), [item, t])
  const selectedJobProfile = useMemo(
    () => (item ? buildJobProfileFormSeed(item, { jobFunctions, jobLevels }) : undefined),
    [item, jobFunctions, jobLevels]
  )

  if (item == null) return null

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
          <div className="gba:px-4 gba:pb-4 gba:space-y-6">
            {drawerItems.map(section => (
              <VerticalTable
                key={section.title}
                icon={section.icon}
                title={section.title}
                items={section.items}
                verticalTable={section.verticalTable}
              />
            ))}
          </div>
        </ScrollArea>
        <SheetFooter className="gba:border-t gba:border-border gba:px-6 gba:py-3">
          <div className="gba:flex gba:justify-end gba:gap-2">
            <ErrorBoundary>
              <JobProfileForm
                childAddButton={
                  <Button>
                    <PencilSimpleLineIcon /> {t('profile-btn-edit')}
                  </Button>
                }
                jobProfile={selectedJobProfile}
                prefixDataTestId="hr-admin-cockpit-ja"
                accessToken={accessToken}
                refetch={ctx.refetch}
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
