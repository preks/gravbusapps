// Job Structure Data Components
export { default } from './JobStructureData'

// Tab Components
export { default as JobFamiliesTab } from './components/tabs/JobFamiliesTab'
// export { JobFunctionsTab } from './components/tabs/JobFunctionsTab'
// export { JobProfilesTab } from './components/tabs/JobProfilesTab'

// Types - Export from centralized types folder
export type * from './types'

// Export hooks
export { useJobFunctions } from './hooks/useJobFunctions'
export { useJobProfiles } from './hooks/useJobProfiles'

// Export queries
// export { useGetJobLevelData } from './queries/JobLevelQueries'
// export type { JobLevelByJobLevelGroupIdData, JobLevelDataVariables } from './queries/JobLevelQueries'
// export { useGetJobFunctionData } from './queries/JobFunctionQueries'
// export type { JobFunctionByIdData, JobFunctionDataVariables } from './queries/JobFunctionQueries'
// export { useGetJobProfileData } from './queries/JobProfileQueries'
// export type { JobProfileByIdData, JobProfileDataVariables } from './queries/JobProfileQueries'
