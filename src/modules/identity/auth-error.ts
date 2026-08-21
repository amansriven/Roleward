export type AuthErrorDetails = {
  message: string;
  reference: string;
};

const fallback: AuthErrorDetails = {
  message: "We couldn’t finish that sign-in. Please try again.",
  reference: "SIGN_IN_FAILED",
};

const errors: Record<string, AuthErrorDetails> = {
  AccessDenied: {
    message:
      "Google sign-in was canceled or access was denied. Choose Google and try again.",
    reference: "ACCESS_DENIED",
  },
  appleUnavailable: {
    message: "Sign in with Apple is not available yet. Choose another method.",
    reference: "APPLE_UNAVAILABLE",
  },
  configuration: {
    message:
      "Sign-in is temporarily unavailable because the authentication service needs attention.",
    reference: "AUTH_CONFIGURATION",
  },
  Configuration: {
    message:
      "Sign-in is temporarily unavailable because the authentication service needs attention.",
    reference: "AUTH_CONFIGURATION",
  },
  InvalidCheck: {
    message:
      "The sign-in session expired or its browser check could not be verified. Start again without switching browsers.",
    reference: "OAUTH_SESSION_CHECK",
  },
  OAuthAccountNotLinked: {
    message:
      "An account with this email already uses another sign-in method. Log in with that method first.",
    reference: "ACCOUNT_NOT_LINKED",
  },
  OAuthCallbackError: {
    message:
      "Your provider returned to Sweet+, but the sign-in exchange could not be completed. Try another account once; if it also fails, the provider connection needs attention.",
    reference: "OAUTH_CALLBACK",
  },
  OAuthSignin: {
    message:
      "Social sign-in could not be started. Please try again in a new browser tab.",
    reference: "OAUTH_START",
  },
};

export function describeAuthError(error?: string): AuthErrorDetails | null {
  if (!error) return null;
  const key = error === "apple-unavailable" ? "appleUnavailable" : error;
  return errors[key] ?? fallback;
}
