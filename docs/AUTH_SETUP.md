# Cognito authentication setup

Sweet+ uses Amazon Cognito managed login as an OpenID Connect provider and Auth.js inside the Next.js server. Cognito handles email/password, Google, Apple, verification, recovery, and MFA. Auth.js exchanges the authorization code on the server and stores the Sweet+ session in an encrypted HTTP-only cookie.

## User Pool

Create a Cognito User Pool with:

- Application type: **Traditional web application**
- Sign-in identifier: email
- Self-service sign-up: enabled
- Required attribute: email
- Email verification: confirmation code
- Account recovery: verified email
- MFA: optional during development

## Domain and managed login

Add a Cognito domain under the User Pool **Domain** menu and enable managed login. This domain hosts email/password registration, password recovery, MFA prompts, and the Google and Apple provider buttons.

## Confidential app client

The Traditional web application client must have a client secret. Keep it exclusively in server-side environment variables.

Enable:

- Authorization code grant only
- Scopes: `openid`, `email`, `profile`
- Identity providers: `Cognito user pool`, `Google`, `Sign in with Apple`
- Token revocation

Allowed callback URLs:

```text
http://localhost:3000/api/auth/callback/cognito
https://sweetplus.vercel.app/api/auth/callback/cognito
```

Allowed sign-out URLs:

```text
http://localhost:3000
https://sweetplus.vercel.app
```

## Google

Create a Web OAuth client in Google Cloud. Its authorized redirect URI points to Cognito—not Sweet+:

```text
https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse
```

Add the Google client ID and secret under Cognito **Social and external providers**, request `openid profile email`, map email and name, and enable Google on the Sweet+ app client.

## Apple

Sign in with Apple requires an Apple Developer account. Create a Services ID and Sign in with Apple key. Configure the Apple return URL as:

```text
https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse
```

Add the Services ID, Team ID, Key ID, and private key under Cognito **Social and external providers**, request `name email`, map email and name, and enable Apple on the Sweet+ app client.

## Server environment

Generate `AUTH_SECRET` with `npx auth secret`. Add all values locally and in Vercel:

```env
AUTH_SECRET=
AUTH_COGNITO_ID=
AUTH_COGNITO_SECRET=
AUTH_COGNITO_ISSUER=https://cognito-idp.us-east-2.amazonaws.com/us-east-2_EXAMPLE
```

`AUTH_COGNITO_SECRET` and `AUTH_SECRET` are secrets. Never prefix them with `NEXT_PUBLIC_`, commit them, or expose them in browser code.

## Verification

1. Open `/login` and continue to Cognito managed login.
2. Register and verify an email/password account.
3. Log out and back in with the same account.
4. Test Google sign-in.
5. Test Apple sign-in.
6. Exercise password recovery.
7. Open `/dashboard` in a private window and confirm it redirects to `/login`.

Dashboard rendering now requires a valid server session. Future APIs must also verify the session user ID and resource ownership on every request.
