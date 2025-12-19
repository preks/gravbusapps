/**
 * Recruiting Module Enums
 * Centralized enum definitions for recruiting entities
 */

/**
 * JobRequestType - Replaces JobRequestReason catalog
 */
export enum JobRequestType {
  UNKNOWN = 'UNKNOWN_JOB_REQUEST_TYPE',
  NEW = 'NEW_JOB_REQUEST_TYPE',
  REPLACEMENT = 'REPLACEMENT_JOB_REQUEST_TYPE'
}

/**
 * JobRequestStatus - Status values for job requests
 */
export enum JobRequestStatus {
  UNKNOWN = 'UNKNOWN_JOB_REQUEST_STATUS',
  DRAFT = 'DRAFT_JOB_REQUEST_STATUS',
  SUBMITTED = 'SUBMITTED_JOB_REQUEST_STATUS',
  APPROVED = 'APPROVED_JOB_REQUEST_STATUS',
  REJECTED = 'REJECTED_JOB_REQUEST_STATUS',
  RETURNED = 'RETURNED_JOB_REQUEST_STATUS'
}

/**
 * JobCandidateStatus - New status field for candidates
 */
export enum JobCandidateStatus {
  SOURCED = 'SOURCED_JOB_CANDIDATE_STATUS',
  APPLIED = 'APPLIED_JOB_CANDIDATE_STATUS',
  INVITED = 'INVITED_JOB_CANDIDATE_STATUS',
  HIRED = 'HIRED_JOB_CANDIDATE_STATUS',
  REJECTED = 'REJECTED_JOB_CANDIDATE_STATUS',
  WITHDRAWN = 'WITHDRAWN_JOB_CANDIDATE_STATUS',
  POOLED = 'POOLED_JOB_CANDIDATE_STATUS'
}

/**
 * JobApplicationRating - Rating for application feedback
 */
export enum JobApplicationRating {
  POSITIVE = 'POSITIVE_JOB_APPLICATION_RATING',
  NEUTRAL = 'NEUTRAL_JOB_APPLICATION_RATING',
  NEGATIVE = 'NEGATIVE_JOB_APPLICATION_RATING'
}

/**
 * JobInterviewStatus - Interview scheduling status
 */
export enum JobInterviewStatus {
  SCHEDULED = 'SCHEDULED_JOB_INTERVIEW_STATUS',
  CANCELLED = 'CANCELLED_JOB_INTERVIEW_STATUS'
}

/**
 * JobInterviewResponse - Participant response to interview invitation
 */
export enum JobInterviewResponse {
  UNKNOWN = 'UNKNOWN_JOB_INTERVIEW_RESPONSE',
  ACCEPTED = 'ACCEPTED_JOB_INTERVIEW_RESPONSE',
  DECLINED = 'DECLINED_JOB_INTERVIEW_RESPONSE',
  TENTATIVE = 'TENTATIVE_JOB_INTERVIEW_RESPONSE'
}

/**
 * JobOfferStatus - Offer status
 */
export enum JobOfferStatus {
  DRAFT = 'DRAFT_JOB_OFFER_STATUS',
  SUBMITTED = 'SUBMITTED_JOB_OFFER_STATUS',
  ACCEPTED = 'ACCEPTED_JOB_OFFER_STATUS',
  DECLINED = 'DECLINED_JOB_OFFER_STATUS',
  WITHDRAWN = 'WITHDRAWN_JOB_OFFER_STATUS'
}

/**
 * Utility functions for enum display
 */

export const getJobRequestTypeLabel = (type: JobRequestType | string): string => {
  switch (type) {
    case JobRequestType.NEW:
      return 'New Position'
    case JobRequestType.REPLACEMENT:
      return 'Replacement'
    case JobRequestType.UNKNOWN:
    default:
      return 'Unknown'
  }
}

export const getJobRequestStatusLabel = (status: JobRequestStatus | string): string => {
  switch (status) {
    case JobRequestStatus.DRAFT:
      return 'Draft'
    case JobRequestStatus.SUBMITTED:
      return 'Submitted'
    case JobRequestStatus.APPROVED:
      return 'Approved'
    case JobRequestStatus.REJECTED:
      return 'Rejected'
    case JobRequestStatus.RETURNED:
      return 'Returned'
    case JobRequestStatus.UNKNOWN:
    default:
      return 'Unknown'
  }
}

export const getJobCandidateStatusLabel = (status: JobCandidateStatus | string): string => {
  switch (status) {
    case JobCandidateStatus.SOURCED:
      return 'Sourced'
    case JobCandidateStatus.APPLIED:
      return 'Applied'
    case JobCandidateStatus.INVITED:
      return 'Invited'
    case JobCandidateStatus.HIRED:
      return 'Hired'
    case JobCandidateStatus.REJECTED:
      return 'Rejected'
    case JobCandidateStatus.WITHDRAWN:
      return 'Withdrawn'
    case JobCandidateStatus.POOLED:
      return 'Pooled'
    default:
      return 'Unknown'
  }
}

export const getJobApplicationRatingLabel = (rating: JobApplicationRating | string): string => {
  switch (rating) {
    case JobApplicationRating.POSITIVE:
      return 'Positive'
    case JobApplicationRating.NEUTRAL:
      return 'Neutral'
    case JobApplicationRating.NEGATIVE:
      return 'Negative'
    default:
      return 'Unknown'
  }
}

export const getJobInterviewStatusLabel = (status: JobInterviewStatus | string): string => {
  switch (status) {
    case JobInterviewStatus.SCHEDULED:
      return 'Scheduled'
    case JobInterviewStatus.CANCELLED:
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

export const getJobInterviewResponseLabel = (response: JobInterviewResponse | string): string => {
  switch (response) {
    case JobInterviewResponse.ACCEPTED:
      return 'Accepted'
    case JobInterviewResponse.DECLINED:
      return 'Declined'
    case JobInterviewResponse.TENTATIVE:
      return 'Tentative'
    case JobInterviewResponse.UNKNOWN:
    default:
      return 'Unknown'
  }
}

export const getJobOfferStatusLabel = (status: JobOfferStatus | string): string => {
  switch (status) {
    case JobOfferStatus.DRAFT:
      return 'Draft'
    case JobOfferStatus.SUBMITTED:
      return 'Submitted'
    case JobOfferStatus.ACCEPTED:
      return 'Accepted'
    case JobOfferStatus.DECLINED:
      return 'Declined'
    case JobOfferStatus.WITHDRAWN:
      return 'Withdrawn'
    default:
      return 'Unknown'
  }
}

/**
 * Get enum options for Select components
 */

export const getJobRequestTypeOptions = () => [
  { value: JobRequestType.NEW, label: getJobRequestTypeLabel(JobRequestType.NEW) },
  { value: JobRequestType.REPLACEMENT, label: getJobRequestTypeLabel(JobRequestType.REPLACEMENT) }
]

export const getJobRequestStatusOptions = () => [
  { value: JobRequestStatus.DRAFT, label: getJobRequestStatusLabel(JobRequestStatus.DRAFT) },
  { value: JobRequestStatus.SUBMITTED, label: getJobRequestStatusLabel(JobRequestStatus.SUBMITTED) },
  { value: JobRequestStatus.APPROVED, label: getJobRequestStatusLabel(JobRequestStatus.APPROVED) },
  { value: JobRequestStatus.REJECTED, label: getJobRequestStatusLabel(JobRequestStatus.REJECTED) },
  { value: JobRequestStatus.RETURNED, label: getJobRequestStatusLabel(JobRequestStatus.RETURNED) }
]

export const getJobCandidateStatusOptions = () => [
  { value: JobCandidateStatus.SOURCED, label: getJobCandidateStatusLabel(JobCandidateStatus.SOURCED) },
  { value: JobCandidateStatus.APPLIED, label: getJobCandidateStatusLabel(JobCandidateStatus.APPLIED) },
  { value: JobCandidateStatus.INVITED, label: getJobCandidateStatusLabel(JobCandidateStatus.INVITED) },
  { value: JobCandidateStatus.HIRED, label: getJobCandidateStatusLabel(JobCandidateStatus.HIRED) },
  { value: JobCandidateStatus.REJECTED, label: getJobCandidateStatusLabel(JobCandidateStatus.REJECTED) },
  { value: JobCandidateStatus.WITHDRAWN, label: getJobCandidateStatusLabel(JobCandidateStatus.WITHDRAWN) },
  { value: JobCandidateStatus.POOLED, label: getJobCandidateStatusLabel(JobCandidateStatus.POOLED) }
]

export const getJobApplicationRatingOptions = () => [
  { value: JobApplicationRating.POSITIVE, label: getJobApplicationRatingLabel(JobApplicationRating.POSITIVE) },
  { value: JobApplicationRating.NEUTRAL, label: getJobApplicationRatingLabel(JobApplicationRating.NEUTRAL) },
  { value: JobApplicationRating.NEGATIVE, label: getJobApplicationRatingLabel(JobApplicationRating.NEGATIVE) }
]

export const getJobInterviewStatusOptions = () => [
  { value: JobInterviewStatus.SCHEDULED, label: getJobInterviewStatusLabel(JobInterviewStatus.SCHEDULED) },
  { value: JobInterviewStatus.CANCELLED, label: getJobInterviewStatusLabel(JobInterviewStatus.CANCELLED) }
]

export const getJobInterviewResponseOptions = () => [
  { value: JobInterviewResponse.ACCEPTED, label: getJobInterviewResponseLabel(JobInterviewResponse.ACCEPTED) },
  { value: JobInterviewResponse.DECLINED, label: getJobInterviewResponseLabel(JobInterviewResponse.DECLINED) },
  { value: JobInterviewResponse.TENTATIVE, label: getJobInterviewResponseLabel(JobInterviewResponse.TENTATIVE) }
]

export const getJobOfferStatusOptions = () => [
  { value: JobOfferStatus.DRAFT, label: getJobOfferStatusLabel(JobOfferStatus.DRAFT) },
  { value: JobOfferStatus.SUBMITTED, label: getJobOfferStatusLabel(JobOfferStatus.SUBMITTED) },
  { value: JobOfferStatus.ACCEPTED, label: getJobOfferStatusLabel(JobOfferStatus.ACCEPTED) },
  { value: JobOfferStatus.DECLINED, label: getJobOfferStatusLabel(JobOfferStatus.DECLINED) },
  { value: JobOfferStatus.WITHDRAWN, label: getJobOfferStatusLabel(JobOfferStatus.WITHDRAWN) }
]
