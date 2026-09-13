/* Presentation and accessibility enhancements only.
 * MSAL configuration, tokens, account handling, Zoho mappings and POST actions
 * remain in the original, unchanged script.js and generated form HTML.
 */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const viewIds = ['authGate', 'workspaceHub', 'itSupportView', 'cxSupportView', 'pbSupportView'];
  const headingIds = ['authHeading', 'hubHeading', 'itHeading', 'cxHeading', 'pbHeading'];
  const returnCards = { itSupportView: 'btnChooseIT', cxSupportView: 'btnChooseCX', pbSupportView: 'btnChoosePB' };

  function setHidden(element, hidden) {
    if (element && element.hidden !== hidden) element.hidden = hidden;
  }

  function improveNavigation() {
    let previousView = null;
    const sync = () => {
      const activeId = viewIds.find(id => {
        const view = byId(id);
        return view && !view.hidden;
      });
      if (!activeId) return;
      const heading = byId(headingIds[viewIds.indexOf(activeId)]);
      const skip = byId('skipToContent');
      if (skip && heading) skip.href = `#${heading.id}`;
      const title = activeId === 'workspaceHub' || activeId === 'authGate'
        ? 'RSSB Support Portal'
        : `${heading?.textContent.trim() || 'Support'} | RSSB Support Portal`;
      if (document.title !== title) document.title = title;
      if (previousView && activeId !== previousView) {
        const target = activeId === 'workspaceHub' && returnCards[previousView]
          ? byId(returnCards[previousView]) : heading;
        target?.focus({ preventScroll: true });
      }
      previousView = activeId;
    };
    const observer = new MutationObserver(sync);
    viewIds.forEach(id => {
      const view = byId(id);
      if (view) observer.observe(view, { attributes: true, attributeFilter: ['hidden'] });
    });
    sync();
    const name = byId('authName');
    if (name) {
      const updateName = () => { name.title = name.textContent.trim(); };
      new MutationObserver(updateName).observe(name, { childList: true, characterData: true, subtree: true });
      updateName();
    }
  }

  function improveSignInPresentation() {
    const button = byId('btnGateSignIn');
    const label = button?.querySelector('.signInButtonText');
    if (button && label) {
      const update = () => {
        label.textContent = button.dataset.unavailable === 'true' ? 'Sign-in unavailable'
          : (button.disabled ? 'Signing in…' : 'Sign in with Microsoft');
      };
      new MutationObserver(update).observe(button, { attributes: true, attributeFilter: ['disabled'] });
      update();
    }
    byId('btnReloadSignIn')?.addEventListener('click', () => window.location.reload());
    if (!window.msal?.PublicClientApplication) {
      ['btnGateSignIn', 'btnSignIn'].forEach(id => {
        const signIn = byId(id);
        if (signIn) {
          signIn.dataset.unavailable = 'true';
          signIn.disabled = true;
        }
      });
      const error = byId('authError');
      if (error) {
        error.textContent = 'Microsoft sign-in could not load. Check your connection and refresh this page.';
        setHidden(error, false);
      }
      setHidden(byId('btnReloadSignIn'), false);
    }
  }

  function clearInvalid(form) {
    form.querySelectorAll('[aria-invalid]').forEach(field => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-errormessage');
    });
  }

  function updateAttachments(form, error = '') {
    const slots = [...form.querySelectorAll('.attachmentSlot')];
    const firstEmpty = slots.find(slot => !slot.querySelector('input').files?.length);
    let count = 0;
    slots.forEach(slot => {
      const input = slot.querySelector('input');
      const remove = slot.querySelector('.fileRemove');
      const file = input.files?.[0];
      if (file) count += 1;
      setHidden(slot, !file && slot !== firstEmpty);
      // Keep the original five named Zoho file inputs and their inline handlers.
      input.style.display = 'block';
      setHidden(remove, !file);
      if (file) remove.setAttribute('aria-label', `Remove attachment ${file.name}`);
    });
    const summary = form.querySelector('.attachmentSummary');
    if (summary) {
      summary.textContent = error || (count ? `${count} of 5 files selected.` : '');
      summary.dataset.error = error ? 'true' : 'false';
    }
  }

  function improveForm(form) {
    const panel = form.closest('.panel--form');
    const error = panel?.querySelector('.formError');
    const submit = form.querySelector('input[type="submit"]');
    const submitLabel = submit?.value || 'Submit';
    if (submit) {
      const updateBusy = () => {
        submit.value = submit.disabled ? 'Submitting…' : submitLabel;
        form.setAttribute('aria-busy', submit.disabled ? 'true' : 'false');
      };
      new MutationObserver(updateBusy).observe(submit, { attributes: true, attributeFilter: ['disabled'] });
      updateBusy();
    }
    if (error) {
      new MutationObserver(() => {
        if (error.hidden || !error.textContent.trim()) return;
        const focused = document.activeElement;
        if (form.contains(focused) && focused.matches('input:not([type="submit"]), select, textarea')) {
          clearInvalid(form);
          focused.setAttribute('aria-invalid', 'true');
          focused.setAttribute('aria-errormessage', error.id);
        }
      }).observe(error, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
    }
    ['input', 'change'].forEach(eventName => form.addEventListener(eventName, event => {
      if (event.target.getAttribute('aria-invalid') === 'true') {
        clearInvalid(form);
        setHidden(error, true);
      }
    }));

    form.querySelectorAll('.attachmentSlot').forEach(slot => {
      const input = slot.querySelector('input');
      let sizeError = '';
      // Read the size before the unchanged Zoho handler clears an oversized file.
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        sizeError = file && file.size > 20 * 1024 * 1024
          ? 'This file exceeds 20 MB. Choose a smaller file.' : '';
      }, true);
      input.addEventListener('change', () => updateAttachments(form, sizeError));
      slot.querySelector('.fileRemove')?.addEventListener('click', () => {
        input.value = '';
        sizeError = '';
        updateAttachments(form);
        const next = [...form.querySelectorAll('.attachmentSlot:not([hidden]) input')]
          .find(field => !field.files?.length);
        (next || form.querySelector('.attachmentSlot:not([hidden]) input'))?.focus();
      });
    });

    form.addEventListener('reset', () => {
      // Run after native reset and the existing Zoho reset handler finish.
      queueMicrotask(() => {
        clearInvalid(form);
        setHidden(error, true);
        updateAttachments(form);
        const service = form.querySelector('#CASECF4');
        const issue = form.querySelector('#CASECF5');
        if (service && issue && typeof window.initializeCxDependencies === 'function') {
          delete service.dataset.initialized;
          delete issue.dataset.initialized;
          window.initializeCxDependencies();
        }
      });
    });
    updateAttachments(form);
  }

  document.addEventListener('DOMContentLoaded', () => {
    improveNavigation();
    improveSignInPresentation();
    document.querySelectorAll('.zohoFormWrap form').forEach(improveForm);
  });
})();
