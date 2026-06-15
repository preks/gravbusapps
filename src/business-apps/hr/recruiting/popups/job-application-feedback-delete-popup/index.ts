import { JobApplicationFeedbackDeletePopup as JobApplicationFeedbackDeletePopupComponent } from './JobApplicationFeedbackDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobApplicationFeedbackDeletePopup = withRecruitingDevFeatureGate(
  JobApplicationFeedbackDeletePopupComponent
)
export default JobApplicationFeedbackDeletePopup
export type { JobApplicationFeedbackDeletePopupProps } from './JobApplicationFeedbackDeletePopup'
