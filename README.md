# form-testing

## v13 clean auth/routing note
- Keeps the latest UI.
- Uses MSAL popup sign-in, matching the previously working authentication approach.
- Avoids a second popup after login by using the login result access token first.
- Adds a safe sign-in lock to prevent duplicate `interaction_in_progress` attempts.
- Uses browser history/hash routing: `#hub`, `#it`, and `#cx`, so browser Back from a form returns to the support selection hub.
