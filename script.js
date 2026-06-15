console.info("RSSB Support Portal auth build: LATEST-UI-STABLE-POPUP-AUTH-FALLBACK-ROUTING-20260614-v14");
/* RSSB Support Portal - Microsoft Entra ID Sign-in + Support Hub */

const msalConfig = {
  auth: {
    clientId: "5e79f919-ca8a-4884-badf-4b88180831b3",
    authority: "https://login.microsoftonline.com/d4034026-d802-4056-b343-5d4d4731884b",
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

const loginRequest = { scopes: ["User.Read"] };
const pca = new msal.PublicClientApplication(msalConfig);
const IT_FORM_ID = "zsWebToCase_1109991000006963130";
const CX_FORM_ID = "zsWebToCase_1109991000022561407";
let currentProfile = null;
let msalReadyPromise = null;
let signInRunning = false;

function $(id) { return document.getElementById(id); }

function ensureMsalReady() {
  if (!msalReadyPromise) msalReadyPromise = pca.initialize();
  return msalReadyPromise;
}

function showAuthError(message, code) {
  const box = $("authError");
  if (!box) return;
  box.textContent = "";
  const title = document.createElement("strong");
  title.textContent = "Sign-in failed";
  box.appendChild(title);
  box.appendChild(document.createTextNode(message || "Please try again."));
  if (code) {
    const extra = document.createElement("span");
    extra.style.opacity = ".8";
    extra.textContent = ` (${code})`;
    box.appendChild(extra);
  }
  box.hidden = false;
}
function clearAuthError() {
  const box = $("authError");
  if (!box) return;
  box.hidden = true;
  box.textContent = "";
}
function setElementHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
  el.style.display = hidden ? "none" : "";
}
function setSignInBusy(busy) {
  [$("btnSignIn"), $("btnGateSignIn")].forEach(btn => {
    if (!btn) return;
    btn.disabled = busy;
    btn.setAttribute("aria-busy", busy ? "true" : "false");
  });
}
function showGate(show) {
  setElementHidden($("authGate"), !show);
}
function hideAllViews() {
  ["workspaceHub", "itSupportView", "cxSupportView"].forEach(id => {
    setElementHidden($(id), true);
  });
}
function normalizeRouteFromHash() {
  const hash = (window.location.hash || "").replace("#", "").trim().toLowerCase();
  if (hash === "it" || hash === "cx" || hash === "hub") return hash;
  return "hub";
}
function updateRoute(route, mode) {
  if (!mode) return;
  const safeRoute = route === "it" || route === "cx" ? route : "hub";
  const target = `#${safeRoute}`;
  if (window.location.hash === target) return;
  if (mode === "push") history.pushState({ view: safeRoute }, "", target);
  else history.replaceState({ view: safeRoute }, "", target);
}
function showWorkspace(options = {}) {
  const historyMode = options.historyMode === undefined ? "replace" : options.historyMode;
  hideAllViews();
  setElementHidden($("workspaceHub"), false);
  updateRoute("hub", historyMode);
  if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}
function showSupportView(type, options = {}) {
  const supportType = type === "cx" ? "cx" : "it";
  const historyMode = options.historyMode === undefined ? "push" : options.historyMode;
  hideAllViews();
  const target = supportType === "cx" ? $("cxSupportView") : $("itSupportView");
  setElementHidden(target, false);
  fillAllZohoFields(currentProfile);
  if (supportType === "cx") initializeCxDependencies();
  updateRoute(supportType, historyMode);
  if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderCurrentRoute() {
  if (!currentProfile) return;
  const route = normalizeRouteFromHash();
  if (route === "it" || route === "cx") showSupportView(route, { historyMode: null, scroll: false });
  else showWorkspace({ historyMode: null, scroll: false });
}

function setSignedInUI({ signedIn, name }) {
  const btnIn = $("btnSignIn");
  const btnOut = $("btnSignOut");
  const pill = $("authPill");
  const authName = $("authName");
  const footerUser = $("footerUser");
  const workspaceUser = $("workspaceUser");
  const headerBadge = $("headerBadge");
  const itHeaderBadge = $("itHeaderBadge");
  const cxHeaderBadge = $("cxHeaderBadge");

  if (btnIn) setElementHidden(btnIn, signedIn);
  if (btnOut) setElementHidden(btnOut, !signedIn);
  if (pill) setElementHidden(pill, !signedIn);
  if (authName) authName.textContent = name || "Signed in";
  if (footerUser) footerUser.textContent = signedIn ? (name || "Signed in") : "Guest";
  if (workspaceUser) workspaceUser.textContent = signedIn ? (name || "RSSB User") : "RSSB User";
  if (headerBadge) headerBadge.textContent = signedIn ? (name || "Enterprise Solutions") : "Enterprise Solutions";
  if (itHeaderBadge) itHeaderBadge.textContent = "IT Support";
  if (cxHeaderBadge) cxHeaderBadge.textContent = "Schemes & Member Support";
}

function getForm(formId) { return document.forms[formId] || document.getElementById(formId); }
function field(formId, name) {
  const form = getForm(formId);
  if (!form) return null;
  return form[name] || form.querySelector(`[name="${CSS.escape(name)}"]`);
}
function fillFormFields(formId, profile) {
  if (!profile) return;
  const displayName = profile.displayName || "";
  const givenName = profile.givenName || (displayName.split(" ")[0] || "");
  const surname = profile.surname || (displayName.split(" ").slice(1).join(" ") || "");
  const email = profile.mail || profile.userPrincipalName || "";
  const first = field(formId, "First Name");
  const last = field(formId, "Contact Name");
  const em = field(formId, "Email");
  if (first) first.value = givenName;
  if (last) last.value = surname;
  if (em) em.value = email;
}
function fillAllZohoFields(profile) {
  fillFormFields(IT_FORM_ID, profile);
  fillFormFields(CX_FORM_ID, profile);
}

async function graphMe(accessToken) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Unable to read profile from Microsoft Graph.");
  return res.json();
}
async function acquireTokenSilentOnly(account) {
  return pca.acquireTokenSilent({ ...loginRequest, account });
}
function getErrorCode(error) {
  return error?.errorCode || error?.error || error?.code || "";
}
function cleanupStaleMsalInteractionArtifacts() {
  const stores = [window.sessionStorage, window.localStorage].filter(Boolean);
  const tempTerms = [
    "interaction.status",
    "interaction_in_progress",
    "request.state",
    "nonce.idtoken",
    "urlhash",
    "origin.uri",
    "renew.status"
  ];
  stores.forEach(store => {
    Object.keys(store).forEach(key => {
      const lower = key.toLowerCase();
      if (lower.startsWith("msal.") && tempTerms.some(term => lower.includes(term))) {
        store.removeItem(key);
      }
    });
  });
}
function clearLegacyRedirectHashIfPresent() {
  const hash = window.location.hash || "";
  if (!hash || hash === "#hub" || hash === "#it" || hash === "#cx") return;
  const lower = hash.toLowerCase();
  if (lower.includes("code=") || lower.includes("error=") || lower.includes("state=")) {
    cleanupStaleMsalInteractionArtifacts();
    history.replaceState(null, "", window.location.pathname);
  }
}
function clearProtectedRouteHashWhenSignedOut() {
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === "#hub" || hash === "#it" || hash === "#cx") {
    history.replaceState(null, "", window.location.pathname);
  }
}
function profileFromAccount(account) {
  const username = account?.username || "";
  const rawName = account?.name || username.split("@")[0] || "RSSB User";
  const nameParts = rawName.trim().split(/\s+/).filter(Boolean);
  return {
    displayName: rawName,
    givenName: nameParts[0] || "",
    surname: nameParts.slice(1).join(" "),
    mail: username.includes("@") ? username : "",
    userPrincipalName: username,
  };
}
function activateSignedInAccount(account, profile) {
  const safeProfile = profile || profileFromAccount(account);
  currentProfile = safeProfile;
  fillAllZohoFields(safeProfile);
  setSignedInUI({ signedIn: true, name: safeProfile.displayName || account?.username || "Signed in" });
  showGate(false);
  return safeProfile;
}
async function loadProfileFromAccount(account) {
  try {
    const token = await acquireTokenSilentOnly(account);
    const me = await graphMe(token.accessToken);
    return activateSignedInAccount(account, me);
  } catch (e) {
    // Do not keep the user stuck on the sign-in screen just because Graph/profile loading failed.
    // Microsoft sign-in already succeeded if we have an MSAL account. Use the account as fallback.
    console.warn("Profile could not be loaded from Graph; continuing with Microsoft account fallback:", e);
    return activateSignedInAccount(account, profileFromAccount(account));
  }
}
async function hydrateUser() {
  await ensureMsalReady();
  clearLegacyRedirectHashIfPresent();

  try {
    const redirectResp = await pca.handleRedirectPromise();
    if (redirectResp?.account) pca.setActiveAccount(redirectResp.account);
  } catch (e) {
    console.warn("Redirect response ignored in popup flow:", e);
    cleanupStaleMsalInteractionArtifacts();
  }

  const accounts = pca.getAllAccounts();
  if (!pca.getActiveAccount() && accounts.length) pca.setActiveAccount(accounts[0]);

  const account = pca.getActiveAccount();
  if (!account) {
    setSignedInUI({ signedIn: false });
    showGate(true);
    hideAllViews();
    clearProtectedRouteHashWhenSignedOut();
    return;
  }

  await loadProfileFromAccount(account);
  renderCurrentRoute();
  if (!window.location.hash) showWorkspace({ historyMode: "replace", scroll: false });
}
async function signIn(options = {}) {
  if (signInRunning) return;
  signInRunning = true;
  setSignInBusy(true);

  try {
    clearAuthError();
    clearLegacyRedirectHashIfPresent();
    await ensureMsalReady();

    const existingAccount = pca.getActiveAccount() || pca.getAllAccounts()[0];
    if (existingAccount) {
      pca.setActiveAccount(existingAccount);
      await loadProfileFromAccount(existingAccount);
      showWorkspace({ historyMode: "replace" });
      return;
    }

    const resp = await pca.loginPopup(loginRequest);
    if (!resp?.account) throw new Error("Microsoft did not return an account after sign-in.");
    pca.setActiveAccount(resp.account);

    if (resp.accessToken) {
      try {
        const me = await graphMe(resp.accessToken);
        activateSignedInAccount(resp.account, me);
      } catch (graphError) {
        console.warn("Graph profile read failed after sign-in; opening hub with account fallback:", graphError);
        activateSignedInAccount(resp.account, profileFromAccount(resp.account));
      }
    } else {
      await loadProfileFromAccount(resp.account);
    }

    showWorkspace({ historyMode: "replace" });
    console.info("Microsoft sign-in completed; support hub is visible.");
  } catch (e) {
    const code = getErrorCode(e);
    console.error("Login failed:", e);

    if (code === "interaction_in_progress" && !options.retry) {
      cleanupStaleMsalInteractionArtifacts();
      signInRunning = false;
      setSignInBusy(false);
      await new Promise(resolve => setTimeout(resolve, 300));
      return signIn({ retry: true });
    }

    if (code === "popup_window_error" || code === "popup_window_timeout") {
      showAuthError("Please allow pop-ups for this site, then try again.", code);
    } else if (code === "user_cancelled") {
      showAuthError("The Microsoft sign-in window was closed before finishing.", code);
    } else if (code === "interaction_in_progress") {
      showAuthError("A previous sign-in attempt was stuck. Refresh this page once, then try again.", code);
      cleanupStaleMsalInteractionArtifacts();
    } else {
      showAuthError("Please try again. If nothing opens, allow pop-ups for this site.", code);
    }
  } finally {
    signInRunning = false;
    setSignInBusy(false);
  }
}
async function signOut() {
  try {
    await ensureMsalReady();
    const account = pca.getActiveAccount();
    await pca.logoutPopup({ account });
  } catch (e) {
    console.warn("Sign out failed:", e);
  } finally {
    currentProfile = null;
    cleanupStaleMsalInteractionArtifacts();
    setSignedInUI({ signedIn: false });
    hideAllViews();
    showGate(true);
    history.replaceState(null, "", window.location.pathname);
  }
}

function wireItSubjectPrefill() {
  const sel = $("issueCategorySelect");
  if (!sel) return;
  sel.addEventListener("change", () => {
    const subject = field(IT_FORM_ID, "Subject");
    if (!subject) return;
    const val = sel.value?.trim();
    if (!val) return;
    const prefix = `${val} | `;
    if (!subject.value || subject.value.includes(" | ")) subject.value = prefix;
    else subject.value = prefix + subject.value;
    subject.focus();
    try { subject.setSelectionRange(subject.value.length, subject.value.length); } catch {}
  });
}

function getCxDependencyData() {
  const raw = $("dependent_field_values_Cases_CX")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { console.warn("Unable to parse CX dependencies", e); return null; }
}
function clearSelect(select, placeholder = "-None-") {
  if (!select) return;
  select.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholder;
  select.appendChild(opt);
}
function populateSelect(select, values) {
  clearSelect(select);
  [...new Set(values || [])].forEach(value => {
    if (!value || value === "-None-") return;
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });
}
function cxScheme() { return document.getElementById("CASECF2"); }
function cxService() { return document.getElementById("CASECF4"); }
function cxIssue() { return document.getElementById("CASECF5"); }
function updateCxServices() {
  const data = getCxDependencyData();
  const scheme = cxScheme();
  const service = cxService();
  const issue = cxIssue();
  if (!data || !scheme || !service || !issue) return;
  const values = data.JSON_VALUES?.CASECF2?.CASECF4?.[scheme.value] || [];
  populateSelect(service, values);
  clearSelect(issue);
  updateCxSubject();
}
function updateCxIssues() {
  const data = getCxDependencyData();
  const service = cxService();
  const issue = cxIssue();
  if (!data || !service || !issue) return;
  const values = data.JSON_VALUES?.CASECF4?.CASECF5?.[service.value] || [];
  populateSelect(issue, values);
  updateCxSubject();
}
function updateCxSubject() {
  const subject = field(CX_FORM_ID, "Subject");
  if (!subject) return;
  const parts = [cxScheme()?.value, cxService()?.value, cxIssue()?.value].filter(Boolean);
  if (!parts.length) return;
  const autoText = parts.join(" - ");
  if (!subject.value || subject.dataset.autoSubject === "true") {
    subject.value = autoText;
    subject.dataset.autoSubject = "true";
  }
}
function initializeCxDependencies() {
  const service = cxService();
  const issue = cxIssue();
  if (service && !service.dataset.initialized) {
    clearSelect(service);
    service.dataset.initialized = "true";
  }
  if (issue && !issue.dataset.initialized) {
    clearSelect(issue);
    issue.dataset.initialized = "true";
  }
}
function wireCxDependencies() {
  const scheme = cxScheme();
  const service = cxService();
  const issue = cxIssue();
  const subject = field(CX_FORM_ID, "Subject");
  if (scheme) scheme.addEventListener("change", updateCxServices);
  if (service) service.addEventListener("change", updateCxIssues);
  if (issue) issue.addEventListener("change", updateCxSubject);
  if (subject) subject.addEventListener("input", () => { subject.dataset.autoSubject = "false"; });
  initializeCxDependencies();
}

// Compatible with Zoho inline onchange="setDependent(this, false)"
function setDependent(obj, isload) {
  if (!obj || !obj.form || obj.form.id !== CX_FORM_ID) return;
  if (obj.id === "CASECF2") updateCxServices();
  if (obj.id === "CASECF4") updateCxIssues();
  if (obj.id === "CASECF5") updateCxSubject();
}
window.setDependent = setDependent;

function showFormError(formType, message) {
  const box = formType === "cx" ? $("cxFormError") : $("itFormError");
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearFormError(formType) {
  const box = formType === "cx" ? $("cxFormError") : $("itFormError");
  if (!box) return;
  box.hidden = true;
  box.textContent = "";
}
function isEmptyField(el) {
  if (!el) return true;
  const value = (el.value || "").trim();
  return value === "" || value === "-None-";
}
function validateEmail(email) {
  return /^([\w_][\w\-_.+'&]*)@(?=.{4,256}$)(([\w]+)([-_]*[\w])*\.)+[a-zA-Z]{2,22}$/.test(email || "");
}
function validateSupportForm(formId, formType) {
  clearFormError(formType);
  const form = getForm(formId);
  if (!form) return false;
  const required = formType === "cx"
    ? [
        ["Contact Name", "Last Name"],
        ["Email", "Email"],
        ["Scheme/Product", "Scheme/Product"],
        ["Service - category", "Service - category"],
        ["Issue Sub Category", "Issue Sub Category"],
        ["Subject", "Subject"],
        ["Description", "Description"]
      ]
    : [
        ["Contact Name", "Last Name"],
        ["Email", "Email"],
        ["Subject", "Title"],
        ["Description", "Description"]
      ];
  for (const [name, label] of required) {
    const el = field(formId, name);
    if (isEmptyField(el)) {
      showFormError(formType, `${label} is required. Please fill it before submitting.`);
      if (el) el.focus();
      return false;
    }
  }
  const email = field(formId, "Email");
  if (email && !validateEmail(email.value)) {
    showFormError(formType, "Please enter a valid email address.");
    email.focus();
    return false;
  }
  const submit = form.querySelector("input[type='submit']");
  if (submit) submit.setAttribute("disabled", "disabled");
  return true;
}
window.validateSupportForm = validateSupportForm;

function zsResetWebForm(webFormId) {
  const form = document.forms[`zsWebToCase_${webFormId}`];
  if (!form) return;
  form.reset();
  form.querySelector("input[type='submit']")?.removeAttribute("disabled");
  fillAllZohoFields(currentProfile);
  if (form.id === CX_FORM_ID) initializeCxDependencies();
}
window.zsResetWebForm = zsResetWebForm;
function zsOpenFileBrowseAttachment(clickEvent) { return true; }
window.zsOpenFileBrowseAttachment = zsOpenFileBrowseAttachment;
function zsRenderBrowseFileAttachment(value, input) {
  if (!input) return;
  const form = input.form;
  const file = input.files && input.files[0];
  const container = form?.querySelector("[id$='zsFileBrowseAttachments']");
  if (!file || !container) return;
  if (file.size / (1024 * 1024) > 20) {
    input.value = "";
    container.textContent = "Maximum allowed file size is 20MB.";
    return;
  }
  container.textContent = `Selected: ${file.name}`;
}
window.zsRenderBrowseFileAttachment = zsRenderBrowseFileAttachment;
function zsChangeMousePointer() {}
window.zsChangeMousePointer = zsChangeMousePointer;

// Some browsers restore disabled submit after back/forward cache. Undo that, because humanity deserves one less weird bug.
window.addEventListener("pageshow", () => {
  [IT_FORM_ID, CX_FORM_ID].forEach(id => getForm(id)?.querySelector("input[type='submit']")?.removeAttribute("disabled"));
});

document.addEventListener("DOMContentLoaded", () => {
  const y = $("year");
  if (y) y.textContent = new Date().getFullYear();
  wireItSubjectPrefill();
  wireCxDependencies();

  $("btnSignIn")?.addEventListener("click", signIn);
  $("btnGateSignIn")?.addEventListener("click", signIn);
  $("btnSignOut")?.addEventListener("click", signOut);
  $("btnChooseIT")?.addEventListener("click", () => showSupportView("it", { historyMode: "push" }));
  $("btnChooseCX")?.addEventListener("click", () => showSupportView("cx", { historyMode: "push" }));
  $("btnBackFromIT")?.addEventListener("click", () => showWorkspace({ historyMode: "push" }));
  $("btnBackFromCX")?.addEventListener("click", () => showWorkspace({ historyMode: "push" }));

  window.addEventListener("popstate", renderCurrentRoute);
  window.addEventListener("hashchange", renderCurrentRoute);

  hydrateUser().catch(e => {
    console.error("Auth hydration failed:", e);
    cleanupStaleMsalInteractionArtifacts();
    setSignedInUI({ signedIn: false });
    hideAllViews();
    showGate(true);
  });
});
