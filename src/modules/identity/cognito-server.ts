import "server-only";

import { createHmac } from "node:crypto";
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const clientId = process.env.AUTH_COGNITO_ID || "";
const clientSecret = process.env.AUTH_COGNITO_SECRET || "";
const issuer = process.env.AUTH_COGNITO_ISSUER || "";
const issuerUrl = issuer ? new URL(issuer) : null;
const region = issuerUrl?.hostname.split(".")[1] || "us-east-2";

export const emailAuthConfigured = Boolean(clientId && clientSecret && issuer);

const cognito = new CognitoIdentityProviderClient({ region });

function secretHash(username: string) {
  return createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
}

export async function authenticateWithPassword(
  email: string,
  password: string,
) {
  const result = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash(email),
      },
    }),
  );

  if (!result.AuthenticationResult?.IdToken || result.ChallengeName)
    return null;
  const payloadSegment = result.AuthenticationResult.IdToken.split(".")[1];
  if (!payloadSegment) return null;
  const payload = JSON.parse(
    Buffer.from(payloadSegment, "base64url").toString(),
  ) as { sub?: string; email?: string; name?: string };
  if (!payload.sub || !payload.email) return null;
  return { id: payload.sub, email: payload.email, name: payload.name || null };
}

export async function createAccount(email: string, password: string) {
  return cognito.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      SecretHash: secretHash(email),
      UserAttributes: [{ Name: "email", Value: email }],
    }),
  );
}

export async function confirmAccount(email: string, code: string) {
  return cognito.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      SecretHash: secretHash(email),
    }),
  );
}

export async function resendConfirmation(email: string) {
  return cognito.send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      Username: email,
      SecretHash: secretHash(email),
    }),
  );
}

export async function startPasswordReset(email: string) {
  return cognito.send(
    new ForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
      SecretHash: secretHash(email),
    }),
  );
}

export async function finishPasswordReset(
  email: string,
  code: string,
  password: string,
) {
  return cognito.send(
    new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: password,
      SecretHash: secretHash(email),
    }),
  );
}
