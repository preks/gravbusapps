import { useEffect, useState } from 'react'
import { useJobFunctionQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobFunctionQueries'
import { useJobLevelQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobLevelQueries'
import {
  transformJobFunctionRow,
  type PartialJobFunction,
  type JobFunction
} from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types'
import { transformJobLevelRow, type JobLevel } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'

export function useJobReferenceData(accessToken: string) {
  const { fetchJobFunctions } = useJobFunctionQueries(accessToken)
  const { fetchJobLevels } = useJobLevelQueries(accessToken)
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([])
  const [jobFunctionsForForm, setJobFunctionsForForm] = useState<PartialJobFunction[]>([])
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchJobFunctions(), fetchJobLevels()])
      .then(([fns, lvls]) => {
        if (cancelled) return
        const rows = fns.jobFunctions ?? []
        setJobFunctions(rows.map(transformJobFunctionRow))
        setJobFunctionsForForm(
          rows.map(f => ({
            id: f.id,
            code: f.code,
            name: f.name,
            description: f.description,
            jobFamily: f.jobFamily || { id: '', code: null, name: null },
            version: f.version,
            isActive: true
          }))
        )
        setJobLevels((lvls.jobLevels ?? []).map(transformJobLevelRow))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [fetchJobFunctions, fetchJobLevels])

  return { jobFunctions, jobFunctionsForForm, jobLevels }
}
