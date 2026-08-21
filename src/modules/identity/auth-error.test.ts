import { describe, expect, it } from "vitest";
import { describeAuthError } from "./auth-error";

describe("describeAuthError", () => {
  it("returns no alert when the URL has no auth error", () => {
    expect(describeAuthError()).toBeNull();
  });

  it("gives OAuth callback failures an actionable reference", () => {
    expect(describeAuthError("OAuthCallbackError")).toEqual({
      message:
        "Your provider returned to Sweet+, but the sign-in exchange could not be completed. Try another account once; if it also fails, the provider connection needs attention.",
      reference: "OAUTH_CALLBACK",
    });
  });

  it("does not reflect unknown query-string values", () => {
    expect(describeAuthError("<script>alert(1)</script>")).toEqual({
      message: "We couldn’t finish that sign-in. Please try again.",
      reference: "SIGN_IN_FAILED",
    });
  });
});
