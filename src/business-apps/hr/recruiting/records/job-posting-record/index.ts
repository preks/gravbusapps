import JobPostingRecord from './JobPostingRecord'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

const GatedJobPostingRecord = withRecruitingDevFeatureGate(JobPostingRecord)

export { GatedJobPostingRecord as JobPostingRecord }
export default GatedJobPostingRecord
