import { JobApplicationDeletePopup as JobApplicationDeletePopupComponent } from './JobApplicationDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobApplicationDeletePopup = withRecruitingDevFeatureGate(JobApplicationDeletePopupComponent)
export default JobApplicationDeletePopup
export type { JobApplicationDeletePopupProps } from './JobApplicationDeletePopup'
