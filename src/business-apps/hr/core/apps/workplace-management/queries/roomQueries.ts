export const GET_ACTIVE_ROOMS = `
  query GetActiveRooms {
    room: Room(
      where: { isDeleted: { _eq: false } }
      orderBy: { code: ASC }
    ) {
      id
      version
      code
      name
    }
  }
`
