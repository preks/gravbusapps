import JobApplicationRecord from './JobApplicationRecord'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

const GatedJobApplicationRecord = withRecruitingDevFeatureGate(JobApplicationRecord)

export { GatedJobApplicationRecord as JobApplicationRecord }
export default GatedJobApplicationRecord
