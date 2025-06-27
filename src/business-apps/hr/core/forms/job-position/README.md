# Job Position Form

This form component has been updated to use real GraphQL queries instead of mock data.

## Updated Features

### Job Profile Selection
- **Real GraphQL Integration**: Uses the GraphQL query based on the provided reference
- **Search Functionality**: Users can search through job profiles by name
- **Pagination**: "Load More" button to load additional job profiles
- **Auto-filling**: When a job profile is selected, related fields are automatically filled:
  - Job Level ID
  - Job Level Group ID

## Usage

```tsx
import JobPosition from '@/business-apps/hr/core/forms/job-position/JobPosition';

// Basic usage
<JobPosition 
  accessToken={userAccessToken}
/>

// With initial values for editing
<JobPosition 
  accessToken={userAccessToken}
  isEdit={true}
  initialValues={{
    id: 'position-123',
    name: 'Senior Developer',
    jobProfileId: 'profile-456'
  }}
/>
```

## GraphQL Query

The job profile selection uses this GraphQL query:

```graphql
query JobProfiles {
  JobProfile(
    limit: 20
    offset: 0
    where: { name: { _ilike: "%search%" } }
    order_by: { name: asc }
  ) {
    id
    name
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
  }
  JobProfileAggregate(where: { name: { _ilike: "%search%" } }) {
    aggregate {
      count
    }
  }
}
```

## Next Steps

The following fields still use mock data and will be replaced with real GraphQL queries in future updates:

1. **Job Family** - Needs individual GraphQL query
2. **Job Function** - Needs individual GraphQL query with job family relationship
3. **Job Level Group** - Needs individual GraphQL query
4. **Job Level** - Needs individual GraphQL query with job level group relationship

## Auto-filling Logic

When a job profile is selected:
1. The system finds the selected profile in the loaded data
2. Extracts the job level information
3. Auto-fills the Job Level ID field
4. Auto-fills the Job Level Group ID field based on the job level's group

This reduces manual data entry and ensures consistency. 