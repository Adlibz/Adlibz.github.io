# Release notes

## r3 — Monitor sizing and readability

14 September 2026. Approved after review of the monitor, sign-in steps and
IT category screenshots, with Chrome zoom confirmed at 100%.

### Interface changes

| Area | Standard desktop | Wide viewport, 1600 CSS px and above |
| --- | --- | --- |
| Page shell | Existing 1240 px cap | Fluid 1440–1520 px cap, including padding |
| Card headings and descriptions | Existing sizing | 20–22 px headings and 16 px descriptions |
| Card icon boxes | Existing sizing | 56 px boxes with 28 px icons |
| Sign-in step circles / labels | 36 px / 15 px | 40 px / 16 px |
| Footer text | 14 px | 15 px |
| Header, Knowledge Base and forms | Existing sizing | Larger supporting text and controls |

The hero photo starts beneath the opaque part of a continuous blue gradient,
removing the hard vertical join on desktop. The rightmost image overlay is
80% opaque; the contrast calculation also includes the decorative highlight.

The existing phone/tablet styling is retained through 900 CSS px. Desktop
step, footer and hero adjustments start at 901 px. Wider shell and content
scaling begins at 1600 px. These are browser viewport widths, not physical
monitor sizes; zoom and operating-system scaling affect the available viewport.

### IT category order

1. -Select- (placeholder)
2. DocuSign
3. QT Connect
4. Outlook issue
5. Network / Internet issue
6. Printer issue
7. Hardware issue
8. Software / Installation
9. Account / Password
10. Access / Permission
11. Other

Only the option order changes. Existing option values and title-prefill logic
are retained. The placeholder remains the default after opening/resetting.

### Verification and deployment

The existing 23 isolated regression groups passed. Source comparisons confirm
all earlier CSS declarations remain, all other HTML matches r2 except the
stylesheet cache query, and all runtime scripts, callback and images are
byte-identical to r2. All 78 calculated contrast pairs meet their text/control
targets. Detailed results are in `validation/`.

Source and calculated-width checks are not rendered-browser validation.
After uploading to GitHub Pages, review login, hub and forms on the monitor at
100% Chrome zoom, the usual Dell view and a phone; check the two themes, steps,
footer and category order. Use the same hosting origin and path so the existing
Microsoft redirect configuration remains applicable.

Runtime changes: `index.html` and `styles.css` only. Documentation and validation
results are updated. The stylesheet cache query is `20260914-monitor-r3`.
This archive is ready to upload; it has not been deployed from this environment.
Linux hosting and server-header work remain deferred.

---

## Glass refinement and focused security fixes

13 September 2026 — r2, following the Knowledge Base/interface update.

### Interface

The sign-in page restores a frosted panel over the original RSSB building
photograph. The signed-in hub gains a blue welcome panel, subtle glass on the
header and service cards, stronger Montserrat headings, soft surface highlights
and warm-gold arrow details. The Knowledge Base retains its strip and header
link. Exactly three services remain; dedicated HR support is still deferred.

Light mode uses white glass and opaque fallbacks; dark mode uses layered navy
and softer light text. Both retain solid form controls. Blur is limited to a
small set of surfaces. Reduced transparency, reduced motion and forced colors
receive explicit styles. Secondary light-theme text was darkened and image
overlays strengthened following the composite contrast calculation.

Responsive rules retain stacked cards and forms on narrow screens. Account
names wrap on mobile; card text columns can shrink without overflowing.
Existing labels, errors and focus navigation remain. Rendered layout, zoom and
assistive-technology review remain required.

### Confirmed defects addressed

| Area | New behavior |
| --- | --- |
| Cached account after token failure | Token failures reach the sign-in gate. A cached profile cannot substitute for successful token acquisition. |
| Profile service failure | Name/email fallback works after a successful token result, except when Graph returns 401. |
| Session renewal | Explicit Sign in can open the existing Microsoft popup flow when silent acquisition requires interaction. Network failures do not grant access. |
| Incomplete logout | The portal locks, clears drafts/files, attempts documented MSAL cache cleanup and offers retry. It does not report successful Microsoft logout after an error. |
| Refresh and open tabs | A non-sensitive pending/done logout marker prevents automatic re-entry. Explicit sign-in can reopen the portal. Delayed profile results cannot reactivate a logged-out view. |
| Signed-out UI actions | Navigation and validation entry points reject attempts to open or submit while signed out. These are UI guards, not backend authorization. |
| Missing Microsoft script | The UI remains recoverable without an uncaught constructor reference error. |
| Upload feedback | Extension and size checks run on selection and before ordinary submission. The receiving service must independently validate and scan content. |
| Diagnostics | Raw exception objects and informational build/sign-in logs are removed. Fixed event names and allowlisted error codes remain. |
| Script integrity | SHA-384 checks added to existing versioned Microsoft and Zoho script URLs; versions and URLs remain unchanged. |

Allowed attachment extensions: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`,
`.bmp`, `.tif`, `.tiff`, `.heic`, `.heif`, `.doc`, `.docx`, `.xls`, `.xlsx`,
`.ppt`, `.pptx`, `.odt`, `.ods`, `.odp`, `.rtf`, `.csv`, `.txt`, `.log`, `.json`,
`.xml`, `.eml`, `.msg`, `.zip`. Unsupported files receive a visible error.
Archives, legacy Office files and email attachments still need service-side
scanning. An allowed extension is not proof of safe content.

### Preserved integrations

Microsoft library version, tenant/client configuration, redirect URI, popup
flow, cache configuration and requested User.Read scope are unchanged. Error
and logout handling was deliberately modified to fix the defects above;
script.js is therefore no longer byte-identical to the baseline.

All three forms retain their IDs, POST action, encoding, hidden routing values,
named fields, option values, length limits and inline integration handlers.
The original callback page and images remain byte-identical. Knowledge Base
URLs, routes, category dependencies and HR payroll remain. No new runtime
dependency or server endpoint was introduced.

### Verification

- 23 isolated regression groups pass: routes, autofill, IT validation and
  intercepted submission, CX dependencies/reset, PowerBuilder subjects, five
  attachments, logout recovery, token errors and cross-tab logout.
- Automated WCAG-tagged semantic checks report no violations across login,
  hub and three forms. Rendering-dependent checks are excluded.
- 76 calculated contrast pairs pass their 4.5:1 text or 3:1 control targets;
  the lowest checked normal-text pair is 4.56:1. This includes conservative
  black/white composite bounds, not a rendered-browser contrast audit.
- Form/configuration preservation, callback/images, unique IDs, labels, local
  asset paths, script syntax and stylesheet syntax pass.
- MSAL 3.25.0 exposes the cache-clearing API used here. Its integrity hash
  matches that exact npm distribution. Zoho's hash was calculated from the
  existing CDN response, which permits cross-origin loading.

Microsoft/Graph and account storage were simulated, file selections were
simulated and POSTs intercepted. These results do not establish live sign-in,
service-side authorization or ticket delivery. No penetration test or complete
dependency vulnerability scan was performed.

### Hosted checks before release

1. Confirm both external scripts load with their integrity checks. Review
   login, hub and all forms in light and dark modes using a normal staff browser.
2. Check 360, 390, 768, 1024, 1366, 1440 and 1920 px, 200% zoom, long account
   names, keyboard focus, native file pickers and reduced transparency.
3. Sign in, refresh each route and use Back/Forward. Verify autofill and session
   renewal with an expired session. Check profile-service failure separately.
4. Sign out normally and with the popup deliberately closed. Confirm drafts
   clear, retry is offered, refresh stays locked and another open tab locks.
   Then sign in explicitly. Verify Microsoft session termination separately
   from the local portal lock.
5. Submit one agreed test ticket per form. Confirm department, fields,
   attachments and return behavior. Exercise category dependencies and reset.
6. Test supported/unsupported file types, the 20 MB boundary and five slots
   against Zoho's actual per-file and aggregate upload policies.
7. Confirm both Knowledge Base links work for ordinary staff, with data and
   editing permissions restricted to the intended audiences.

### Files changed

index.html, styles.css, script.js, portal-ui.js, README.md, RELEASE-NOTES.md,
validation/, and new deployment/ review documentation.

This release is prepared for review/deployment. It has not been published to
support.rssb.rw from this environment.
