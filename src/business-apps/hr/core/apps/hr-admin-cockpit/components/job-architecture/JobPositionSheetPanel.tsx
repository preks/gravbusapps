import { useCallback, useMemo, useState } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Button, ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { JobPositionDetails } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/components/JobPositionDetails'
import type { JobPosition as HrJobPosition } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/hooks/useJobPositionListData'
import { mapJobPositionListRowToFormJobPosition } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/utils/mapJobPositionListRowToFormJobPosition'
import useJobPositions from '@/business-apps/hr/core/forms/job-position/hooks/useJobPositions'
import JobPositionForm from '@/business-apps/hr/core/forms/job-position/JobPositionForm'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDataQualityContext } from '../../hooks/dataQualityHooks'
import type { JobArchitectureListItem, RawPositionForDetail } from '../../types/dataQuality.types'

const SHEET_Z_INDEX_STYLE = `
  [data-slot='sheet-overlay'] { z-index: 1000 !important; }
  [data-slot='sheet-content'] { z-index: 1001 !important; }
  [data-slot='popover-content'] { z-index: 1002 !important; }
`

function mapRawPositionToHr(raw: RawPositionForDetail): HrJobPosition {
  return {
    id: raw.id,
    name: raw.name,
    version: raw.version ?? null,
    activeTo: raw.activeTo ?? null,
    siteLocationId: raw.organizationalUnitEmployees?.[0]?.siteLocation?.id ?? null,
    siteLocation: raw.organizationalUnitEmployees?.[0]?.siteLocation
      ? {
          id: raw.organizationalUnitEmployees[0].siteLocation.id!,
          name: raw.organizationalUnitEmployees[0].siteLocation.name ?? ''
        }
      : null,
    jobFunction: raw.jobFunction
      ? {
          id: raw.jobFunction.id,
          name: raw.jobFunction.name ?? '',
          code: raw.jobFunction.code ?? '',
          jobFamily: raw.jobFunction.jobFamily
            ? {
                id: raw.jobFunction.jobFamily.id,
                name: raw.jobFunction.jobFamily.name ?? '',
                code: raw.jobFunction.jobFamily.code ?? '',
                value: '',
                catalogId: '',
                translations: []
              }
            : null
        }
      : null,
    jobLevel: raw.jobLevel
      ? {
          id: raw.jobLevel.id,
          name: raw.jobLevel.name ?? '',
          code: raw.jobLevel.code ?? '',
          hierarchyOrder: raw.jobLevel.hierarchyOrder ?? 0
        }
      : null,
    jobProfile: raw.jobProfile
      ? { id: raw.jobProfile.id, name: raw.jobProfile.name ?? '', code: raw.jobProfile.code ?? '', title: '' }
      : null,
    contractType: null,
    employmentType: null,
    employeePositions: (raw.employeePositions ?? []).map(ep => ({
      firstName: ep.firstName ?? '',
      lastName: ep.lastName ?? '',
      employeeId: ep.employeeId ?? '',
      employee: { pictureThumbnail: null },
      supervisor: ep.supervisor
        ? { id: ep.supervisor.id, firstName: ep.supervisor.firstName ?? '', lastName: ep.supervisor.lastName ?? '' }
        : undefined
    })),
    organizationalUnitEmployees: (raw.organizationalUnitEmployees ?? []).map(ou => ({
      organizationalUnit: { id: ou.organizationalUnit?.id ?? '', name: ou.organizationalUnit?.name ?? '' },
      siteLocation: ou.siteLocation ? { id: ou.siteLocation.id!, name: ou.siteLocation.name ?? '' } : null
    }))
  }
}

interface JobPositionSheetPanelProps {
  readonly items: JobArchitectureListItem[]
  readonly currentIndex: number
  readonly onIndexChange: (idx: number) => void
  readonly onClose: () => void
  readonly accessToken: string
}

export function JobPositionSheetPanel({
  items,
  currentIndex,
  onIndexChange,
  onClose,
  accessToken
}: Readonly<JobPositionSheetPanelProps>) {
  const item = items[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < items.length - 1
  const ctx = useDataQualityContext()

  const contextProps = useMemo(() => ({ accessToken }) as BusinessAppContextProps, [accessToken])
  const { deleteJobPosition, mutationLoading: deleteLoading } = useJobPositions(contextProps)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [terminatingId, setTerminatingId] = useState<string | null>(null)

  const hrJobPosition = useMemo(() => (item?.rawPosition ? mapRawPositionToHr(item.rawPosition) : null), [item])

  const handleEdit = useCallback(() => setEditFormOpen(true), [])

  const handleRequestTerminate = useCallback(
    (jp: HrJobPosition) => {
      setTerminatingId(jp.id)
      deleteJobPosition(jp.id, jp.version ?? undefined)
        .then(() => {
          ctx.refetch()
        })
        .catch(() => {})
        .finally(() => {
          setTerminatingId(null)
        })
    },
    [deleteJobPosition, ctx]
  )

  if (!hrJobPosition) return null

  return (
    <>
      <Sheet
        open
        onOpenChange={open => {
          if (!open) onClose()
        }}
      >
        <style>{SHEET_Z_INDEX_STYLE}</style>
        <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0">
          <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
            <div className="gba:flex gba:items-center gba:justify-between">
              <SheetTitle className="gba:text-left gba:truncate">{hrJobPosition.name}</SheetTitle>
              <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                  {currentIndex + 1} / {items.length}
                </span>
                <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => onIndexChange(currentIndex - 1)}>
                  <CaretLeftIcon className="gba:size-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onIndexChange(currentIndex + 1)}>
                  <CaretRightIcon className="gba:size-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="gba:flex-1 gba:min-h-0">
            <JobPositionDetails
              jobPosition={hrJobPosition}
              accessToken={accessToken}
              onEditJobPosition={handleEdit}
              onRequestTerminateJobPosition={handleRequestTerminate}
              terminateMutationLoading={deleteLoading}
              terminatingJobPositionId={terminatingId}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {editFormOpen && (
        <JobPositionForm
          accessToken={accessToken}
          jobPosition={mapJobPositionListRowToFormJobPosition(hrJobPosition)}
          open={editFormOpen}
          setOpen={setEditFormOpen}
          onCancel={() => setEditFormOpen(false)}
          onMutationSuccess={() => {
            setEditFormOpen(false)
            ctx.refetch()
          }}
          prefixDataTestId="hr-admin-cockpit-jp-edit"
        />
      )}
    </>
  )
}
