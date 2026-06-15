import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'
import { RecruitingPortal as RecruitingPortalComponent } from './RecruitingPortal'

export const RecruitingPortal = withRecruitingDevFeatureGate(RecruitingPortalComponent)

export default RecruitingPortal
