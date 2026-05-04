import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface JobPositionQueryVariables {
  structureId: string
  limit?: number
  offset?: number
  vacant?: boolean
  filter: any // JobPositionBoolExp type
  search: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
}

// GraphQL query to fetch job positions with employee positions (RESTORED ORIGINAL)
export const JOB_POSITION_QUERY = `
  query MyQuery(
    $structureId: uuid!,
    $limit: Int,
    $offset: Int,
    $vacant: Boolean,
    $filter: JobPositionBoolExp!,
    $search: String!,
    $orderBy: [JobPositionOrderBy!]
  ) {
    JobPosition(
      where: {
        _and: [
          {
            organizationalUnitEmployees: {
              structureId: { _eq: $structureId },
              employeeId: { _isNull: $vacant }
            }
          },
          { isDeleted: { _eq: false } },
          $filter,
          {
            _or: [
              { name: { _ilike: $search } },
              { jobFunction: { name: { _ilike: $search } } },
              { jobFunction: { jobFamily: { name: { _ilike: $search } } } },
              { jobLevel: { name: { _ilike: $search } } },
              { jobProfile: { name: { _ilike: $search } } },
              { employeePositions: {
                  _or: [
                    { firstName: { _ilike: $search } },
                    { lastName: { _ilike: $search } }
                  ]
                }
              },
              { organizationalUnitEmployees: {
                  organizationalUnit: { name: { _ilike: $search } }
                }
              }
            ]
          }
        ]
      },
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy
    ) {
      id
      name
      version
      activeTo
      jobFunction { 
        id 
        name 
        jobFamily {
          id
          code
          name
        }
      }
      jobLevel {
        id
        code
        name
        hierarchyOrder
      }
      jobProfile {
        id
        name
        title
        code
      }
      employeePositions {
        employeeId
        firstName
        lastName
        employee { pictureThumbnail }
        supervisor {
        id
        firstName
        lastName
        pictureThumbnail
      }
      }
      organizationalUnitEmployees {
        organizationalUnit {
          name
          id
        }
        siteLocation {
          code
          name
        }
      }
    }

    JobPositionAggregate(
      where: {
        _and: [
          {
            organizationalUnitEmployees: {
              structureId: { _eq: $structureId },
              employeeId: { _isNull: $vacant }
            }
          },
          { isDeleted: { _eq: false } },
          $filter,
          {
            _or: [
              { name: { _ilike: $search } },
              { jobFunction: { name: { _ilike: $search } } },
              { jobFunction: { jobFamily: { name: { _ilike: $search } } } },
              { jobLevel: { name: { _ilike: $search } } },
              { jobProfile: { name: { _ilike: $search } } },
              { employeePositions: {
                  _or: [
                    { firstName: { _ilike: $search } },
                    { lastName: { _ilike: $search } }
                  ]
                }
              },
              { organizationalUnitEmployees: {
                  organizationalUnit: { name: { _ilike: $search } }
                }
              }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const useGetJobPositionData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchJobPositionData = async (variables: JobPositionQueryVariables) => {
    try {
      const result = await graphqlClient.request(JOB_POSITION_QUERY, variables)
      return result
    } catch (error) {
      console.error('Error fetching job position data:', error)
      throw error
    }
  }

  return { fetchJobPositionData }
}
