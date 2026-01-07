export interface QueryVariablesJobProfile {
  jobProfileId?: string
  offset?: number
  limit?: number
  search?: string
}

export interface JobProfileTranslation {
  localeCode: string
  value: string
}

export interface JobLevelGroup {
  value: string
  id: string
  translations: JobProfileTranslation[]
}

export interface JobLevel {
  id: string
  name: string
  jobLevelGroup: JobLevelGroup
}

export interface ContractType {
  id: string
  value: string
  translations: JobProfileTranslation[]
}

export interface EmploymentType {
  catalogId: string
  id: string
  value: string
  translations: JobProfileTranslation[]
}

export interface JobFamily {
  id: string
  value: string
  translations: JobProfileTranslation[]
}

export interface JobFunction {
  id: string
  name: string
  jobFamily: JobFamily
  jobLevelGroup: JobLevelGroup
}

export interface JobProfileItem {
  id: string
  name: string
  code?: string // Job profile core field
  jobLevel: JobLevel
  jobFunction: JobFunction
  contractType: ContractType
  employmentType: EmploymentType
}

const createSearchCondition = (search?: string, jobProfileId?: string): string => {
  if (jobProfileId) return ''
  if (!search || search.trim().length === 0) return ''

  // Escape the search term to prevent GraphQL injection
  const escapedSearch = search.replace(/"/g, '\\"')

  // Search both name and code fields
  return `_or: [
    { name: { _ilike: "%${escapedSearch}%" } },
    { code: { _ilike: "%${escapedSearch}%" } }
  ]`
}

export const GET_JOB_PROFILE_DATA = (variables: QueryVariablesJobProfile): string => {
  const { offset, limit, search, jobProfileId } = variables

  // Build where conditions
  const conditions: string[] = []

  // Always filter out deleted job profiles
  conditions.push('isDeleted: { _eq: false }')

  if (jobProfileId) {
    conditions.push(`id: { _eq: "${jobProfileId}" }`)
  }

  const searchCondition = createSearchCondition(search, jobProfileId)
  if (searchCondition) {
    conditions.push(searchCondition)
  }

  const whereClause = conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : ''
  const limitFormatted = `limit: ${limit || 20}`
  const offsetFormatted = `offset: ${offset || 0}`
  const orderByFormatted = `orderBy: { name: ASC }`

  // Build the arguments array and filter out empty ones
  const jobProfileArgs = [limitFormatted, offsetFormatted, whereClause, orderByFormatted]
    .filter(arg => arg.trim() !== '')
    .join('\n      ')

  const aggregateArgs = whereClause || ''

  return `query JobProfiles {
    JobProfile(
      ${jobProfileArgs}
    ) {
      id
      name
      code
      jobLevel {
        id
        name
        jobLevelGroup {
          value
          id
          translations {
            localeCode
            value
          }
        }
      }
      jobFunction {
        id
        name
        jobFamily {
          id
          value
          translations {
            localeCode
            value
          }
        }
        jobLevelGroup {
          value
          id
          translations {
            localeCode
            value
          }
        }
      }
      contractType {
        id
        value
        translations {
          value
          localeCode
        }
      }
      employmentType {
        catalogId
        id
        value
        translations {
          value
          localeCode
        }
      }
    }${
      aggregateArgs
        ? `
    JobProfileAggregate(
      ${aggregateArgs}
    ) {
      aggregate {
        count
      }
    }`
        : `
    JobProfileAggregate {
      aggregate {
        count
      }
    }`
    }
  }`
}

export type JobProfileData = {
  JobProfile: JobProfileItem[]
  JobProfileAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const fetchJobProfileData = async (
  client: any, // GraphQL client instance
  variables: QueryVariablesJobProfile = {}
): Promise<JobProfileData> => {
  const query = GET_JOB_PROFILE_DATA(variables)

  try {
    const result = await client.request(query)
    return result
  } catch (error) {
    console.error('❌ GraphQL query failed:', error)
    throw error
  }
}
