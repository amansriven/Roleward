type AuthEnvironmentInput = Readonly<Record<string, string | undefined>>;

function normalized(value?: string) {
  return value?.trim() ?? "";
}

export function readAuthEnvironment(environment: AuthEnvironmentInput) {
  const authSecret = normalized(environment.AUTH_SECRET);
  const cognitoClientId = normalized(environment.AUTH_COGNITO_ID);
  const cognitoClientSecret = normalized(environment.AUTH_COGNITO_SECRET);
  const cognitoIssuer = normalized(environment.AUTH_COGNITO_ISSUER);
  const githubClientId = normalized(environment.AUTH_GITHUB_ID);
  const githubClientSecret = normalized(environment.AUTH_GITHUB_SECRET);
  const cognitoConfigured = Boolean(
    cognitoClientId && cognitoClientSecret && cognitoIssuer,
  );
  const githubConfigured = Boolean(githubClientId && githubClientSecret);

  return {
    authSecret,
    cognitoClientId,
    cognitoClientSecret,
    cognitoIssuer,
    githubClientId,
    githubClientSecret,
    cognitoConfigured,
    githubConfigured,
    configured: Boolean(authSecret && (cognitoConfigured || githubConfigured)),
  };
}
