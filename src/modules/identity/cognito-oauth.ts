import Cognito from "next-auth/providers/cognito";

type CognitoOAuthEnvironment = {
  clientId: string;
  clientSecret: string;
  issuer: string;
};

export function createCognitoOAuthProvider({
  clientId,
  clientSecret,
  issuer,
}: CognitoOAuthEnvironment) {
  return Cognito({
    clientId,
    clientSecret,
    issuer,
    // Cognito automatically adds a nonce for federated users when the client
    // omits one. Auth.js correctly rejects that unsolicited nonce, so send and
    // validate our own while retaining state and PKCE protections.
    checks: ["pkce", "state", "nonce"],
    authorization: {
      params: {
        response_type: "code",
        scope: "openid email profile",
      },
    },
  });
}
