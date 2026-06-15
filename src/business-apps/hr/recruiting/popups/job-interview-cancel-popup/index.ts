import { JobInterviewCancelPopup as JobInterviewCancelPopupComponent } from './JobInterviewCancelPopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobInterviewCancelPopup = withRecruitingDevFeatureGate(JobInterviewCancelPopupComponent)
export default JobInterviewCancelPopup
export type { JobInterviewCancelPopupProps } from './JobInterviewCancelPopup'
