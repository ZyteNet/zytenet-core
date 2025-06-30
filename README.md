# OAuthyia Core
The core API for the account system and everything that powers OAuthyia's service!

## OAuthyia Core API
`oauthyia-core`  
The main API handling core authentication and account management.

---

# Current Features & Endpoints

### Account Signup & Login
- `POST /v1/account/signup` — Register a new account  
- `POST /v1/account/login` — Log in to an account

### Account Session & Info
- `GET /v1/account/me` — Get logged-in user details  
- `GET /v1/account/profile` — View user profile  
- `POST /v1/account/profile/avatar` — Update profile avatar  
- `POST /v1/account/profile/password` — Change password

### Password Recovery
- `POST /v1/account/forgot` — Request password reset  
- `POST /v1/account/reset` — Reset password with token

### Account Verification
- `POST /v1/account/verify` — Verify account email  
- `POST /v1/account/resend-verification` — Resend verification email

### Session Management
- `POST /v1/account/logout` — Log out from current session  
- `POST /v1/account/refresh` — Refresh auth token

### OAuth Integration
- `GET /v1/account/oauth/:provider` — Initiate OAuth login  
- `GET /v1/account/oauth/:provider/callback` — OAuth callback handler  
- `POST /v1/account/oauth/connect-accounts` — Connect multiple OAuth accounts  
- `POST /v1/account/oauth/connect/:provider` — Connect specific OAuth provider  
- `POST /v1/account/oauth/disconnect/:provider` — Disconnect OAuth provider
