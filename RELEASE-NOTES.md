# Knowledge Base and interface update

13 September 2026 — implemented in the existing portal project.

## Implemented scope

| Area | Result |
| --- | --- |
| Knowledge Base | Compact strip between the welcome section and support cards; persistent link in the signed-in header. Both use the supplied URL and open a new tab with `noopener noreferrer`. |
| Service options | IT Support, Schemes & Member Support and PowerBuilder / User Requests remain. The dedicated HR tile is deferred; the existing HR payroll category remains. |
| UI and navigation | Shorter copy, consistent SVG icons, one signed-in account display, balanced cards, simpler login presentation and retained separate form routes. Desktop form guidance stays available in a sticky sidebar. |
| Light theme | White surfaces, dark blue text, defined field borders, visible buttons and readable helper text. |
| Dark theme | Layered navy surfaces, softer light text, legible inputs, visible borders and balanced blue accents. Device preference still selects the theme. |
| Accessibility | Page titles, semantic headings, a skip link, explicit form labels, required markers, error associations, focus handling, 44 px primary controls, CSS reduced-motion and forced-color support. |
| Responsiveness | Flexible header, single-column support cards on smaller screens, stacked mobile forms, wrapping labels and navigation. The account name remains available on mobile. |
| Bugs fixed | Previously hidden attachment pickers become reachable; individual removal and size feedback are available. CX Reset clears stale child options. The initial sign-in page stays visible while authentication initializes, with recovery guidance if its library cannot load. |
| Performance | Styles consolidated from approximately 102 KB to 26 KB. Existing assets and external libraries retained; no new runtime dependency. |
| Safe implementation | Original `script.js`, callback HTML, images, form actions, field names, hidden values, option lists, attachment names and inline integration handlers preserved. |

## Files changed

- `index.html`: approved layout, Knowledge Base links, metadata and accessible labels.
- `styles.css`: consolidated tokens, component styles and responsive themes.
- `portal-ui.js`: new, isolated presentation helpers for focus, labels/errors,
  loading states, attachment controls and dependent-field reset.
- `README.md`: current installation and validation guidance.
- `RELEASE-NOTES.md` and `validation/`: implementation notes and check results.

## Checks completed

The original authentication/business-logic script and callback page were
compared byte for byte. All three forms were compared for POST action, method,
encoding, form identity, hidden field values, named fields, option values,
length limits and inline event handlers. All matched the uploaded baseline.
Original image bytes were retained. No duplicate IDs or missing field labels
were found, and both Knowledge Base links match the supplied URL.

17 regression groups passed in an isolated DOM environment, exercising login
and logout presentation, callback and refresh handling, Back/Forward, account
autofill, all three routes, validation, category cascading, reset, attachments,
duplicate-submit locking and error states. Microsoft/Graph and file-selection
boundaries were mocked; POST actions were intercepted. These checks do not
establish that live authentication or ticket creation succeeded.

Automated WCAG-tagged semantic rules reported no violations across login, hub,
IT, CX and PowerBuilder views. Rendering-dependent rules were excluded. Of 40
checked solid-color token pairs, normal-text pairs were at least 4.77:1 and
tested control/focus pairs exceeded 3:1. Actual image overlays, native controls,
zoom, rendered contrast and screen-reader behavior need a browser review.

## Live validation on the existing host

The connected browser blocked local portal URLs and files under its security
policy, so screenshots and rendered layout checks could not be completed here.

1. Sign in with a normal RSSB staff account. Check autofill in all three forms,
   refresh a form, use Back and Forward, then sign out and sign in again.
2. Open both Knowledge Base links and confirm the app is shared with that
   account. Leave a partly completed request open while opening the link.
3. Submit one agreed test ticket per form and confirm the correct Zoho
   department, fields and attachments, including the existing return behavior.
4. Check five attachments, individual removal, oversized-file rejection,
   Reset, and the Scheme → Service → Issue sequence using real browser controls.
5. Review light/dark mode at 360, 390, 768, 1024, 1366, 1440 and 1920 px;
   verify keyboard navigation, focus visibility, 200% zoom, wrapping and scrolling.

## Defensive security review

No credentials, tokens or new authentication permissions were introduced.
New links use `noopener noreferrer`; dynamic labels and file feedback use
text operations rather than HTML injection. Test mocks are excluded from the
release archive. Existing authentication and connection configuration was
deliberately retained.

The following require administrator verification; no security configuration
was changed in this update:

- **Potentially high impact if absent:** the ZIP implements a client-side
  sign-in gate, but cannot demonstrate server-side authorization of Zoho
  submissions. Confirm that the intended staff-only restrictions are enforced
  at the appropriate server/service/network boundary. Hiding a form is not
  server-side authorization. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- **Session and dependency hardening review:** the existing MSAL cache uses
  localStorage and the page loads third-party scripts. Review cache/session
  policy, supported library versions, CSP and script integrity controls with
  the hosting/Entra owners. Local storage alone is not evidence of a vulnerability;
  Microsoft treats its safety as dependent on preventing XSS and related issues.
  Apply any change only after compatibility testing.
  [Microsoft MSAL caching guidance](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)
- **Existing sign-out fallback:** the original code returns to the login view
  even when the Microsoft logout popup reports an error. Confirm that blocked
  or cancelled logout does not leave an unexpected reusable session. This
  behavior was retained because changing it requires authentication testing.
- **Knowledge Base access:** app sharing and data-source permissions are
  controlled in Power Apps/Microsoft 365 and must be checked there. Adding the
  portal link does not grant those permissions.
  [Microsoft app-sharing guidance](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/share-app)

No live Microsoft sign-in, Zoho ticket creation, Power Apps authorization check,
server-side penetration test or dependency vulnerability scan was performed.
