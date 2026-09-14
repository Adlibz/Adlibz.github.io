// RSSB Support Portal — glass and focused session hardening, September 2026.
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
const pca = window.msal?.PublicClientApplication ? new msal.PublicClientApplication(msalConfig) : null;
const IT_FORM_ID = "zsWebToCase_1109991000006963130";
const CX_FORM_ID = "zsWebToCase_1109991000022561407";
const PB_FORM_ID = "zsWebToCase_1109991000032744608";
let currentProfile = null;
let msalReadyPromise = null;
let signInRunning = false;
let signOutRunning = false;
let authGeneration = 0;
let pendingSignOutAccount = null;
let localSignOutState = "";
// Stores only logout intent, never an account, token, or request contents.
const SIGN_OUT_KEY = `rssb.support.signed-out.${msalConfig.auth.clientId}`;
const SAFE_ERROR_CODES = new Set([
  "interaction_required", "login_required", "consent_required", "no_tokens_found",
  "interaction_in_progress", "user_cancelled", "popup_window_error", "popup_window_timeout",
  "monitor_popup_timeout", "monitor_window_timeout", "no_network_connectivity",
  "post_request_failed", "get_request_failed", "temporarily_unavailable",
  "library_unavailable", "portal_signin_interrupted", "cache_clear_unavailable"
]);
function portalError(code) { const error = new Error(code); error.errorCode = code; return error; }
function safeErrorCode(error) { const code = getErrorCode(error); return SAFE_ERROR_CODES.has(code) ? code : "unknown_error"; }
function logPortalEvent(event, error) {
  // Do not log full MSAL/Graph exceptions, claims, account data, or request URLs.
  console.warn(`[RSSB Support] ${event}: ${safeErrorCode(error)}`);
}
function getLocalSignOutState() {
  try { return window.localStorage.getItem(SIGN_OUT_KEY) || localSignOutState; }
  catch (_) { return localSignOutState; }
}
function setLocalSignOutState(value) {
  localSignOutState = value;
  try {
    if (value) window.localStorage.setItem(SIGN_OUT_KEY, value);
    else window.localStorage.removeItem(SIGN_OUT_KEY);
  } catch (_) { /* Current-page lock still applies if browser storage is unavailable. */ }
}
function needsInteractiveSignIn(error) {
  return (typeof window.msal?.InteractionRequiredAuthError === "function" && error instanceof msal.InteractionRequiredAuthError)
    || ["interaction_required", "login_required", "consent_required", "no_tokens_found"].includes(getErrorCode(error));
}
function showAuthStatus(message, retrySignOut = false) {
  const status = $("authStatus");
  if (status) { status.textContent = message; status.hidden = !message; }
  setElementHidden($("btnRetrySignOut"), !retrySignOut);
}
function clearPortalSession(clearForms = false) {
  currentProfile = null;
  setSignedInUI({ signedIn: false });
  hideAllViews();
  showGate(true);
  clearProtectedRouteHashWhenSignedOut();
  if (clearForms) {
    [IT_FORM_ID, CX_FORM_ID, PB_FORM_ID].forEach(id => {
      const form = getForm(id);
      form?.reset();
      form?.querySelectorAll("input[type='file']").forEach(input => { input.value = ""; });
      form?.querySelector("input[type='submit']")?.removeAttribute("disabled");
    });
  }
}
function showLocalSignOutState() {
  clearPortalSession();
  const pending = getLocalSignOutState() === "pending";
  showAuthStatus(pending
    ? "Your portal is locked. Microsoft sign-out did not finish. Please try signing out again."
    : "You are signed out of this portal.", pending);
}

function $(id) { return document.getElementById(id); }

function ensureMsalReady() {
  if (!pca) return Promise.reject(portalError("library_unavailable"));
  if (!msalReadyPromise) msalReadyPromise = pca.initialize();
  return msalReadyPromise;
}

function showAuthError(message, code) {
  code = SAFE_ERROR_CODES.has(code) ? code : "";
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
function setSignInBusy(busy, action = "signin") {
  [$("btnSignIn"), $("btnGateSignIn")].forEach(btn => {
    if (!btn) return;
    btn.dataset.busyAction = action;
    btn.disabled = busy;
    btn.setAttribute("aria-busy", busy ? "true" : "false");
  });
}
function showGate(show) {
  setElementHidden($("authGate"), !show);
}
function hideAllViews() {
  ["workspaceHub", "itSupportView", "cxSupportView", "pbSupportView"].forEach(id => {
    setElementHidden($(id), true);
  });
}
function normalizeRouteFromHash() {
  const hash = (window.location.hash || "").replace("#", "").trim().toLowerCase();
  if (hash === "it" || hash === "cx" || hash === "pb" || hash === "hub") return hash;
  return "hub";
}
function updateRoute(route, mode) {
  if (!mode) return;
  const safeRoute = route === "it" || route === "cx" || route === "pb" ? route : "hub";
  const target = `#${safeRoute}`;
  if (window.location.hash === target) return;
  if (mode === "push") history.pushState({ view: safeRoute }, "", target);
  else history.replaceState({ view: safeRoute }, "", target);
}
function showWorkspace(options = {}) {
  if (!currentProfile || getLocalSignOutState()) { clearPortalSession(); return; }
  const historyMode = options.historyMode === undefined ? "replace" : options.historyMode;
  hideAllViews();
  setElementHidden($("workspaceHub"), false);
  updateRoute("hub", historyMode);
  if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}
function showSupportView(type, options = {}) {
  if (!currentProfile || getLocalSignOutState()) { clearPortalSession(); return; }
  const supportType = type === "cx" ? "cx" : (type === "pb" ? "pb" : "it");
  const historyMode = options.historyMode === undefined ? "push" : options.historyMode;
  hideAllViews();
  const target = supportType === "cx" ? $("cxSupportView") : (supportType === "pb" ? $("pbSupportView") : $("itSupportView"));
  setElementHidden(target, false);
  fillAllZohoFields(currentProfile);
  if (supportType === "cx") initializeCxDependencies();
  updateRoute(supportType, historyMode);
  if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderCurrentRoute() {
  if (!currentProfile) return;
  const route = normalizeRouteFromHash();
  if (route === "it" || route === "cx" || route === "pb") showSupportView(route, { historyMode: null, scroll: false });
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
  const pbHeaderBadge = $("pbHeaderBadge");

  if (btnIn) setElementHidden(btnIn, signedIn);
  if (btnOut) setElementHidden(btnOut, !signedIn);
  if (pill) setElementHidden(pill, !signedIn);
  if (authName) authName.textContent = name || "Signed in";
  if (footerUser) footerUser.textContent = signedIn ? (name || "Signed in") : "Guest";
  if (workspaceUser) workspaceUser.textContent = signedIn ? (name || "RSSB User") : "RSSB User";
  if (headerBadge) headerBadge.textContent = signedIn ? (name || "Enterprise Solutions") : "Enterprise Solutions";
  if (itHeaderBadge) itHeaderBadge.textContent = "IT Support";
  if (cxHeaderBadge) cxHeaderBadge.textContent = "Schemes & Member Support";
  if (pbHeaderBadge) pbHeaderBadge.textContent = "PowerBuilder / User Requests";
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
  fillFormFields(PB_FORM_ID, profile);
}

async function graphMe(accessToken) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 401) throw portalError("interaction_required");
  if (!res.ok) throw new Error("Profile service unavailable");
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
  if (!hash || hash === "#hub" || hash === "#it" || hash === "#cx" || hash === "#pb") return;
  const lower = hash.toLowerCase();
  if (lower.includes("code=") || lower.includes("error=") || lower.includes("state=")) {
    cleanupStaleMsalInteractionArtifacts();
    history.replaceState(null, "", window.location.pathname);
  }
}
function clearProtectedRouteHashWhenSignedOut() {
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === "#hub" || hash === "#it" || hash === "#cx" || hash === "#pb") {
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
function activateSignedInAccount(account, profile, generation = authGeneration) {
  if (generation !== authGeneration || signOutRunning) throw portalError("portal_signin_interrupted");
  setLocalSignOutState("");
  showAuthStatus("");
  const safeProfile = profile || profileFromAccount(account);
  currentProfile = safeProfile;
  fillAllZohoFields(safeProfile);
  setSignedInUI({ signedIn: true, name: safeProfile.displayName || account?.username || "Signed in" });
  showGate(false);
  return safeProfile;
}
async function loadProfileFromAccount(account) {
  const generation = authGeneration;
  // An account entry alone is not a successful token check. Let auth failures
  // reach the caller; only profile-service failures may use the name fallback.
  const token = await acquireTokenSilentOnly(account);
  if (!token?.accessToken) throw portalError("no_tokens_found");
  let profile;
  try { profile = await graphMe(token.accessToken); }
  catch (error) {
    if (needsInteractiveSignIn(error)) throw error;
    logPortalEvent("profile_fallback", error);
    profile = profileFromAccount(account);
  }
  return activateSignedInAccount(account, profile, generation);
}

async function hydrateUser() {
  await ensureMsalReady();
  clearLegacyRedirectHashIfPresent();
  if (getLocalSignOutState()) { showLocalSignOutState(); return; }

  try {
    const redirectResp = await pca.handleRedirectPromise();
    if (redirectResp?.account) pca.setActiveAccount(redirectResp.account);
  } catch (e) {
    logPortalEvent("redirect_response_unavailable", e);
    cleanupStaleMsalInteractionArtifacts();
  }

  if (getLocalSignOutState()) { showLocalSignOutState(); return; }
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
  if (signInRunning || signOutRunning) return;
  const generation = authGeneration;
  signInRunning = true;
  setSignInBusy(true);

  try {
    clearAuthError();
    showAuthStatus("");
    clearLegacyRedirectHashIfPresent();
    await ensureMsalReady();

    const existingAccount = pca.getActiveAccount() || pca.getAllAccounts()[0];
    if (existingAccount && !getLocalSignOutState()) {
      pca.setActiveAccount(existingAccount);
      try {
        await loadProfileFromAccount(existingAccount);
        showWorkspace({ historyMode: "replace" });
        return;
      } catch (error) {
        // This function runs from an explicit sign-in click. Renew interactively
        // only when Microsoft indicates that user interaction is needed.
        if (!needsInteractiveSignIn(error)) throw error;
      }
    }

    const resp = await pca.loginPopup(getLocalSignOutState()
      ? { ...loginRequest, prompt: "select_account" } : loginRequest);
    if (!resp?.account) throw new Error("Microsoft did not return an account after sign-in.");
    pca.setActiveAccount(resp.account);

    if (resp.accessToken) {
      try {
        const me = await graphMe(resp.accessToken);
        activateSignedInAccount(resp.account, me, generation);
      } catch (graphError) {
        if (needsInteractiveSignIn(graphError) || getErrorCode(graphError) === "portal_signin_interrupted") throw graphError;
        logPortalEvent("profile_fallback", graphError);
        activateSignedInAccount(resp.account, profileFromAccount(resp.account), generation);
      }
    } else {
      await loadProfileFromAccount(resp.account);
    }

    showWorkspace({ historyMode: "replace" });

  } catch (e) {
    const code = getErrorCode(e);
    logPortalEvent("sign_in_failed", e);
    clearPortalSession();

    if (code === "portal_signin_interrupted") return;
    if (code === "interaction_in_progress" && !options.retry) {
      cleanupStaleMsalInteractionArtifacts();
      signInRunning = false;
      setSignInBusy(false);
      await new Promise(resolve => setTimeout(resolve, 300));
      return signIn({ retry: true });
    }

    if (["popup_window_error", "popup_window_timeout", "monitor_popup_timeout"].includes(code)) {
      showAuthError("Please allow pop-ups for this site, then try again.", code);
    } else if (code === "user_cancelled") {
      showAuthError("The Microsoft sign-in window was closed before finishing.", code);
    } else if (code === "interaction_in_progress") {
      showAuthError("A previous sign-in attempt was stuck. Refresh this page once, then try again.", code);
      cleanupStaleMsalInteractionArtifacts();
    } else if (needsInteractiveSignIn(e)) {
      showAuthError("Please sign in again to verify your Microsoft session.", code);
    } else {
      showAuthError("We could not verify your Microsoft session. Check your connection and try signing in again.", code);
    }
    if (getLocalSignOutState() === "pending") setElementHidden($("btnRetrySignOut"), false);
  } finally {
    signInRunning = false;
    if (!signOutRunning) setSignInBusy(false);
  }
}
async function signOut() {
  if (signOutRunning) return;
  signOutRunning = true;
  authGeneration += 1;
  setLocalSignOutState("pending");
  pendingSignOutAccount = pendingSignOutAccount || pca?.getActiveAccount() || pca?.getAllAccounts()[0] || null;
  clearPortalSession(true);
  clearAuthError();
  showAuthStatus("Signing out of Microsoft…");
  setSignInBusy(true, "signout");
  const retry = $("btnRetrySignOut");
  if (retry) retry.disabled = true;
  let completed = false;
  try {
    await ensureMsalReady();
    await pca.logoutPopup({ account: pendingSignOutAccount });
    completed = true;
  } catch (error) {
    logPortalEvent("sign_out_incomplete", error);
    // The versioned MSAL API clears this application's cache for this account.
    // Do not delete other applications' storage or pretend server logout worked.
    try {
      if (typeof pca?.clearCache !== "function") throw portalError("cache_clear_unavailable");
      await pca.clearCache(pendingSignOutAccount ? { account: pendingSignOutAccount } : undefined);
    } catch (cacheError) { logPortalEvent("local_cache_clear_incomplete", cacheError); }
  } finally {
    try { pca?.setActiveAccount(null); }
    catch (error) { logPortalEvent("active_account_clear_incomplete", error); }
    setLocalSignOutState(completed ? "done" : "pending");
    clearPortalSession();
    showLocalSignOutState();
    if (completed) pendingSignOutAccount = null;
    signOutRunning = false;
    setSignInBusy(false);
    if (retry) retry.disabled = false;
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

function wirePbSubjectPrefill() {
  const sel = $("pbIssueCategorySelect");
  if (!sel) return;
  const subject = field(PB_FORM_ID, "Subject");
  if (subject) subject.addEventListener("input", () => { subject.dataset.autoSubject = "false"; });
  sel.addEventListener("change", () => {
    const subject = field(PB_FORM_ID, "Subject");
    if (!subject) return;
    const val = sel.value?.trim();
    if (!val) return;
    const autoText = `PowerBuilder / User Requests - ${val}`;
    if (!subject.value || subject.dataset.autoSubject === "true") {
      subject.value = autoText;
      subject.dataset.autoSubject = "true";
    }
  });
}

function getCxDependencyData() {
  const raw = $("dependent_field_values_Cases_CX")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { logPortalEvent("dependent_options_unavailable", e); return null; }
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
  const box = formType === "cx" ? $("cxFormError") : (formType === "pb" ? $("pbFormError") : $("itFormError"));
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearFormError(formType) {
  const box = formType === "cx" ? $("cxFormError") : (formType === "pb" ? $("pbFormError") : $("itFormError"));
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
// Client-side upload checks provide early feedback. The receiving service must
// independently validate content, enforce limits and scan attachments.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_EXTENSIONS = Object.freeze(["pdf", "png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "heic", "heif", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "csv", "txt", "log", "json", "xml", "eml", "msg", "zip"]);
function getAttachmentError(file) {
  if (!file) return "";
  if (file.size > MAX_ATTACHMENT_BYTES) return "This file exceeds 20 MB. Choose a smaller file.";
  const extension = (file.name || "").split(".").pop().toLowerCase();
  if (!(file.name || "").includes(".") || !ATTACHMENT_EXTENSIONS.includes(extension)) {
    return "This file type is not supported. Use a screenshot, document, text/log, email file or ZIP archive.";
  }
  return "";
}
window.portalAttachmentPolicy = Object.freeze({
  accept: ATTACHMENT_EXTENSIONS.map(extension => `.${extension}`).join(","),
  check: getAttachmentError
});
function validateSupportForm(formId, formType) {
  clearFormError(formType);
  const form = getForm(formId);
  if (!form) return false;
  if (!currentProfile || getLocalSignOutState()) {
    clearPortalSession();
    showAuthError("Please sign in before submitting a request.");
    return false;
  }
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
        ["Subject", formType === "pb" ? "Subject" : "Title"],
        ["Description", "Description"]
      ];
  if (formType === "pb" && isEmptyField($("pbIssueCategorySelect"))) {
    showFormError(formType, "Issue Category is required. Please select the request category before submitting.");
    $("pbIssueCategorySelect")?.focus();
    return false;
  }
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
  for (const input of form.querySelectorAll("input[type='file']")) {
    const error = getAttachmentError(input.files?.[0]);
    if (error) { showFormError(formType, error); input.focus(); return false; }
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
  const subject = form.querySelector(`[name="Subject"]`);
  if (subject) delete subject.dataset.autoSubject;
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
  const error = getAttachmentError(file);
  if (error) {
    input.value = "";
    container.textContent = error;
    return;
  }
  container.textContent = `Selected: ${file.name}`;
}
window.zsRenderBrowseFileAttachment = zsRenderBrowseFileAttachment;
function zsChangeMousePointer() {}
window.zsChangeMousePointer = zsChangeMousePointer;

// Some browsers restore disabled submit after back/forward cache. Undo that, because humanity deserves one less weird bug.
window.addEventListener("pageshow", () => {
  [IT_FORM_ID, CX_FORM_ID, PB_FORM_ID].forEach(id => getForm(id)?.querySelector("input[type='submit']")?.removeAttribute("disabled"));
});

document.addEventListener("DOMContentLoaded", () => {
  const y = $("year");
  if (y) y.textContent = new Date().getFullYear();
  wireItSubjectPrefill();
  wirePbSubjectPrefill();
  wireCxDependencies();

  $("btnSignIn")?.addEventListener("click", signIn);
  $("btnGateSignIn")?.addEventListener("click", signIn);
  $("btnSignOut")?.addEventListener("click", signOut);
  $("btnRetrySignOut")?.addEventListener("click", signOut);
  $("btnChooseIT")?.addEventListener("click", () => showSupportView("it", { historyMode: "push" }));
  $("btnChooseCX")?.addEventListener("click", () => showSupportView("cx", { historyMode: "push" }));
  $("btnChoosePB")?.addEventListener("click", () => showSupportView("pb", { historyMode: "push" }));
  $("btnBackFromIT")?.addEventListener("click", () => showWorkspace({ historyMode: "push" }));
  $("btnBackFromCX")?.addEventListener("click", () => showWorkspace({ historyMode: "push" }));
  $("btnBackFromPB")?.addEventListener("click", () => showWorkspace({ historyMode: "push" }));

  window.addEventListener("popstate", renderCurrentRoute);
  window.addEventListener("hashchange", renderCurrentRoute);

  hydrateUser().catch(e => {
    if (getErrorCode(e) === "portal_signin_interrupted") return;
    logPortalEvent("session_verification_failed", e);
    currentProfile = null;
    cleanupStaleMsalInteractionArtifacts();
    setSignedInUI({ signedIn: false });
    hideAllViews();
    showGate(true);
    clearProtectedRouteHashWhenSignedOut();
    if (getErrorCode(e) === "library_unavailable") {
      showAuthError("Microsoft sign-in could not load. Check your connection and refresh this page.");
    } else {
      showAuthError("Please sign in to verify your Microsoft session.", getErrorCode(e));
    }
  });
});
window.addEventListener("storage", event => {
  if (event.key === SIGN_OUT_KEY && event.newValue) {
    authGeneration += 1;
    localSignOutState = event.newValue;
    clearPortalSession(true);
    showLocalSignOutState();
  }
});
