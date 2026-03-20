/** Error with i18n code for user-facing OAuth config messages */
export class OAuthConfigError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'OAuthConfigError'
    Object.setPrototypeOf(this, OAuthConfigError.prototype)
  }
}
