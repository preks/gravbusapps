import { JobPostingDeletePopup as JobPostingDeletePopupComponent } from './JobPostingDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobPostingDeletePopup = withRecruitingDevFeatureGate(JobPostingDeletePopupComponent)
export default JobPostingDeletePopup
export type { JobPostingDeletePopupProps } from './JobPostingDeletePopup'
