import { describe, expect, it } from "vitest";
import { createCognitoOAuthProvider } from "./cognito-oauth";

describe("createCognitoOAuthProvider", () => {
  it("sends a nonce while retaining state and PKCE validation", () => {
    const provider = createCognitoOAuthProvider({
      clientId: "client-id",
      clientSecret: "client-secret",
      issuer: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example",
    });

    expect(provider.options?.checks).toEqual(["pkce", "state", "nonce"]);
    expect(provider.options).toMatchObject({
      clientId: "client-id",
      clientSecret: "client-secret",
      issuer: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example",
    });
  });
});
