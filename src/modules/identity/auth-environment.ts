type AuthEnvironmentInput = Readonly<Record<string, string | undefined>>;

function normalized(value?: string) {
  return value?.trim() ?? "";
}

export function readAuthEnvironment(environment: AuthEnvironmentInput) {
  const authSecret = normalized(environment.AUTH_SECRET);
  const cognitoClientId = normalized(environment.AUTH_COGNITO_ID);
  const cognitoClientSecret = normalized(environment.AUTH_COGNITO_SECRET);
  const cognitoIssuer = normalized(environment.AUTH_COGNITO_ISSUER);

  return {
    authSecret,
    cognitoClientId,
    cognitoClientSecret,
    cognitoIssuer,
    configured: Boolean(
      authSecret && cognitoClientId && cognitoClientSecret && cognitoIssuer,
    ),
  };
}
