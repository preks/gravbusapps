import type { JobPosition as FormJobPosition } from '@/business-apps/hr/core/forms/job-position-2'
import type { JobPosition as ListJobPosition } from '../hooks/useJobPositionListData'

/**
 * Maps a job position row from the HR list query into the shape expected by job-position-2 {@link JobPositionForm}.
 */
export function mapJobPositionListRowToFormJobPosition(row: ListJobPosition): Partial<FormJobPosition> {
  const dept = row.organizationalUnitEmployees?.[0]?.organizationalUnit
  const jf = row.jobFunction
  const jfam = jf?.jobFamily

  const siteLocation = row.siteLocation
    ? {
        id: row.siteLocation.id,
        name: row.siteLocation.name,
        code: row.siteLocation.code ?? undefined
      }
    : null

  return {
    id: row.id,
    name: row.name,
    version: row.version ?? undefined,
    siteLocationId: row.siteLocationId ?? '',
    siteLocation,
    departmentId: dept?.id ?? '',
    department: dept
      ? {
          id: dept.id,
          name: dept.name,
          code: dept.code ?? undefined
        }
      : null,
    jobFamilyId: jfam?.id ?? '',
    jobFamily: jfam
      ? {
          id: jfam.id,
          code: jfam.code,
          name: jfam.name,
          description: null
        }
      : null,
    jobFunctionId: jf?.id ?? '',
    jobFunction: jf
      ? {
          id: jf.id,
          code: jf.code ?? '',
          name: jf.name,
          description: null,
          jobFamilyId: jfam?.id ?? ''
        }
      : null,
    jobLevelId: row.jobLevel?.id ?? '',
    jobLevel: row.jobLevel
      ? {
          id: row.jobLevel.id,
          code: row.jobLevel.code ?? '',
          name: row.jobLevel.name,
          description: null,
          hierarchyOrder: row.jobLevel.hierarchyOrder ?? 0
        }
      : null,
    jobProfileId: row.jobProfile?.id,
    jobProfile: row.jobProfile
      ? {
          id: row.jobProfile.id,
          code: row.jobProfile.code,
          name: row.jobProfile.name,
          title: row.jobProfile.title,
          description: null,
          jobFunctionId: jf?.id ?? '',
          jobLevelId: row.jobLevel?.id ?? null,
          jobFunction: null,
          jobLevel: null
        }
      : null,
    isActive: true
  }
}
