import { JobRequestDeletePopup as JobRequestDeletePopupComponent } from './JobRequestDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobRequestDeletePopup = withRecruitingDevFeatureGate(JobRequestDeletePopupComponent)
export default JobRequestDeletePopup
export type { JobRequestDeletePopupProps } from './JobRequestDeletePopup'
