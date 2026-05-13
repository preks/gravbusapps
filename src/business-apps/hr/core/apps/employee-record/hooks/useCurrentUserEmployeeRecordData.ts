import { useFeature } from '@/common/hooks/useFeature'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { Feature } from '@/common/types/constants/FeatureHub'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useEmployeeData } from './useEmployeeData'
import { useSilentRefetchOnProcessCompletion } from './useSilentRefetchOnProcessCompletion'

/**
 * Employee-record GraphQL bundle for the logged-in user's employee, plus feature flags and process refetch.
 * Use on self-service HR screens (e.g. My Development) to avoid duplicating structure id / employee id wiring.
 */
export function useCurrentUserEmployeeRecordData(accessToken: string, userInfo: UserInfoProps | undefined) {
  const activeStructureId = getCurrentActiveStructureId() || ''
  const employeeId = userInfo?.employeeDetails?.employeeId || ''
  const previewFeatureRaw = useFeature(Feature.Preview.Enabled.Key)
  const previewEnabledFlag = previewFeatureRaw === true || previewFeatureRaw === 'true'
  const hrDevelopmentFeatureFlag = useFeature<boolean>(Feature.HCM.HRDevelopment.Key)

  const { loading, error, employee, feedback, performanceGoals, silentRefetch } = useEmployeeData(
    accessToken,
    activeStructureId,
    employeeId
  )

  useSilentRefetchOnProcessCompletion(silentRefetch)

  return {
    activeStructureId,
    employeeId,
    loading,
    error,
    employee,
    feedback,
    performanceGoals,
    previewEnabledFlag,
    performanceEvaluationFeatureFlag: hrDevelopmentFeatureFlag === true
  }
}
