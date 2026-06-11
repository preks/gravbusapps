import { useEffect, useMemo, useState } from 'react'
import { BriefcaseIcon, FileTextIcon, LightbulbIcon } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { JobArchitectureListItem } from '../../types/dataQuality.types'
import { useDataQualityContext } from '../../hooks/dataQualityHooks'
import type { JaDrawerKind } from '../../hooks/useDataQualityDashboardModel'
import { JobPositionSheetPanel } from './JobPositionSheetPanel'
import { JobProfileSheetPanel } from './JobProfileSheetPanel'
import translations from '../../_i18n'

interface EmptyDrawerSheetProps {
  readonly title: string
  readonly onClose: () => void
  readonly t: (key: string) => string
}

function EmptyDrawerSheet({ title, onClose, t }: Readonly<EmptyDrawerSheetProps>) {
  return (
    <Sheet
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left">{title}</SheetTitle>
        </SheetHeader>
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:p-6">
          <EmptyState type="no-data" compact title={t('empty-no-items')} description={t('empty-all-complete')} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function buildDrawerContent(args: {
  drawerKind: JaDrawerKind
  selectedProfileIdx: number | null
  activeDrawer: { title: string; items: JobArchitectureListItem[]; loading?: boolean } | null
  accessToken: string
  setSelectedProfileIdx: (idx: number) => void
  closeDrawer: () => void
  t: (key: string) => string
}): JSX.Element | null {
  const { drawerKind, selectedProfileIdx, activeDrawer, accessToken, setSelectedProfileIdx, closeDrawer, t } = args

  if (!drawerKind || selectedProfileIdx === null || !activeDrawer) {
    return null
  }

  if (drawerKind === 'profiles') {
    if (activeDrawer.items.length === 0) {
      return <EmptyDrawerSheet title={activeDrawer.title} onClose={closeDrawer} t={t} />
    }

    return (
      <JobPositionSheetPanel
        items={activeDrawer.items}
        currentIndex={selectedProfileIdx}
        onIndexChange={setSelectedProfileIdx}
        onClose={closeDrawer}
        accessToken={accessToken}
      />
    )
  }

  if (drawerKind === 'descriptions' || drawerKind === 'skills') {
    if (activeDrawer.items.length === 0) {
      return <EmptyDrawerSheet title={activeDrawer.title} onClose={closeDrawer} t={t} />
    }

    return (
      <JobProfileSheetPanel
        items={activeDrawer.items}
        currentIndex={selectedProfileIdx}
        onIndexChange={setSelectedProfileIdx}
        onClose={closeDrawer}
        accessToken={accessToken}
      />
    )
  }

  return null
}

interface JobArchitectureCardProps {
  readonly accessToken: string
  readonly drawerKind: JaDrawerKind
  readonly setDrawerKind: (kind: JaDrawerKind) => void
  readonly selectedProfileIdx: number | null
  readonly setSelectedProfileIdx: (idx: number | null) => void
}

interface ActiveDrawerState {
  readonly kind: Exclude<JaDrawerKind, null>
  readonly title: string
  readonly items: JobArchitectureListItem[]
  readonly loading?: boolean
}

export function JobArchitectureCard({
  accessToken,
  drawerKind,
  setDrawerKind,
  selectedProfileIdx,
  setSelectedProfileIdx
}: Readonly<JobArchitectureCardProps>) {
  const { t } = useTranslation(translations)
  const ctx = useDataQualityContext()
  const { jobArchitecture: ja, loading } = ctx
  const [activeDrawerSnapshot, setActiveDrawerSnapshot] = useState<ActiveDrawerState | null>(null)

  const jpPercent =
    ja.totalJobPositions > 0 ? Math.round((ja.jobPositionsWithProfile / ja.totalJobPositions) * 100) : 100
  const descPercent =
    ja.totalJobProfiles > 0 ? Math.round((ja.jobProfilesWithDescription / ja.totalJobProfiles) * 100) : 100
  const skillPercent =
    ja.totalJobProfiles > 0 ? Math.round((ja.jobProfilesWithSkills / ja.totalJobProfiles) * 100) : 100

  const drawerConfig = useMemo<
    Record<
      Exclude<JaDrawerKind, null>,
      { title: string; items: typeof ctx.jobPositionsMissingProfileList; loading?: boolean }
    >
  >(
    () => ({
      profiles: { title: t('ja-drawer-positions-title'), items: ctx.jobPositionsMissingProfileList },
      descriptions: {
        title: t('ja-drawer-descriptions-title'),
        items: ctx.jobProfilesMissingDescriptionList
      },
      skills: { title: t('ja-drawer-skills-title'), items: ctx.jobProfilesMissingSkillsList }
    }),
    [t, ctx.jobPositionsMissingProfileList, ctx.jobProfilesMissingDescriptionList, ctx.jobProfilesMissingSkillsList]
  )

  useEffect(() => {
    if (!drawerKind) {
      setActiveDrawerSnapshot(null)
      return
    }

    setActiveDrawerSnapshot(prev => {
      if (prev?.kind === drawerKind) return prev

      const nextDrawer = drawerConfig[drawerKind]
      return {
        kind: drawerKind,
        title: nextDrawer.title,
        items: nextDrawer.items,
        loading: nextDrawer.loading
      }
    })
  }, [drawerKind, drawerConfig])

  const activeDrawer = drawerKind
    ? activeDrawerSnapshot?.kind === drawerKind
      ? activeDrawerSnapshot
      : drawerConfig[drawerKind]
    : null
  const closeDrawer = () => {
    setActiveDrawerSnapshot(null)
    setDrawerKind(null)
    setSelectedProfileIdx(null)
  }
  const drawerContent = buildDrawerContent({
    drawerKind,
    selectedProfileIdx,
    activeDrawer,
    accessToken,
    setSelectedProfileIdx,
    closeDrawer,
    t
  })

  if (loading && !drawerKind) return <Spinner />

  return (
    <>
      <Card className="gba:h-full">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base gba:font-semibold">{t('section-job-architecture')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-5">
          <div className="gba:grid gba:grid-cols-4 gba:gap-2 gba:text-center">
            {[
              { label: t('ja-stat-positions'), value: ja.totalJobPositions, sub: t('ja-stat-sub-total') },
              {
                label: t('ja-stat-with-profiles'),
                value: ja.jobPositionsWithProfile,
                sub: `${jpPercent}% ${t('ja-stat-sub-of-positions')}`
              },
              {
                label: t('ja-stat-with-descriptions'),
                value: ja.jobProfilesWithDescription,
                sub: `${descPercent}% ${t('ja-stat-sub-of-profiles')}`
              },
              {
                label: t('ja-stat-with-skills'),
                value: ja.jobProfilesWithSkills,
                sub: `${skillPercent}% ${t('ja-stat-sub-of-profiles')}`
              }
            ].map(s => (
              <div key={s.label}>
                <p className="gba:text-2xl gba:font-bold gba:tabular-nums">{s.value}</p>
                <p className="gba:text-xs gba:text-muted-foreground">{s.sub}</p>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="gba:flex gba:justify-center gba:gap-6">
            {[
              {
                kind: 'profiles' as const,
                label: t('ja-missing-profiles'),
                value: ja.jobPositionsMissingProfile,
                icon: BriefcaseIcon
              },
              {
                kind: 'descriptions' as const,
                label: t('ja-missing-descriptions'),
                value: ja.jobProfilesMissingDescription,
                icon: FileTextIcon
              },
              {
                kind: 'skills' as const,
                label: t('ja-missing-skills'),
                value: ja.jobProfilesMissingSkills,
                icon: LightbulbIcon
              }
            ].map(g => (
              <button
                key={g.kind}
                type="button"
                onClick={() => {
                  if (g.value > 0) {
                    const nextDrawer = drawerConfig[g.kind]
                    setActiveDrawerSnapshot({
                      kind: g.kind,
                      title: nextDrawer.title,
                      items: nextDrawer.items,
                      loading: nextDrawer.loading
                    })
                    setSelectedProfileIdx(0)
                    setDrawerKind(g.kind)
                  }
                }}
                disabled={g.value === 0}
                className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:rounded-lg gba:p-2 gba:transition-colors hover:gba:bg-muted disabled:gba:opacity-50 disabled:gba:cursor-default gba:cursor-pointer"
              >
                <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-destructive/10">
                  <g.icon className="gba:size-5 gba:text-destructive" />
                </div>
                <span className="gba:text-lg gba:font-bold gba:tabular-nums gba:text-destructive">{g.value}</span>
                <span className="gba:text-xs gba:text-muted-foreground gba:text-center gba:whitespace-pre-line">
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      {drawerContent}
    </>
  )
}
