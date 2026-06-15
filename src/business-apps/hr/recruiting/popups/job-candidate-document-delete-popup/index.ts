import { JobCandidateDocumentDeletePopup as JobCandidateDocumentDeletePopupComponent } from './JobCandidateDocumentDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobCandidateDocumentDeletePopup = withRecruitingDevFeatureGate(JobCandidateDocumentDeletePopupComponent)
export default JobCandidateDocumentDeletePopup
export type { JobCandidateDocumentDeletePopupProps } from './JobCandidateDocumentDeletePopup'
