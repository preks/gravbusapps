/**
 * GraphQL queries for user-related data
 */

/**
 * Query to fetch user avatar by user ID
 */
export const getUserAvatarQuery = `
  query GetUserAvatar($userId: uuid!) {
    User(where: {id: {_eq: $userId}}) {
      id
      profilePicture
    }
  }
`
