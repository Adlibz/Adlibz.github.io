/* RSSB Support Portal - Microsoft Entra ID Sign-in + Support Hub */

const redirectPath = window.location.pathname.endsWith("/")
  ? window.location.pathname
  : window.location.pathname.replace(/\/[^/]*$/, "/");
const appRedirectUri = `${window.location.origin}${redirectPath || "/"}`;

const AZURE_TENANT_ID = "d4034026-d802-4056-b343-5d4d4731884b";
const AZURE_CLIENT_ID = "5e79f919-ca8a-4884-badf-4b88180831b3";
const AUTHORITY = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0`;
const AUTH_SCOPES = "openid profile email User.Read";
const SESSION_KEY = "rssb_support_portal_session_v2";
const PKCE_KEY = "rssb_support_portal_pkce_v2";

const IT_FORM_ID = "zsWebToCase_1109991000006963130";
const CX_FORM_ID = "zsWebToCase_1109991000022561407";
let currentProfile = null;

function $(id) { return document.getElementById(id); }

function showAuthError(message, code) {
  const box = $("authError");
  if (!box) return;
  box.textContent = "";
  const title = document.createElement("strong");
  title.textContent = "Sign-in failed";
  const body = document.createElement("span");
  const safeMessage = message || "Please try again. If sign-in still fails, contact supportdesk@rssb.rw.";
  body.textContent = code ? `${safeMessage} (${String(code)})` : safeMessage;
  box.append(title, body);
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
function showGate(show) {
  setElementHidden($("authGate"), !show);
}
function hideAllViews() {
  ["workspaceHub", "itSupportView", "cxSupportView"].forEach(id => {
    setElementHidden($(id), true);
  });
}
function showWorkspace(options = {}) {
  const { updateHistory = true, scroll = true } = options;
  hideAllViews();
  setElementHidden($("workspaceHub"), false);
  if (updateHistory) history.replaceState({ view: "hub" }, "", window.location.pathname);
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}
function showSupportView(type, options = {}) {
  const { updateHistory = true, scroll = true } = options;
  hideAllViews();
  const normalizedType = type === "cx" ? "cx" : "it";
  const target = normalizedType === "cx" ? $("cxSupportView") : $("itSupportView");
  setElementHidden(target, false);
  fillAllZohoFields(currentProfile);
  if (normalizedType === "cx") initializeCxDependencies();
  if (updateHistory) history.pushState({ view: normalizedType }, "", `#${normalizedType}`);
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}
function goBackToWorkspace() {
  const view = history.state && history.state.view;
  if (view === "it" || view === "cx") {
    history.back();
  } else {
    showWorkspace();
  }
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

  if (btnIn) btnIn.hidden = signedIn;
  if (btnOut) btnOut.hidden = !signedIn;
  if (pill) pill.hidden = !signedIn;
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

function randomBase64Url(bytes = 32) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return base64UrlFromBytes(values);
}
function base64UrlFromBytes(bytes) {
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlFromBytes(new Uint8Array(digest));
}
function safeJsonParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}
function getPkcePayload() {
  return safeJsonParse(sessionStorage.getItem(PKCE_KEY)) || safeJsonParse(localStorage.getItem(PKCE_KEY));
}
function setPkcePayload(payload) {
  const text = JSON.stringify(payload);
  sessionStorage.setItem(PKCE_KEY, text);
  localStorage.setItem(PKCE_KEY, text);
}
function clearPkcePayload() {
  sessionStorage.removeItem(PKCE_KEY);
  localStorage.removeItem(PKCE_KEY);
}
function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
  clearPkcePayload();
}
function getStoredProfile() {
  const session = safeJsonParse(localStorage.getItem(SESSION_KEY));
  if (!session || !session.profile) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session.profile;
}
function storeProfile(profile, expiresInSeconds = 3600) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    profile,
    expiresAt: Date.now() + Math.max(600, expiresInSeconds - 300) * 1000,
  }));
}
function parseAuthParams() {
  const params = new URLSearchParams();
  const hash = window.location.hash && window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const search = window.location.search && window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
  [hash, search].filter(Boolean).forEach(part => {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  });
  return params;
}
function decodeJwtPayload(token) {
  const part = String(token || "").split(".")[1];
  if (!part) return {};
  const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
function profileFromClaims(claims = {}) {
  const displayName = claims.name || claims.preferred_username || "RSSB User";
  const parts = String(displayName).trim().split(/\s+/);
  return {
    displayName,
    givenName: claims.given_name || parts[0] || "",
    surname: claims.family_name || parts.slice(1).join(" ") || "",
    mail: claims.email || claims.preferred_username || claims.upn || "",
    userPrincipalName: claims.preferred_username || claims.upn || claims.email || "",
  };
}
async function graphMe(accessToken) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Unable to read profile from Microsoft Graph.");
  return res.json();
}
async function exchangeAuthorizationCode(code, verifier) {
  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: appRedirectUri,
    code_verifier: verifier,
    scope: AUTH_SCOPES,
  });
  const res = await fetch(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const codeText = data.error || "token_exchange_failed";
    const desc = data.error_description || "Microsoft returned the sign-in code, but the portal could not exchange it for a session.";
    throw Object.assign(new Error(desc), { errorCode: codeText });
  }
  return data;
}
async function processMicrosoftReturn() {
  const params = parseAuthParams();
  if (params.has("error")) {
    throw Object.assign(new Error(params.get("error_description") || "Microsoft sign-in was cancelled or failed."), { errorCode: params.get("error") });
  }
  const code = params.get("code");
  if (!code) return null;

  const state = params.get("state");
  const pkce = getPkcePayload();
  if (!pkce?.codeVerifier || !pkce?.state || state !== pkce.state) {
    throw Object.assign(new Error("The sign-in session expired. Please try again."), { errorCode: "auth_state_mismatch" });
  }

  const token = await exchangeAuthorizationCode(code, pkce.codeVerifier);
  clearPkcePayload();
  history.replaceState({ view: "hub" }, document.title, appRedirectUri);

  const claims = decodeJwtPayload(token.id_token);
  if (pkce.nonce && claims.nonce && claims.nonce !== pkce.nonce) {
    throw Object.assign(new Error("The Microsoft sign-in response could not be verified."), { errorCode: "nonce_mismatch" });
  }

  let profile = profileFromClaims(claims);
  if (token.access_token) {
    try { profile = await graphMe(token.access_token); }
    catch (e) { console.warn("Graph profile lookup failed; using ID token profile instead.", e); }
  }
  storeProfile(profile, Number(token.expires_in || 3600));
  return profile;
}
async function startMicrosoftSignIn() {
  if (!window.isSecureContext) {
    showAuthError("Please open the portal using HTTPS before signing in.", "https_required");
    return;
  }
  const codeVerifier = randomBase64Url(64);
  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  setPkcePayload({ codeVerifier, state, nonce, createdAt: Date.now(), redirectUri: appRedirectUri });

  const authorize = new URL(`${AUTHORITY}/authorize`);
  authorize.search = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    response_type: "code",
    redirect_uri: appRedirectUri,
    response_mode: "fragment",
    scope: AUTH_SCOPES,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  window.location.assign(authorize.toString());
}
async function hydrateUser() {
  let profile = null;
  const params = parseAuthParams();

  try {
    if (params.has("code") || params.has("error")) {
      profile = await processMicrosoftReturn();
    } else {
      profile = getStoredProfile();
    }
  } catch (e) {
    console.error("Microsoft sign-in completion failed:", e);
    clearStoredSession();
    showAuthError("Microsoft sign-in returned, but the portal could not complete the session. Please try again or contact supportdesk@rssb.rw.", e?.errorCode || e?.error || "auth_failed");
    try { history.replaceState({}, document.title, appRedirectUri); } catch {}
    profile = null;
  }

  if (!profile) {
    setSignedInUI({ signedIn: false });
    showGate(true);
    hideAllViews();
    return;
  }

  currentProfile = profile;
  fillAllZohoFields(profile);
  setSignedInUI({ signedIn: true, name: profile.displayName || profile.userPrincipalName || "RSSB User" });
  clearAuthError();
  showGate(false);
  showWorkspace({ updateHistory: true, scroll: false });
}
async function signIn() {
  try {
    clearAuthError();
    await startMicrosoftSignIn();
  } catch (e) {
    console.error("Microsoft sign-in failed:", e);
    showAuthError("Please try again. If sign-in still fails, contact supportdesk@rssb.rw.", e?.errorCode || e?.error || "auth_start_failed");
  }
}
async function signOut() {
  currentProfile = null;
  clearStoredSession();
  setSignedInUI({ signedIn: false });
  hideAllViews();
  showGate(true);
  try { history.replaceState({}, document.title, appRedirectUri); } catch {}
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
  const currentYear = new Date().getFullYear();
  const y = $("year");
  const ay = $("authYear");
  if (y) y.textContent = currentYear;
  if (ay) ay.textContent = currentYear;
  wireItSubjectPrefill();
  wireCxDependencies();

  $("btnSignIn")?.addEventListener("click", signIn);
  $("btnGateSignIn")?.addEventListener("click", signIn);
  $("btnSignOut")?.addEventListener("click", signOut);
  $("btnChooseIT")?.addEventListener("click", () => showSupportView("it"));
  $("btnChooseCX")?.addEventListener("click", () => showSupportView("cx"));
  $("btnBackFromIT")?.addEventListener("click", goBackToWorkspace);
  $("btnBackFromCX")?.addEventListener("click", goBackToWorkspace);

  window.addEventListener("popstate", () => {
    if (!currentProfile) return;
    const hash = window.location.hash.replace("#", "");
    if (hash === "it" || hash === "cx") {
      showSupportView(hash, { updateHistory: false, scroll: true });
    } else {
      showWorkspace({ updateHistory: false, scroll: true });
    }
  });

  hydrateUser().catch(e => {
    console.error("Auth hydration failed:", e);
    setSignedInUI({ signedIn: false });
    hideAllViews();
    showGate(true);
  });
});
