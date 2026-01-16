declare global {
  interface DSDigitalSignupSDK {
    startSignup: (
      firstName: string,
      lastName: string,
      email: string,
      phone: string,
      partnerIK: string,
      loginRedirectUri: string,
      locale: string
    ) => void
    viewPlans?: (partnerIK: string, loginRedirectUri: string, locale?: string) => void
    notifySignupActivation?: (success: boolean) => void
    registerSignupActivationCallback?: (callback: () => void, autoCloseWindow?: boolean) => void
  }

  interface Window {
    DSDigitalSignup?: DSDigitalSignupSDK
  }
}

export {}
