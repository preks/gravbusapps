import { JobCandidateDeletePopup as JobCandidateDeletePopupComponent } from './JobCandidateDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobCandidateDeletePopup = withRecruitingDevFeatureGate(JobCandidateDeletePopupComponent)
export default JobCandidateDeletePopup
export type { JobCandidateDeletePopupProps } from './JobCandidateDeletePopup'
