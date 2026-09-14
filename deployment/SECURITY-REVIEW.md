# Portal security review and remaining administrator actions

13 September 2026 — review of supplied static project files. Status applies to
the prepared release, not verified production settings.

## Priority: authorization at ticket creation

The portal uses Microsoft sign-in for its UI and profile autofill. The three
HTML forms post directly to Zoho WebToCase. That submission contains editable
form fields and does not carry a Microsoft access token. Auto-filled requester
details, a hidden form, an RSSB-looking email address, a network/VPN restriction
on the portal host, and browser-side validation do not establish that Zoho has
verified the staff identity making a request.

Confirm with the Zoho administrator which restrictions apply at the actual
WebToCase endpoint, including accepted form locations, abuse controls and
requester identity. Record the result before treating staff-only submission as
verified. Do not test by creating unauthorized or nuisance production tickets.

If the available Zoho configuration cannot enforce the required identity,
design an authenticated submission endpoint as a separate reviewed change.
It should validate a token issued for that endpoint (issuer, tenant, audience,
expiry and required scopes/roles), derive requester identity from verified
claims, allow only approved routing choices and keep Zoho credentials on the
server. The current User.Read token is for Microsoft Graph; it must not simply
be reused as authorization for an unrelated API. No such backend is added in
this release. The browser checks a Microsoft token during sign-in and hydration;
it does not add token validation to each Zoho submission or continuously check
revocation while a form remains open.

[OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Checklist mapping

| # | Control | Result / next action | Where |
| --- | --- | --- | --- |
| 1 | Hide API keys | No obvious hardcoded API/client secrets or private keys found in reviewed source. Public app identifiers and generated Zoho embed values remain. Do not remove required embed fields. | Source review; secret inventory remains with administrators |
| 2 | Environment variables | No environment configuration supplied. Frontend variables cannot keep a secret private. Future server secrets need protected storage. | Hosting/backend |
| 3 | Keys in Git | ZIP has no Git history. Inspect the actual repository history and enabled secret-scanning controls. | Repository owner |
| 4 | Admin routes | No custom admin route found. Verify Zoho/Entra/Power Apps admin roles and maintainers. | Service administrators |
| 5 | Authentication | Existing Microsoft popup flow retained. Token-failure, missing-library and logout defects fixed in code; live sign-in validation required. | Portal + Entra |
| 6 | User permissions | Browser guards strengthened. Staff assignment, guest access, MFA/Conditional Access and receiving-service authorization remain unverified. | Entra + Zoho |
| 7 | Input validation | Existing required-field/email/length rules retained; upload checks added. Confirm server rejection of invalid fields and disallowed routing. | Portal + Zoho |
| 8 | XSS protection | Dynamic labels/errors/filenames use text APIs. Raw exceptions removed from logs. Script integrity added. Verify safe ticket rendering and a compatible CSP. | Portal + Zoho + host |
| 9 | SQL injection | No SQL/custom database in this frontend. Review any future backend separately. | Service provider / future backend |
| 10 | Database rules | No database rules supplied. Review ticket/attachment access and Power Apps data permissions. | Zoho + Microsoft 365 |
| 11 | Rate limiting | UI submit lock is not rate limiting. Verify endpoint quotas, throttling and abuse controls; assess Zoho CAPTCHA if needed. | Actual receiving endpoint |
| 12 | Spend cap | No metered paid API integration found in the frontend. Monitor service budgets if usage-based services are introduced. | Service owners |
| 13 | File uploads | Allowed extensions and 20 MB per-file checks added at selection and submit. Verify server content/signature checks, malware scanning, aggregate limits, archive handling and download permissions. | Portal + Zoho |
| 14 | CSRF | No arbitrary frontend-only token added. Determine whether receiving endpoints use ambient credentials and verify appropriate server protections. | Receiving service |
| 15 | CORS | No custom API CORS configuration supplied or changed. CORS does not block ordinary cross-origin HTML form submissions. | API/service administrator |
| 16 | HTTPS | Reviewed external URLs use HTTPS. Verify deployed certificate, redirects and HSTS policy. | Host/network |
| 17 | Security headers | Host configuration unavailable. Report-only CSP review candidate supplied in HEADERS-REVIEW.md; no headers deployed. | Host |
| 18 | Cookies/sessions | Local logout lock, cleanup attempt, retry and stale-response protection implemented. Existing MSAL storage/cookie settings retained pending session-policy review. | Portal + Entra + host |
| 19 | Debug mode | Build/success logging removed; known error codes replace raw exception logging. No new debug bypass or test account in runtime files. | Portal |
| 20 | Production settings | Auth configuration and form contracts preserved. Verify deployed version, redirect URLs, form location/return settings, dependencies and rollback on the host. | Application/service owners |

## Additional actions

- Knowledge Base: verify both app sharing and underlying data access. Staff
  should receive the intended read/use permissions; editing is for maintainers.
- Dependencies: the existing MSAL 3.25.0 and versioned Zoho bundle remain.
  Integrity pins expected bytes; it does not prove those bytes have no known
  vulnerabilities. Complete the supported-version/advisory review separately.
- Session policy: test successful and cancelled popup logout, session expiry,
  shared-PC behavior and two-tab logout. Browser localStorage itself is not
  evidence of a vulnerability; XSS prevention remains important. If browser
  storage is unavailable, the logout marker falls back to the current page.
- Operational recovery: maintain a backup and verify ticket delivery with
  agreed test records. Logs/alerts should exclude tokens and request contents.

## Sources

- [Microsoft token acquisition](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token)
- [Microsoft error handling](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors)
- [Microsoft logout](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/logout)
- [Microsoft MSAL cache guidance](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)
- [Zoho Desk web forms](https://help.zoho.com/portal/en/kb/desk/support-channels/web-form/articles/creating-feedback-widget-and-advanced-web-form)
- [Power Apps sharing](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/share-app)
- [OWASP upload controls](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
