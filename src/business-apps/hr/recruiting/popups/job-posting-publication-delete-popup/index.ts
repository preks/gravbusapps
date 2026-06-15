import { JobPostingPublicationDeletePopup as JobPostingPublicationDeletePopupComponent } from './JobPostingPublicationDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobPostingPublicationDeletePopup = withRecruitingDevFeatureGate(JobPostingPublicationDeletePopupComponent)
export default JobPostingPublicationDeletePopup
export type { JobPostingPublicationDeletePopupProps } from './JobPostingPublicationDeletePopup'
