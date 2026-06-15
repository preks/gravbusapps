import { JobInterviewDeletePopup as JobInterviewDeletePopupComponent } from './JobInterviewDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobInterviewDeletePopup = withRecruitingDevFeatureGate(JobInterviewDeletePopupComponent)
export default JobInterviewDeletePopup
export type { JobInterviewDeletePopupProps } from './JobInterviewDeletePopup'
