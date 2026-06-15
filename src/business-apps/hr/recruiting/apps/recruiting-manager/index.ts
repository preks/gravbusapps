import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'
import { RecruitingManager as RecruitingManagerComponent } from './RecruitingManager'

export type { RecruitingManagerProps } from './RecruitingManager'

export const RecruitingManager = withRecruitingDevFeatureGate(RecruitingManagerComponent)

export default RecruitingManager
