import { JobOfferDeletePopup as JobOfferDeletePopupComponent } from './JobOfferDeletePopup'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobOfferDeletePopup = withRecruitingDevFeatureGate(JobOfferDeletePopupComponent)
export default JobOfferDeletePopup
export type { JobOfferDeletePopupProps } from './JobOfferDeletePopup'
