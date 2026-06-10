/* RSSB Support Portal - Microsoft Entra ID Sign-in + Support Hub */

const msalConfig = {
  auth: {
    clientId: "5e79f919-ca8a-4884-badf-4b88180831b3",
    authority: "https://login.microsoftonline.com/d4034026-d802-4056-b343-5d4d4731884b",
    redirectUri: window.location.origin + "/",
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

function $(id) { return document.getElementById(id); }

function showAuthError(message, code) {
  const box = $("authError");
  if (!box) return;
  box.textContent = "";
  const title = document.createElement("strong");
  title.textContent = "Sign-in failed";
  const body = document.createElement("span");
  const safeMessage = message || "Please try again. If nothing opens, allow pop-ups for this site.";
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

async function graphMe(accessToken) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Unable to read profile from Microsoft Graph.");
  return res.json();
}
async function acquireToken(account) {
  try {
    return await pca.acquireTokenSilent({ ...loginRequest, account });
  } catch (e) {
    return await pca.acquireTokenPopup(loginRequest);
  }
}
async function hydrateUser() {
  await pca.initialize();
  const redirectResp = await pca.handleRedirectPromise().catch(() => null);
  if (redirectResp?.account) pca.setActiveAccount(redirectResp.account);
  else {
    const accounts = pca.getAllAccounts();
    if (accounts.length) pca.setActiveAccount(accounts[0]);
  }
  const account = pca.getActiveAccount();
  if (!account) {
    setSignedInUI({ signedIn: false });
    showGate(true);
    hideAllViews();
    return;
  }
  const token = await acquireToken(account);
  const me = await graphMe(token.accessToken);
  currentProfile = me;
  fillAllZohoFields(me);
  setSignedInUI({ signedIn: true, name: me.displayName || account.username });
  showGate(false);
  showWorkspace();
}
async function signIn() {
  try {
    clearAuthError();
    await pca.initialize();
    const resp = await pca.loginPopup(loginRequest);
    pca.setActiveAccount(resp.account);
    const token = await acquireToken(resp.account);
    const me = await graphMe(token.accessToken);
    currentProfile = me;
    fillAllZohoFields(me);
    setSignedInUI({ signedIn: true, name: me.displayName || resp.account.username });
    showGate(false);
    showWorkspace();
  } catch (e) {
    console.error("Login failed:", e);
    showAuthError("Please try again. If nothing opens, allow pop-ups for this site.", (e && (e.errorCode || e.error)));
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
    currentProfile = null;
    setSignedInUI({ signedIn: false });
    hideAllViews();
    showGate(true);
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
