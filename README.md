# RSSB Support Portal

Knowledge Base and interface update — 13 September 2026.

This is the updated working portal. It retains the existing Microsoft sign-in
and three Zoho request forms: IT Support, Schemes & Member Support, and
PowerBuilder / User Requests. A dedicated HR support tile remains deferred.

## Install on the existing portal

Copy the contents of this folder to the existing portal location, preserving
the current hostname, path and resource folder. Include the new `portal-ui.js`
file together with `index.html` and `styles.css`. There is no build step and no
new runtime dependency. Do not change the Entra application configuration or
Zoho routing fields to install this interface update.

The existing `script.js`, `auth-blank.html` and image files are unchanged.
Microsoft sign-in continues to use the current host and path as its redirect
URI. Opening `index.html` directly from disk is not a live sign-in test.

## What changed

- A Knowledge Base strip above the three support cards and a smaller header
  link open the supplied Power Apps app in a new tab.
- A shared blue, white and gold design system replaces accumulated CSS
  overrides. Light and dark modes continue to follow the device preference.
- The login page, header, cards and form presentation use consistent spacing,
  typography and icons. The signed-in name appears once in the header.
- Visible field labels are linked to their inputs, required fields are marked,
  errors identify the affected field, and navigation moves keyboard focus.
- All five existing attachment fields are reachable, selected files can be
  removed individually, and the existing 20 MB limit is retained.
- Resetting the Schemes form clears stale dependent dropdown options.

## Validation and remaining checks

17 isolated regression checks passed, including the original script, routes,
autofill, field validation, dropdowns, reset, attachment controls and error
states. Microsoft/Graph responses and file selections were simulated, and form
POSTs were intercepted: these checks created no tickets.

Automated semantic accessibility checks found no violations in the five views.
40 design-token text/control contrast pairs passed their 4.5:1 or 3:1 targets.
This is not a WCAG certification or a substitute for a rendered-page review.

The connected browser's security policy prevented opening local project files.
Visual layout, native file-picker behavior and real Microsoft/Zoho/Power Apps
access still need validation on the existing hosted portal. See
`RELEASE-NOTES.md` for the short validation checklist and administrator items.

The `validation` folder contains check results only. Test fixtures and mock
authentication code are not included in this project.
