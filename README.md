# RSSB Support Portal

13 September 2026 — glass refinement and focused security fixes (release r2).

Static RSSB staff portal with Microsoft 365 popup sign-in and three separate
Zoho Desk request forms. The Knowledge Base is available in the header and
between the welcome area and service cards.

## What this release changes

- Frosted sign-in panel, header, Knowledge Base strip and service cards; richer
  RSSB blue welcome area, warm-gold details and the original building photo.
- Light and dark palettes follow the device setting. Solid fallbacks apply
  when blur is unavailable or reduced transparency is requested. Form fields
  retain opaque surfaces, accessible labels and clear error messages.
- A cached Microsoft account no longer opens the portal after token acquisition
  fails. Name fallback remains available after a successful token result when
  the profile service is unavailable; Graph 401 is excluded.
- Interrupted logout locks the portal, clears drafts and selected files,
  attempts MSAL cache cleanup and offers a Microsoft sign-out retry. A marker
  containing only logout intent prevents automatic reopening after refresh.
- Browser attachment checks accept documented support file types and enforce
  the existing 20 MB per-file limit at selection and submission. All five
  original named attachment inputs remain.
- Existing external scripts now carry SHA-384 integrity attributes. Logs use
  fixed event names and known error codes, not complete exception objects.

IT Support, Schemes & Member Support and PowerBuilder / User Requests remain.
The dedicated HR tile is deferred; the existing HR payroll category remains.

## Deploy on the existing host

No build step or new runtime package installation is required.

1. Keep a complete backup of the currently deployed release.
2. Stage `index.html`, `styles.css`, `script.js`, `portal-ui.js`,
   `auth-blank.html` and `resource/` together on the existing origin and path.
3. Retain the current Microsoft application and Zoho form configuration.
4. Complete the hosted checks in `RELEASE-NOTES.md` before replacing the live
   release. Opening HTML directly from disk is not a valid sign-in test.
5. Keep documentation and `validation/` with the release archive; they do not
   need to be copied into the public website directory.

For rollback, restore the complete previous deployed release together.

## Verification and remaining work

23 isolated regression groups pass with mocked Microsoft/Graph responses,
simulated attachment selections and intercepted form submissions. Semantic
accessibility checks report no violations across the five views. 76 calculated
contrast pairs pass, including conservative glass/image backdrop bounds.

The connected browser blocked local project preview under its security policy.
Rendered layout, real Microsoft sign-in/logout, Zoho ticket creation and
Power Apps permissions still require hosted validation. Integrity checks need
a real-browser load too: the MSAL hash comes from the exact npm 3.25.0
distribution; direct CDN delivery was unavailable in this environment.

`deployment/SECURITY-REVIEW.md` maps all 20 security checklist items to their
current state and remaining action. Browser guards cannot implement backend
authorization, malware scanning, endpoint rate limits or hosting headers.

Support contact: supportdesk@rssb.rw
