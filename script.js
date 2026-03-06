/* RSSB Support Portal - Microsoft Entra ID Sign-in (MSAL Browser v3+) */

const msalConfig = {
  auth: {
    clientId: "5e79f919-ca8a-4884-badf-4b88180831b3",
    authority: "https://login.microsoftonline.com/d4034026-d802-4056-b343-5d4d4731884b",
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const loginRequest = { scopes: ["User.Read"] };
const pca = new msal.PublicClientApplication(msalConfig);

function $(id) {
  return document.getElementById(id);
}

function setSignedInUI({ signedIn, name }) {
  const btnIn = $("btnSignIn");
  const btnOut = $("btnSignOut");
  const pill = $("authPill");
  const authName = $("authName");

  if (btnIn) btnIn.hidden = signedIn;
  if (btnOut) btnOut.hidden = !signedIn;
  if (pill) pill.hidden = !signedIn;
  if (authName) authName.textContent = name || "Signed in";
}

function showGate(show) {
  const gate = $("authGate");
  if (!gate) return;
  gate.hidden = !show;
}

function findZohoFieldByName(name) {
  const form = document.forms["zsWebToCase_1109991000006963130"];
  if (!form) return null;
  return form[name] || document.querySelector(`#zohoSupportWebToCase [name="${CSS.escape(name)}"]`);
}

function fillZohoFields(profile) {
  const displayName = profile.displayName || "";
  const givenName = profile.givenName || (displayName.split(" ")[0] || "");
  const surname = profile.surname || (displayName.split(" ").slice(1).join(" ") || "");
  const email = profile.mail || profile.userPrincipalName || "";

  const first = findZohoFieldByName("First Name");
  const last = findZohoFieldByName("Contact Name");
  const em = findZohoFieldByName("Email");

  if (first) first.value = givenName;
  if (last) last.value = surname;
  if (em) em.value = email;

  // Optional lock (leave editable by default)
  // [first, last, em].forEach(el => el && (el.readOnly = true));
}

async function graphMe(accessToken) {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Unable to read profile from Microsoft Graph.");
  return res.json();
}

async function acquireToken(account) {
  try {
    return await pca.acquireTokenSilent({ ...loginRequest, account });
  } catch (e) {
    // Fallback to popup if silent fails (e.g., first time)
    return await pca.acquireTokenPopup(loginRequest);
  }
}

function wireSubjectPrefill() {
  const sel = document.getElementById("issueCategorySelect");
  if (!sel) return;

  sel.addEventListener("change", () => {
    const subject = findZohoFieldByName("Subject");
    if (!subject) return;

    const val = sel.value?.trim();
    if (!val) return;

    const prefix = `${val} | `;
    // Only overwrite if empty or still looks like a previous prefix
    if (!subject.value || subject.value.includes(" | ")) {
      subject.value = prefix;
    } else {
      subject.value = prefix + subject.value;
    }

    subject.focus();
    // Move cursor to end
    try {
      subject.setSelectionRange(subject.value.length, subject.value.length);
    } catch {}
  });
}

async function hydrateUser() {
  await pca.initialize();

  // Safe even when using popup (handles redirect return if ever used)
  const redirectResp = await pca.handleRedirectPromise().catch(() => null);
  if (redirectResp?.account) {
    pca.setActiveAccount(redirectResp.account);
  } else {
    const accounts = pca.getAllAccounts();
    if (accounts.length) pca.setActiveAccount(accounts[0]);
  }

  const account = pca.getActiveAccount();
  if (!account) {
    setSignedInUI({ signedIn: false });
    showGate(true);
    return;
  }

  const token = await acquireToken(account);
  const me = await graphMe(token.accessToken);

  fillZohoFields(me);
  setSignedInUI({ signedIn: true, name: me.displayName || account.username });
  showGate(false);
}

async function signIn() {
  try {
    await pca.initialize();
    const resp = await pca.loginPopup(loginRequest);
    pca.setActiveAccount(resp.account);

    const token = await acquireToken(resp.account);
    const me = await graphMe(token.accessToken);

    fillZohoFields(me);
    setSignedInUI({ signedIn: true, name: me.displayName || resp.account.username });
    showGate(false);
  } catch (e) {
    console.error("Login failed:", e);
    alert("Sign-in failed or was cancelled.");
  }
}

async function signOut() {
  try {
    await pca.initialize();
    const account = pca.getActiveAccount();
    await pca.logoutPopup({ account });
  } catch (e) {
    console.warn("Sign out failed:", e);
  } finally {
    setSignedInUI({ signedIn: false });
    showGate(true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireSubjectPrefill();

  const btnIn = $("btnSignIn");
  const btnOut = $("btnSignOut");
  const btnGate = $("btnGateSignIn");

  if (btnIn) btnIn.addEventListener("click", signIn);
  if (btnGate) btnGate.addEventListener("click", signIn);
  if (btnOut) btnOut.addEventListener("click", signOut);

  hydrateUser();
});
