export function getAccessTokenFromAuthorizationHeader(authorizationHeader: string | undefined): string {
    try {
        return `${(authorizationHeader as string).split('Bearer ')[1]}`;
    } catch {
        return '';
    }
}