Password-based Auth

Allow users to sign in with a password connected to their email or phone number.

Users often expect to sign in to your site with a password. Supabase Auth helps you implement password-based auth safely, using secure configuration options and best practices for storing and verifying passwords.

Users can associate a password with their identity using their email address or a phone number.

With email#
Enabling email and password-based authentication#
Email authentication is enabled by default.

You can configure whether users need to verify their email to sign in. On hosted Supabase projects, this is true by default. On self-hosted projects or in local development, this is false by default.

Change this setting on the Auth Providers page for hosted projects, or in the configuration file for self-hosted projects.

Signing up with an email and password#
There are two possible flows for email signup: implicit flow and PKCE flow. If you're using SSR, you're using the PKCE flow. If you're using client-only code, the default flow depends upon the client library. The implicit flow is the default in JavaScript and Dart, and the PKCE flow is the default in Swift.

The instructions in this section assume that email confirmations are enabled.


Implicit flow

PKCE flow
The PKCE flow allows for server-side authentication. Unlike the implicit flow, which directly provides your app with the access token after the user clicks the confirmation link, the PKCE flow requires an intermediate token exchange step before you can get the access token.

Step 1: Update signup confirmation email
Update your signup email template to send the token hash. For detailed instructions on how to configure your email templates, including the use of variables like {{ .SiteURL }}, {{ .TokenHash }}, and {{ .RedirectTo }}, refer to our Email Templates guide.

Your signup email template should contain the following HTML:

<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}"
    >Confirm your email</a
  >
</p>
Step 2: Create token exchange endpoint
Create an API endpoint at <YOUR_SITE_URL>/auth/confirm to handle the token exchange.

Make sure you're using the right supabase client in the following code.

If you're not using Server-Side Rendering or cookie-based Auth, you can directly use the createClient from @supabase/supabase-js. If you're using Server-Side Rendering, see the Server-Side Auth guide for instructions on creating your Supabase client.


Next.js

SvelteKit

Astro

Remix

Express
Create a new file at app/auth/confirm/route.ts and populate with the following:

import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next)
    }
  }
  // redirect the user to an error page with some instructions
  redirect('/auth/auth-code-error')
}
Step 3: Call the sign up function to initiate the flow

JavaScript

Dart

Swift

Kotlin

Python
To sign up the user, call signUp() with their email address and password:

You can optionally specify a URL to redirect to after the user clicks the confirmation link. This URL must be configured as a Redirect URL, which you can do in the dashboard for hosted projects, or in the configuration file for self-hosted projects.

If you don't specify a redirect URL, the user is automatically redirected to your site URL. This defaults to localhost:3000, but you can also configure this.

async function signUpNewUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'valid.email@supabase.io',
    password: 'example-password',
    options: {
      emailRedirectTo: 'https://example.com/welcome',
    },
  })
}
Signing in with an email and password#

JavaScript

Dart

Swift

Kotlin

Python
When your user signs in, call signInWithPassword() with their email address and password:

async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'valid.email@supabase.io',
    password: 'example-password',
  })
}
Resetting a password#

Implicit flow

PKCE flow
The PKCE flow allows for server-side authentication. Unlike the implicit flow, which directly provides your app with the access token after the user clicks the confirmation link, the PKCE flow requires an intermediate token exchange step before you can get the access token.

Step 1: Update reset password email
Update your reset password email template to send the token hash. See Email Templates for how to configure your email templates.

Your reset password email template should contain the following HTML:

<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/update-password"
    >Reset Password</a
  >
</p>
Step 2: Create token exchange endpoint
Create an API endpoint at <YOUR_SITE_URL>/auth/confirm to handle the token exchange.

Make sure you're using the right supabase client in the following code.

If you're not using Server-Side Rendering or cookie-based Auth, you can directly use the createClient from @supabase/supabase-js. If you're using Server-Side Rendering, see the Server-Side Auth guide for instructions on creating your Supabase client.


Next.js

SvelteKit

Astro

Remix

Express
Create a new file at app/auth/confirm/route.ts and populate with the following:

import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }
  // return the user to an error page with some instructions
  redirectTo.pathname = '/auth/auth-code-error'
  return NextResponse.redirect(redirectTo)
}
Step 3: Call the reset password by email function to initiate the flow

JavaScript

Swift

Kotlin

Python
async function resetPassword() {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email)
}
Once you have a session, collect the user's new password and call updateUser to update their password.


JavaScript

Swift

Kotlin

Python
await supabase.auth.updateUser({ password: 'new_password' })
Email sending#
The signup confirmation and password reset flows require an SMTP server to send emails.

The Supabase platform comes with a default email-sending service for you to try out. The service has a rate limit of 2 emails per hour, and availability is on a best-effort basis. For production use, you should consider configuring a custom SMTP server.

Consider configuring a custom SMTP server for production.

See the Custom SMTP guide for instructions.

Local development with Mailpit#
You can test email flows on your local machine. The Supabase CLI automatically captures emails sent locally by using Mailpit.

In your terminal, run supabase status to get the Mailpit URL. Go to this URL in your browser, and follow the instructions to find your emails.

With phone#
You can use a user's mobile phone number as an identifier, instead of an email address, when they sign up with a password.

This practice is usually discouraged because phone networks recycle mobile phone numbers. Anyone receiving a recycled phone number gets access to the original user's account. To mitigate this risk, implement MFA.

Protect users who use a phone number as a password-based auth identifier by enabling MFA.

Enabling phone and password-based authentication#
Enable phone authentication on the Auth Providers page for hosted Supabase projects.

For self-hosted projects or local development, use the configuration file. See the configuration variables namespaced under auth.sms.

If you want users to confirm their phone number on signup, you need to set up an SMS provider. Each provider has its own configuration. Supported providers include MessageBird, Twilio, Vonage, and TextLocal (community-supported).

Configuring SMS Providers

MessageBird Icon
MessageBird

Twilio Icon
Twilio

Vonage Icon
Vonage

Textlocal (Community Supported) Icon
Textlocal (Community Supported)
Signing up with a phone number and password#
To sign up the user, call signUp() with their phone number and password:


JavaScript

Swift

Kotlin

Python

HTTP
const { data, error } = await supabase.auth.signUp({
  phone: '+13334445555',
  password: 'some-password',
})
If you have phone verification turned on, the user receives an SMS with a 6-digit pin that you must verify within 60 seconds:


JavaScript

Swift

Kotlin

Python

HTTP
You should present a form to the user so they can input the 6 digit pin, then send it along with the phone number to verifyOtp:

const {
  data: { session },
  error,
} = await supabase.auth.verifyOtp({
  phone: '+13334445555',
  token: '123456',
  type: 'sms',
})
Signing in a with a phone number and password#
Call the function to sign in with the user's phone number and password:


JavaScript

Swift

Kotlin

Python

HTTP
const { data, error } = await supabase.auth.signInWithPassword({
  phone: '+13334445555',
  password: 'some-password',
})


Passwordless email logins

Email logins using Magic Links or One-Time Passwords (OTPs)

Supabase Auth provides several passwordless login methods. Passwordless logins allow users to sign in without a password, by clicking a confirmation link or entering a verification code.

Passwordless login can:

Improve the user experience by not requiring users to create and remember a password
Increase security by reducing the risk of password-related security breaches
Reduce support burden of dealing with password resets and other password-related flows
Supabase Auth offers two passwordless login methods that use the user's email address:

Magic Link
OTP
With Magic Link#
Magic Links are a form of passwordless login where users click on a link sent to their email address to log in to their accounts. Magic Links only work with email addresses and are one-time use only.

Enabling Magic Link#
Email authentication methods, including Magic Links, are enabled by default.

Configure the Site URL and any additional redirect URLs. These are the only URLs that are allowed as redirect destinations after the user clicks a Magic Link. You can change the URLs on the URL Configuration page for hosted projects, or in the configuration file for self-hosted projects.

By default, a user can only request a magic link once every 60 seconds and they expire after 1 hour.

Signing in with Magic Link#
Call the "sign in with OTP" method from the client library.

Though the method is labelled "OTP", it sends a Magic Link by default. The two methods differ only in the content of the confirmation email sent to the user.

If the user hasn't signed up yet, they are automatically signed up by default. To prevent this, set the shouldCreateUser option to false.


JavaScript

Expo React Native

Dart

Swift

Kotlin

Python
async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'valid.email@supabase.io',
    options: {
      // set this to false if you do not want the user to be automatically signed up
      shouldCreateUser: false,
      emailRedirectTo: 'https://example.com/welcome',
    },
  })
}
That's it for the implicit flow.

If you're using PKCE flow, edit the Magic Link email template to send a token hash:

<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Log In</a></p>
At the /auth/confirm endpoint, exchange the hash for the session:

const { error } = await supabase.auth.verifyOtp({
  token_hash: 'hash',
  type: 'email',
})
With OTP#
Email one-time passwords (OTP) are a form of passwordless login where users key in a six digit code sent to their email address to log in to their accounts.

Enabling email OTP#
Email authentication methods, including Email OTPs, are enabled by default.

Email OTPs share an implementation with Magic Links. To send an OTP instead of a Magic Link, alter the Magic Link email template. For a hosted Supabase project, go to Email Templates in the Dashboard. For a self-hosted project or local development, see the Email Templates guide.

Modify the template to include the {{ .Token }} variable, for example:

<h2>One time login code</h2>
<p>Please enter this code: {{ .Token }}</p>
By default, a user can only request an OTP once every 60 seconds and they expire after 1 hour. This is configurable via Auth > Providers > Email > Email OTP Expiration. An expiry duration of more than 86400 seconds (one day) is disallowed to guard against brute force attacks. The longer an OTP remains valid, the more time an attacker has to attempt brute force attacks. If the OTP is valid for several days, an attacker might have more opportunities to guess the correct OTP through repeated attempts.

Signing in with email OTP#
Step 1: Send the user an OTP code#
Get the user's email and call the "sign in with OTP" method from your client library.

If the user hasn't signed up yet, they are automatically signed up by default. To prevent this, set the shouldCreateUser option to false.


JavaScript

Dart

Swift

Kotlin

Python
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'valid.email@supabase.io',
  options: {
    // set this to false if you do not want the user to be automatically signed up
    shouldCreateUser: false,
  },
})
If the request is successful, you receive a response with error: null and a data object where both user and session are null. Let the user know to check their email inbox.

{
  "data": {
    "user": null,
    "session": null
  },
  "error": null
}
Step 2: Verify the OTP to create a session#
Provide an input field for the user to enter their one-time code.

Call the "verify OTP" method from your client library with the user's email address, the code, and a type of email:


JavaScript

Swift

Kotlin

Python
const {
  data: { session },
  error,
} = await supabase.auth.verifyOtp({
  email: 'email@example.com',
  token: '123456',
  type: 'email',
})
If successful, the user is now logged in, and you receive a valid session that looks like:

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNjI3MjkxNTc3LCJzdWIiOiJmYTA2NTQ1Zi1kYmI1LTQxY2EtYjk1NC1kOGUyOTg4YzcxOTEiLCJlbWFpbCI6IiIsInBob25lIjoiNjU4NzUyMjAyOSIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6InBob25lIn0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.1BqRi0NbS_yr1f6hnr4q3s1ylMR3c1vkiJ4e_N55dhM",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "LSp8LglPPvf0DxGMSj-vaQ",
  "user": {...}
}


Signing out

Signing out a user

Signing out a user works the same way no matter what method they used to sign in.

Call the sign out method from the client library. It removes the active session and clears Auth data from the storage medium.


JavaScript

Dart

Swift

Kotlin

Python
async function signOut() {
  const { error } = await supabase.auth.signOut()
}
Sign out and scopes#
Supabase Auth allows you to specify three different scopes for when a user invokes the sign out API in your application:

global (default) when all sessions active for the user are terminated.
local which only terminates the current session for the user but keep sessions on other devices or browsers active.
others to terminate all but the current session for the user.
You can invoke these by providing the scope option:


JavaScript

Dart

Kotlin
// defaults to the global scope
await supabase.auth.signOut()
// sign out from the current session only
await supabase.auth.signOut({ scope: 'local' })
Upon sign out, all refresh tokens and potentially other database objects related to the affected sessions are destroyed and the client library removes the session stored in the local storage medium.

Access Tokens of revoked sessions remain valid until their expiry time, encoded in the exp claim. The user won't be immediately logged out and will only be logged out when the Access Token expires.



Error Codes

Learn about the Auth error codes and how to resolve them

Auth error codes#
Supabase Auth can return various errors when using its API. This guide explains how to handle these errors effectively across different programming languages.

Error types#
Supabase Auth errors are generally categorized into two main types:

API Errors: Originate from the Supabase Auth API.
Client Errors: Originate from the client library's state.
Client errors differ by language so do refer to the appropriate section below:


JavaScript

Dart

Swift

Python

Kotlin
All errors originating from the supabase.auth namespace of the client library will be wrapped by the AuthError class.

Error objects are split in a few classes:

AuthApiError -- errors which originate from the Supabase Auth API.
Use isAuthApiError instead of instanceof checks to see if an error you caught is of this type.
CustomAuthError -- errors which generally originate from state in the client library.
Use the name property on the error to identify the class of error received.
Errors originating from the server API classed as AuthApiError always have a code property that can be used to identify the error returned by the server. The status property is also present, encoding the HTTP status code received in the response.

HTTP status codes#
Below are the most common HTTP status codes you might encounter, along with their meanings in the context of Supabase Auth:

403 Forbidden#
Sent out in rare situations where a certain Auth feature is not available for the user, and you as the developer are not checking a precondition whether that API is available for the user.

422 Unprocessable Entity#
Sent out when the API request is accepted, but cannot be processed because the user or Auth server is in a state where it cannot satisfy the request.

429 Too Many Requests#
Sent out when rate-limits are breached for an API. You should handle this status code often, especially in functions that authenticate a user.

500 Internal Server Error#
Indicate that the Auth server's service is degraded. Most often it points to issues in your database setup such as a misbehaving trigger on a schema, function, view or other database object.

501 Not Implemented#
Sent out when a feature is not enabled on the Auth server, and you are trying to use an API which requires it.

Auth error codes table#
The following table provides a comprehensive list of error codes you may encounter when working with Supabase Auth. Each error code is associated with a specific issue and includes a description to help you understand and resolve the problem efficiently.

Error code	Description
anonymous_provider_disabled	
Anonymous sign-ins are disabled.

bad_code_verifier	
Returned from the PKCE flow where the provided code verifier does not match the expected one. Indicates a bug in the implementation of the client library.

bad_json	
Usually used when the HTTP body of the request is not valid JSON.

bad_jwt	
JWT sent in the Authorization header is not valid.

bad_oauth_callback	
OAuth callback from provider to Auth does not have all the required attributes (state). Indicates an issue with the OAuth provider or client library implementation.

bad_oauth_state	
OAuth state (data echoed back by the OAuth provider to Supabase Auth) is not in the correct format. Indicates an issue with the OAuth provider integration.

captcha_failed	
CAPTCHA challenge could not be verified with the CAPTCHA provider. Check your CAPTCHA integration.

conflict	
General database conflict, such as concurrent requests on resources that should not be modified concurrently. Can often occur when you have too many session refresh requests firing off at the same time for a user. Check your app for concurrency issues, and if detected, back off exponentially.

email_address_invalid	
Example and test domains are currently not supported. Use a different email address.

email_address_not_authorized	
Email sending is not allowed for this address as your project is using the default SMTP service. Emails can only be sent to members in your Supabase organization. If you want to send emails to others, set up a custom SMTP provider.

Learn more:

Setting up a custom SMTP provider
email_conflict_identity_not_deletable	
Unlinking this identity causes the user's account to change to an email address which is already used by another user account. Indicates an issue where the user has two different accounts using different primary email addresses. You may need to migrate user data to one of their accounts in this case.

email_exists	
Email address already exists in the system.

email_not_confirmed	
Signing in is not allowed for this user as the email address is not confirmed.

email_provider_disabled	
Signups are disabled for email and password.

flow_state_expired	
PKCE flow state to which the API request relates has expired. Ask the user to sign in again.

flow_state_not_found	
PKCE flow state to which the API request relates no longer exists. Flow states expire after a while and are progressively cleaned up, which can cause this error. Retried requests can cause this error, as the previous request likely destroyed the flow state. Ask the user to sign in again.

hook_payload_invalid_content_type	
Payload from Auth does not have a valid Content-Type header.

hook_payload_over_size_limit	
Payload from Auth exceeds maximum size limit.

hook_timeout	
Unable to reach hook within maximum time allocated.

hook_timeout_after_retry	
Unable to reach hook after maximum number of retries.

identity_already_exists	
The identity to which the API relates is already linked to a user.

identity_not_found	
Identity to which the API call relates does not exist, such as when an identity is unlinked or deleted.

insufficient_aal	
To call this API, the user must have a higher Authenticator Assurance Level. To resolve, ask the user to solve an MFA challenge.

Learn more:

MFA
invalid_credentials	
Login credentials or grant type not recognized.

invite_not_found	
Invite is expired or already used.

manual_linking_disabled	
Calling the supabase.auth.linkUser() and related APIs is not enabled on the Auth server.

mfa_challenge_expired	
Responding to an MFA challenge should happen within a fixed time period. Request a new challenge when encountering this error.

mfa_factor_name_conflict	
MFA factors for a single user should not have the same friendly name.

mfa_factor_not_found	
MFA factor no longer exists.

mfa_ip_address_mismatch	
The enrollment process for MFA factors must begin and end with the same IP address.

mfa_phone_enroll_not_enabled	
Enrollment of MFA Phone factors is disabled.

mfa_phone_verify_not_enabled	
Login via Phone factors and verification of new Phone factors is disabled.

mfa_totp_enroll_not_enabled	
Enrollment of MFA TOTP factors is disabled.

mfa_totp_verify_not_enabled	
Login via TOTP factors and verification of new TOTP factors is disabled.

mfa_verification_failed	
MFA challenge could not be verified -- wrong TOTP code.

mfa_verification_rejected	
Further MFA verification is rejected. Only returned if the MFA verification attempt hook returns a reject decision.

Learn more:

MFA verification hook
mfa_verified_factor_exists	
Verified phone factor already exists for a user. Unenroll existing verified phone factor to continue.

mfa_web_authn_enroll_not_enabled	
Enrollment of MFA Web Authn factors is disabled.

mfa_web_authn_verify_not_enabled	
Login via WebAuthn factors and verification of new WebAuthn factors is disabled.

no_authorization	
This HTTP request requires an Authorization header, which is not provided.

not_admin	
User accessing the API is not admin, i.e. the JWT does not contain a role claim that identifies them as an admin of the Auth server.

oauth_provider_not_supported	
Using an OAuth provider which is disabled on the Auth server.

otp_disabled	
Sign in with OTPs (magic link, email OTP) is disabled. Check your server's configuration.

otp_expired	
OTP code for this sign-in has expired. Ask the user to sign in again.

over_email_send_rate_limit	
Too many emails have been sent to this email address. Ask the user to wait a while before trying again.

over_request_rate_limit	
Too many requests have been sent by this client (IP address). Ask the user to try again in a few minutes. Sometimes can indicate a bug in your application that mistakenly sends out too many requests (such as a badly written useEffect React hook).

Learn more:

React useEffect hook
over_sms_send_rate_limit	
Too many SMS messages have been sent to this phone number. Ask the user to wait a while before trying again.

phone_exists	
Phone number already exists in the system.

phone_not_confirmed	
Signing in is not allowed for this user as the phone number is not confirmed.

phone_provider_disabled	
Signups are disabled for phone and password.

provider_disabled	
OAuth provider is disabled for use. Check your server's configuration.

provider_email_needs_verification	
Not all OAuth providers verify their user's email address. Supabase Auth requires emails to be verified, so this error is sent out when a verification email is sent after completing the OAuth flow.

reauthentication_needed	
A user needs to reauthenticate to change their password. Ask the user to reauthenticate by calling the supabase.auth.reauthenticate() API.

reauthentication_not_valid	
Verifying a reauthentication failed, the code is incorrect. Ask the user to enter a new code.

refresh_token_already_used	
Refresh token has been revoked and falls outside the refresh token reuse interval. See the documentation on sessions for further information.

Learn more:

Auth sessions
refresh_token_not_found	
Session containing the refresh token not found.

request_timeout	
Processing the request took too long. Retry the request.

same_password	
A user that is updating their password must use a different password than the one currently used.

saml_assertion_no_email	
SAML assertion (user information) was received after sign in, but no email address was found in it, which is required. Check the provider's attribute mapping and/or configuration.

saml_assertion_no_user_id	
SAML assertion (user information) was received after sign in, but a user ID (called NameID) was not found in it, which is required. Check the SAML identity provider's configuration.

saml_entity_id_mismatch	
(Admin API.) Updating the SAML metadata for a SAML identity provider is not possible, as the entity ID in the update does not match the entity ID in the database. This is equivalent to creating a new identity provider, and you should do that instead.

saml_idp_already_exists	
(Admin API.) Adding a SAML identity provider that is already added.

saml_idp_not_found	
SAML identity provider not found. Most often returned after IdP-initiated sign-in with an unregistered SAML identity provider in Supabase Auth.

saml_metadata_fetch_failed	
(Admin API.) Adding or updating a SAML provider failed as its metadata could not be fetched from the provided URL.

saml_provider_disabled	
Using Enterprise SSO with SAML 2.0 is not enabled on the Auth server.

Learn more:

Enterprise SSO
saml_relay_state_expired	
SAML relay state is an object that tracks the progress of a supabase.auth.signInWithSSO() request. The SAML identity provider should respond after a fixed amount of time, after which this error is shown. Ask the user to sign in again.

saml_relay_state_not_found	
SAML relay states are progressively cleaned up after they expire, which can cause this error. Ask the user to sign in again.

session_expired	
Session to which the API request relates has expired. This can occur if an inactivity timeout is configured, or the session entry has exceeded the configured timebox value. See the documentation on sessions for more information.

Learn more:

Auth sessions
session_not_found	
Session to which the API request relates no longer exists. This can occur if the user has signed out, or the session entry in the database was deleted in some other way.

signup_disabled	
Sign ups (new account creation) are disabled on the server.

single_identity_not_deletable	
Every user must have at least one identity attached to it, so deleting (unlinking) an identity is not allowed if it's the only one for the user.

sms_send_failed	
Sending an SMS message failed. Check your SMS provider configuration.

sso_domain_already_exists	
(Admin API.) Only one SSO domain can be registered per SSO identity provider.

sso_provider_not_found	
SSO provider not found. Check the arguments in supabase.auth.signInWithSSO().

too_many_enrolled_mfa_factors	
A user can only have a fixed number of enrolled MFA factors.

unexpected_audience	
(Deprecated feature not available via Supabase client libraries.) The request's X-JWT-AUD claim does not match the JWT's audience.

unexpected_failure	
Auth service is degraded or a bug is present, without a specific reason.

user_already_exists	
User with this information (email address, phone number) cannot be created again as it already exists.

user_banned	
User to which the API request relates has a banned_until property which is still active. No further API requests should be attempted until this field is cleared.

user_not_found	
User to which the API request relates no longer exists.

user_sso_managed	
When a user comes from SSO, certain fields of the user cannot be updated (like email).

validation_failed	
Provided parameters are not in the expected format.

weak_password	
User is signing up or changing their password without meeting the password strength criteria. Use the AuthWeakPasswordError class to access more information about what they need to do to make the password pass.

Best practices for error handling#
Always use error.code and error.name to identify errors, not string matching on error messages.
Avoid relying solely on HTTP status codes, as they may change unexpectedly.
Edit this page on GitHub
Is this helpful?

No

Yes
On this page
Auth error codes
Error types
HTTP status codes
403 Forbidden
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
501 Not Implemented
Auth error codes table
Best practices for error handling


Identity Linking

Manage the identities associated with your user

Identity linking strategies#
Currently, Supabase Auth supports 2 strategies to link an identity to a user:

Automatic Linking
Manual Linking
Automatic linking#
Supabase Auth automatically links identities with the same email address to a single user. This helps to improve the user experience when multiple OAuth login options are presented since the user does not need to remember which OAuth account they used to sign up with. When a new user signs in with OAuth, Supabase Auth will attempt to look for an existing user that uses the same email address. If a match is found, the new identity is linked to the user.

In order for automatic linking to correctly identify the user for linking, Supabase Auth needs to ensure that all user emails are unique. It would also be an insecure practice to automatically link an identity to a user with an unverified email address since that could lead to pre-account takeover attacks. To prevent this from happening, when a new identity can be linked to an existing user, Supabase Auth will remove any other unconfirmed identities linked to an existing user.

Users that signed up with SAML SSO will not be considered as targets for automatic linking.

Manual linking (beta)#

JavaScript

Dart

Swift

Kotlin

Python
Supabase Auth allows a user to initiate identity linking with a different email address when they are logged in. To link an OAuth identity to the user, call linkIdentity():

const { data, error } = await supabase.auth.linkIdentity({ provider: 'google' })
In the example above, the user will be redirected to Google to complete the OAuth2.0 flow. Once the OAuth2.0 flow has completed successfully, the user will be redirected back to the application and the Google identity will be linked to the user. You can enable manual linking from your project's authentication configuration options or by setting the environment variable GOTRUE_SECURITY_MANUAL_LINKING_ENABLED: true when self-hosting.

Unlink an identity#

JavaScript

Dart

Swift

Kotlin

Python
You can use getUserIdentities() to fetch all the identities linked to a user. Then, call unlinkIdentity() to unlink the identity. The user needs to be logged in and have at least 2 linked identities in order to unlink an existing identity.

// retrieve all identities linked to a user
const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
if (!identitiesError) {
  // find the google identity linked to the user
  const googleIdentity = identities.identities.find((identity) => identity.provider === 'google')
  if (googleIdentity) {
    // unlink the google identity from the user
    const { data, error } = await supabase.auth.unlinkIdentity(googleIdentity)
  }
}
Frequently asked questions#
How to add email/password login to an OAuth account?#
Call the updateUser({ password: 'validpassword'}) to add email with password authentication to an account created with an OAuth provider (Google, GitHub, etc.).

Can you sign up with email if already using OAuth?#
If you try to create an email account after previously signing up with OAuth using the same email, you'll receive an obfuscated user response with no verification email sent. This prevents user enumeration attacks.

Users

A user in Supabase Auth is someone with a user ID, stored in the Auth schema. Once someone is a user, they can be issued an Access Token, which can be used to access Supabase endpoints. The token is tied to the user, so you can restrict access to resources via RLS policies.

Permanent and anonymous users#
Supabase distinguishes between permanent and anonymous users.

Permanent users are tied to a piece of Personally Identifiable Information (PII), such as an email address, a phone number, or a third-party identity. They can use these identities to sign back into their account after signing out.
Anonymous users aren't tied to any identities. They have a user ID and a personalized Access Token, but they have no way of signing back in as the same user if they are signed out.
Anonymous users are useful for:

E-commerce applications, to create shopping carts before checkout
Full-feature demos without collecting personal information
Temporary or throw-away accounts
See the Anonymous Signins guide to learn more about anonymous users.

Anonymous users do not use the anon role
Just like permanent users, anonymous users use the authenticated role for database access.

The anon role is for those who aren't signed in at all and are not tied to any user ID. We refer to these as unauthenticated or public users.

The user object#
The user object stores all the information related to a user in your application. The user object can be retrieved using one of these methods:

supabase.auth.getUser()
Retrieve a user object as an admin using supabase.auth.admin.getUserById()
A user can sign in with one of the following methods:

Password-based method (with email or phone)
Passwordless method (with email or phone)
OAuth
SAML SSO
An identity describes the authentication method that a user can use to sign in. A user can have multiple identities. These are the types of identities supported:

Email
Phone
OAuth
SAML
A user with an email or phone identity will be able to sign in with either a password or passwordless method (e.g. use a one-time password (OTP) or magic link). By default, a user with an unverified email or phone number will not be able to sign in.

The user object contains the following attributes:

Attributes	Type	Description
id	string	The unique id of the identity of the user.
aud	string	The audience claim.
role	string	The role claim used by Postgres to perform Row Level Security (RLS) checks.
email	string	The user's email address.
email_confirmed_at	string	The timestamp that the user's email was confirmed. If null, it means that the user's email is not confirmed.
phone	string	The user's phone number.
phone_confirmed_at	string	The timestamp that the user's phone was confirmed. If null, it means that the user's phone is not confirmed.
confirmed_at	string	The timestamp that either the user's email or phone was confirmed. If null, it means that the user does not have a confirmed email address and phone number.
last_sign_in_at	string	The timestamp that the user last signed in.
app_metadata	object	The provider attribute indicates the first provider that the user used to sign up with. The providers attribute indicates the list of providers that the user can use to login with.
user_metadata	object	Defaults to the first provider's identity data but can contain additional custom user metadata if specified. Refer to User Identity for more information about the identity object. Don't rely on the order of information in this field. Do not use it in security sensitive context (such as in RLS policies or authorization logic), as this value is editable by the user without any checks.
identities	UserIdentity[]	Contains an object array of identities linked to the user.
created_at	string	The timestamp that the user was created.
updated_at	string	The timestamp that the user was last updated.
is_anonymous	boolean	Is true if the user is an anonymous user.
Resources#
User Management guide



Identities

An identity is an authentication method associated with a user. Supabase Auth supports the following types of identity:

Email
Phone
OAuth
SAML
A user can have more than one identity. Anonymous users have no identity until they link an identity to their user.

The user identity object#
The user identity object contains the following attributes:

Attributes	Type	Description
provider_id	string	The provider id returned by the provider. If the provider is an OAuth provider, the id refers to the user's account with the OAuth provider. If the provider is email or phone, the id is the user's id from the auth.users table.
user_id	string	The user's id that the identity is linked to.
identity_data	object	The identity metadata. For OAuth and SAML identities, this contains information about the user from the provider.
id	string	The unique id of the identity.
provider	string	The provider name.
email	string	The email is a generated column that references the optional email property in the identity_data
created_at	string	The timestamp that the identity was created.
last_sign_in_at	string	The timestamp that the identity was last used to sign in.
updated_at	string	The timestamp that the identity was last updated.



User sessions

Supabase Auth provides fine-grained control over your user's sessions.

Some security sensitive applications, or those that need to be SOC 2, HIPAA, PCI-DSS or ISO27000 compliant will require some sort of additional session controls to enforce timeouts or provide additional security guarantees. Supabase Auth makes it easy to build compliant applications.

What is a session?#
A session is created when a user signs in. By default, it lasts indefinitely and a user can have an unlimited number of active sessions on as many devices.

A session is represented by the Supabase Auth access token in the form of a JWT, and a refresh token which is a unique string.

Access tokens are designed to be short lived, usually between 5 minutes and 1 hour while refresh tokens never expire but can only be used once. You can exchange a refresh token only once to get a new access and refresh token pair.

This process is called refreshing the session.

A session terminates, depending on configuration, when:

The user clicks sign out.
The user changes their password or performs a security sensitive action.
It times out due to inactivity.
It reaches its maximum lifetime.
A user signs in on another device.
Access token (JWT) claims#
Every access token contains a session_id claim, a UUID, uniquely identifying the session of the user. You can correlate this ID with the primary key of the auth.sessions table.

Initiating a session#
A session is initiated when a user signs in. The session is stored in the auth.sessions table, and your app should receive the access and refresh tokens.

There are two flows for initiating a session and receiving the tokens:

Implicit flow
PKCE flow
Limiting session lifetime and number of allowed sessions per user#
This feature is only available on Pro Plans and up.

Supabase Auth can be configured to limit the lifetime of a user's session. By default, all sessions are active until the user signs out or performs some other action that terminates a session.

In some applications, it's useful or required for security to ensure that users authenticate often, or that sessions are not left active on devices for too long.

There are three ways to limit the lifetime of a session:

Time-boxed sessions, which terminate after a fixed amount of time.
Set an inactivity timeout, which terminates sessions that haven't been refreshed within the timeout duration.
Enforce a single-session per user, which only keeps the most recently active session.
To make sure that users are required to re-authenticate periodically, you can set a positive value for the Time-box user sessions option in the Auth settings for your project.

To make sure that sessions expire after a period of inactivity, you can set a positive duration for the Inactivity timeout option in the Auth settings.

You can also enforce only one active session per user per device or browser. When this is enabled, the session from the most recent sign in will remain active, while the rest are terminated. Enable this via the Single session per user option in the Auth settings.

Sessions are not proactively destroyed when you change these settings, but rather the check is enforced whenever a session is refreshed next. This can confuse developers because the actual duration of a session is the configured timeout plus the JWT expiration time. For single session per user, the effect will only be noticed at intervals of the JWT expiration time. Make sure you adjust this setting depending on your needs. We do not recommend going below 5 minutes for the JWT expiration time.

Otherwise sessions are progressively deleted from the database 24 hours after they expire, which prevents you from causing a high load on your project by accident and allows you some freedom to undo changes without adversely affecting all users.

Frequently asked questions#
What are recommended values for access token (JWT) expiration?#
Most applications should use the default expiration time of 1 hour. This can be customized in your project's Auth settings in the Advanced Settings section.

Setting a value over 1 hour is generally discouraged for security reasons, but it may make sense in certain situations.

Values below 5 minutes, and especially below 2 minutes, should not be used in most situations because:

The shorter the expiration time, the more frequently refresh tokens are used, which increases the load on the Auth server.
Time is not absolute. Servers can often be off sync for tens of seconds, but user devices like laptops, desktops or mobile devices can sometimes be off by minutes or even hours. Having too short expiration time can cause difficult-to-debug errors due to clock skew.
Supabase's client libraries always try to refresh the session ahead of time, which won't be possible if the expiration time is too short.
Access tokens should generally be valid for at least as long as the longest running request in your application. This helps you avoid issues where the access token becomes invalid midway through processing.
What is refresh token reuse detection and what does it protect from?#
As your users continue using your app, refresh tokens are being constantly exchanged for new access tokens.

The general rule is that a refresh token can only be used once. However, strictly enforcing this can cause certain issues to arise. There are two exceptions to this design to prevent the early and unexpected termination of user's sessions:

A refresh token can be used more than once within a defined reuse interval. By default this is 10 seconds and we do not recommend changing this value. This exception is granted for legitimate situations such as:
Using server-side rendering where the same refresh token needs to be reused on the server and soon after on the client
To allow some leeway for bugs or issues with serializing access to the refresh token request
If the parent of the currently active refresh token for the user's session is being used, the active token will be returned. This exception solves an important and often common situation:
All clients such as browsers, mobile or desktop apps, and even some servers are inherently unreliable due to network issues. A request does not indicate that they received a response or even processed the response they received.
If a refresh token is revoked after being used only once, and the response wasn't received and processed by the client, when the client comes back online, it will attempt to use the refresh token that was already used. Since this might happen outside of the reuse interval, it can cause sudden and unexpected session termination.
Should the reuse attempt not fall under these two exceptions, the whole session is regarded as terminated and all refresh tokens belonging to it are marked as revoked. You can disable this behavior in the Advanced Settings of the Auth settings page, though it is generally not recommended.

The purpose of this mechanism is to guard against potential security issues where a refresh token could have been stolen from the user, for example by exposing it accidentally in logs that leak (like logging cookies, request bodies or URL params) or via vulnerable third-party servers. It does not guard against the case where a user's session is stolen from their device.

What are the benefits of using access and refresh tokens instead of traditional sessions?#
Traditionally user sessions were implemented by using a unique string stored in cookies that identified the authorization that the user had on a specific browser. Applications would use this unique string to constantly fetch the attached user information on every API call.

This approach has some tradeoffs compared to using a JWT-based approach:

If the authentication server or its database crashes or is unavailable for even a few seconds, the whole application goes down. Scheduling maintenance or dealing with transient errors becomes very challenging.
A failing authentication server can cause a chain of failures across other systems and APIs, paralyzing the whole application system.
All requests that require authentication has to be routed through the authentication, which adds an additional latency overhead to all requests.
Supabase Auth prefers a JWT-based approach using access and refresh tokens because session information is encoded within the short-lived access token, enabling transfer across APIs and systems without dependence on a central server's availability or performance. This approach enhances an application's tolerance to transient failures or performance issues. Furthermore, proactively refreshing the access token allows the application to function reliably even during significant outages.

It's better for cost optimization and scaling as well, as the authentication system's servers and database only handle traffic for this use case.

How to ensure an access token (JWT) cannot be used after a user signs out#
Most applications rarely need such strong guarantees. Consider adjusting the JWT expiry time to an acceptable value. If this is still necessary, you should try to use this validation logic only for the most sensitive actions within your application.

When a user signs out, the sessions affected by the logout are removed from the database entirely. You can check that the session_id claim in the JWT corresponds to a row in the auth.sessions table. If such a row does not exist, it means that the user has logged out.

Note that sessions are not proactively terminated when their maximum lifetime (time-box) or inactivity timeout are reached. These sessions are cleaned up progressively 24 hours after reaching that status. This allows you to tweak the values or roll back changes without causing unintended user friction.

Using HTTP-only cookies to store access and refresh tokens#
This is possible, but only for apps that use the traditional server-only web app approach where all of the application logic is implemented on the server and it returns rendered HTML only.

If your app uses any client side JavaScript to build a rich user experience, using HTTP-Only cookies is not feasible since only your server will be able to read and refresh the session of the user. The browser will not have access to the access and refresh tokens.

Because of this, the Supabase JavaScript libraries provide only limited support. You can override the storage option when creating the Supabase client on the server to store the values in cookies or your preferred storage choice, for example:

import { createClient } from '@supabase/supabase-js'
const supabase = createClient('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', {
  auth: {
    storage: {
      getItem: () => {
        return Promise.resolve('FETCHED_COOKIE')
      },
      setItem: () => {},
      removeItem: () => {},
    },
  },
})
The customStorageObject should implement the getItem, setItem, and removeItem methods from the Storage interface. Async versions of these methods are also supported.

When using cookies to store access and refresh tokens, make sure that the Expires or Max-Age attributes of the cookies is set to a timestamp very far into the future. Browsers will clear the cookies, but the session will remain active in Supabase Auth. Therefore it's best to let Supabase Auth control the validity of these tokens and instruct the browser to always store the cookies indefinitely.


PKCE flow

About authenticating with PKCE flow.

The Proof Key for Code Exchange (PKCE) flow is one of two ways that a user can authenticate and your app can receive the necessary access and refresh tokens.

The flow is an implementation detail handled for you by Supabase Auth, but understanding the difference between PKCE and implicit flow is important for understanding the difference between client-only and server-side auth.

How it works#
After a successful verification, the user is redirected to your app with a URL that looks like this:

https://yourapp.com/...?code=<...>
The code parameter is commonly known as the Auth Code and can be exchanged for an access token by calling exchangeCodeForSession(code).

For security purposes, the code has a validity of 5 minutes and can only be exchanged for an access token once. You will need to restart the authentication flow from scratch if you wish to obtain a new access token.

As the flow is run server side, localStorage may not be available. You may configure the client library to use a custom storage adapter and an alternate backing storage such as cookies by setting the storage option to an object with the following methods:

const customStorageAdapter: SupportedStorage = {
    getItem: (key) => {
    if (!supportsLocalStorage()) {
        // Configure alternate storage
        return null
    }
    return globalThis.localStorage.getItem(key)
    },
    setItem: (key, value) => {
    if (!supportsLocalStorage()) {
        // Configure alternate storage here
        return
    }
    globalThis.localStorage.setItem(key, value)
    },
    removeItem: (key) => {
    if (!supportsLocalStorage()) {
        // Configure alternate storage here
        return
    }
    globalThis.localStorage.removeItem(key)
    },
}
You may also configure the client library to automatically exchange it for a session after a successful redirect. This can be done by setting the detectSessionInUrl option to true.

Putting it all together, your client library initialization may look like this:

const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {
  // ...
  auth: {
    // ...
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: () => Promise.resolve('FETCHED_TOKEN'),
      setItem: () => {},
      removeItem: () => {},
    },
  },
  // ...
})
Limitations#
Behind the scenes, the code exchange requires a code verifier. Both the code in the URL and the code verifier are sent back to the Auth server for a successful exchange.

The code verifier is created and stored locally when the Auth flow is first initiated. That means the code exchange must be initiated on the same browser and device where the flow was started.

Resources#
OAuth 2.0 guide to PKCE flow