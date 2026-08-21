import { describe, expect, it } from "vitest";
import { readAuthEnvironment } from "./auth-environment";

describe("readAuthEnvironment", () => {
  it("passes the Cognito app-client secret through to server integrations", () => {
    const environment = readAuthEnvironment({
      AUTH_SECRET: "auth-secret",
      AUTH_COGNITO_ID: "cognito-client-id",
      AUTH_COGNITO_SECRET: "cognito-client-secret",
      AUTH_COGNITO_ISSUER:
        "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example",
    });

    expect(environment).toMatchObject({
      cognitoClientId: "cognito-client-id",
      cognitoClientSecret: "cognito-client-secret",
      configured: true,
    });
  });

  it("removes accidental whitespace added by environment-variable editors", () => {
    const environment = readAuthEnvironment({
      AUTH_SECRET: "  auth-secret\n",
      AUTH_COGNITO_ID: " cognito-client-id ",
      AUTH_COGNITO_SECRET: "\tcognito-client-secret\n",
      AUTH_COGNITO_ISSUER:
        " https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example ",
    });

    expect(environment).toEqual({
      authSecret: "auth-secret",
      cognitoClientId: "cognito-client-id",
      cognitoClientSecret: "cognito-client-secret",
      cognitoIssuer:
        "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example",
      configured: true,
    });
  });

  it("does not report authentication as configured when a secret is missing", () => {
    expect(
      readAuthEnvironment({
        AUTH_SECRET: "auth-secret",
        AUTH_COGNITO_ID: "cognito-client-id",
        AUTH_COGNITO_ISSUER:
          "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example",
      }).configured,
    ).toBe(false);
  });
});
