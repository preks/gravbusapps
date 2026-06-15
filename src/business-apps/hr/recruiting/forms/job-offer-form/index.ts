import JobOfferFormComponent from './JobOfferForm'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

export const JobOfferForm = withRecruitingDevFeatureGate(JobOfferFormComponent)

export default JobOfferForm
