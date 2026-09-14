# RSSB Support Portal

14 September 2026 — monitor sizing and readability update (release r3).

Static RSSB staff portal with Microsoft 365 popup sign-in, three separate
Zoho Desk request forms and the Knowledge Base in the header and hub.

## What r3 changes

- At browser viewport widths of 1600 CSS pixels and above, the shared page and
  sign-in shells grow to 1440–1520 px, including their side padding. The hub,
  header and forms use larger text and controls suited to wider windows.
- Service cards use 20–22 px headings, 16 px descriptions and larger icons;
  heading-to-description spacing is rebalanced.
- Desktop sign-in steps use 36 px numbered circles and 15 px labels. On wide
  monitor windows, these grow to 40 px circles and 16 px labels.
- Desktop footer text is 14 px, increasing to 15 px on wide monitor windows.
- The desktop hero blends the original building photo continuously into its
  blue background. The photo overlay preserves readable text contrast.
- IT Issue Category starts with the existing placeholder, then DocuSign and
  QT Connect. All remaining options retain their previous order and values.

Existing CSS rules are retained. The additions begin at 901 px for desktop
steps, footers and hero blending, and at 1600 px for the wider layout. No added
CSS rule applies at or below 900 px. Browser zoom naturally changes the CSS
viewport used by these rules.

The glass treatment, device-following light/dark palettes, Knowledge Base,
three services and r2 session/upload fixes remain. The dedicated HR tile is
still deferred; the existing HR payroll category remains.

## Update the GitHub Pages test site

No build step or new runtime package installation is required.

1. Keep a backup of the currently deployed release.
2. If the test site already runs r2, replace `index.html` and `styles.css` from
   this archive. Otherwise copy the full runtime set: `index.html`, `styles.css`,
   `script.js`, `portal-ui.js`, `auth-blank.html` and `resource/`.
3. Keep the existing Microsoft and Zoho configuration and use the same origin
   and path. The stylesheet URL has a new release query to refresh cached CSS.
4. Check the monitor at 100% Chrome zoom, the normal Dell view and a phone.
   Verify both themes, the login steps, footer and IT category order.
5. Keep documentation and `validation/` with the archive; they do not need to
   be copied into the public website directory.

For rollback, restore the complete previous deployed release together.

## Verification

- 23 existing isolated regression groups passed with mocked Microsoft/Graph
  responses and intercepted form submissions. Semantic accessibility checks
  reported no violations across the five views.
- All pre-existing CSS declarations match r2. The new desktop declarations
  parse successfully; calculated shell widths retain the existing laptop cap
  below 1600 px and reach 1520 px on wide windows.
- 78 calculated contrast pairs passed, including a conservative bound for
  the new hero gradient and decorative highlight.
- Apart from the requested IT option order and stylesheet cache query, the
  complete HTML matches r2. Runtime scripts, callback and images are byte-identical
  to r2. Original form values, routing and Microsoft configuration are retained.

These are source, isolated DOM and mathematical checks. They do not establish
rendered layout, live Microsoft authentication or ticket delivery. The browser
preview limitation remains, so actual display checks use the hosted test site.

`RELEASE-NOTES.md` describes this update and retains r2 history.
`deployment/SECURITY-REVIEW.md` retains the security checklist review. Hosting
and Linux server work remain deferred.

Support contact: supportdesk@rssb.rw
