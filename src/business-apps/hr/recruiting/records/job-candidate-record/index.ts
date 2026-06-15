import JobCandidateRecord from './JobCandidateRecord'
import { withRecruitingDevFeatureGate } from '../../components/RecruitingDevFeatureGate'

const GatedJobCandidateRecord = withRecruitingDevFeatureGate(JobCandidateRecord)

export { GatedJobCandidateRecord as JobCandidateRecord }
export default GatedJobCandidateRecord
