export function getAccessTokenFromAuthorizationHeader(authorizationHeader: string | undefined): string {
  try {
    return `${(authorizationHeader as string).split('Bearer ')[1]}`
  } catch {
    return ''
  }
}

export function setAccessTokenToAuthorizationHeader(accessToken: string): string {
  try {
    return `Bearer ${accessToken}`
  } catch {
    return ''
  }
}
