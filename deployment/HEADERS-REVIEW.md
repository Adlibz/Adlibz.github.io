# Hosting headers: review candidate

No hosting configuration was supplied and no server changes were made. Confirm
the actual server/proxy/CDN for support.rssb.rw before translating this into
IIS, Nginx or another host's configuration.

## Low-impact header review

| Header | Candidate / condition |
| --- | --- |
| X-Content-Type-Options | nosniff; first verify correct MIME types for JS/CSS/images. |
| Referrer-Policy | strict-origin-when-cross-origin; validate Zoho form-location checks and redirects. |
| Strict-Transport-Security | Choose a host-approved max-age after confirming all portal/callback paths work over HTTPS. Review subdomains separately before includeSubDomains or preload. |
| Content-Security-Policy | Start in report-only mode using the candidate below; inspect violations and refine before enforcement. |

## CSP report-only candidate

Set this as an HTTP response header on the staging host. It is intentionally
report-only: the current inline form handlers will produce reports. The policy
must not be switched to enforcement as-is. Migrate those handlers to equivalent
external listeners (or review narrowly scoped hashes), preserve their behavior
and re-test sign-in, category controls, file selection, reset and submission.

```text
Content-Security-Policy-Report-Only: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://static.zohocdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://static.zohocdn.com; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; frame-src 'self' https://login.microsoftonline.com; form-action 'self' https://desk.zoho.com; frame-ancestors 'self';
```

This is based on visible dependencies, not captured production network traffic.
Review any additional Microsoft/Zoho hosts observed during complete live flows.
Review intentional embedding before restricting frame-ancestors. With no
reporting endpoint configured, inspect policy warnings in browser developer
tools. Add an approved reporting endpoint only after reviewing report privacy.

Do not place Report-Only or frame-ancestors in a meta tag: they require HTTP
headers. Test popup sign-in before applying cross-origin isolation headers.
Keep the current callback/origin unchanged while validating this release.

## Verify before marking complete

Inspect response headers from the actual deployed host, including redirects
and the callback page. Check ordinary staff sign-in/logout, Graph profile load,
all three Zoho form posts, attachment selection and both Knowledge Base links.
An enforced CSP can limit which form destinations this page uses; it does not
make Zoho verify Microsoft requester identity or stop direct calls to Zoho.

[OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
[OWASP HTTP headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
