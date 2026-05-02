(function () {
  const namespace = globalThis.UnipaExt || {};
  const { storageKeys, limits } = namespace.constants;
  const { read, write, stableHash, normalizePath } = namespace.storage;
  const { findEditableElements } = namespace.selectors;
  const { renderAutosaveBar, hideAutosaveBar } = namespace.uiHelpers;

  const trackedElements = new Map();
  let saveTimer = null;
  let intervalId = null;

  function getElementValue(element) {
    if (element.matches("[contenteditable='true']")) {
      return element.innerHTML;
    }
    return element.value;
  }

  function setElementValue(element, value) {
    if (element.matches("[contenteditable='true']")) {
      element.innerHTML = value;
      return;
    }
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getFormKey(element) {
    const form = element.closest("form");
    if (!form) {
      return "page";
    }

    const identity = form.getAttribute("id")
      || form.getAttribute("name")
      || Array.from(document.forms).indexOf(form);
    return `form:${stableHash(identity)}`;
  }

  function getFieldKey(element, index) {
    const identity = element.getAttribute("name")
      || element.getAttribute("id")
      || element.getAttribute("aria-label")
      || element.getAttribute("placeholder")
      || index;
    return `field:${stableHash(identity)}`;
  }

  function getPageKey() {
    return normalizePath(location.href);
  }

  function trackElements() {
    const elements = findEditableElements(document);
    elements.forEach((element, index) => {
      if (trackedElements.has(element)) {
        return;
      }

      const metadata = {
        pageKey: getPageKey(),
        formKey: getFormKey(element),
        fieldKey: getFieldKey(element, index)
      };
      trackedElements.set(element, metadata);
      element.addEventListener("input", scheduleSave, { passive: true });
      element.addEventListener("change", scheduleSave, { passive: true });
    });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAll, limits.autosaveDebounceMs);
  }

  function saveAll() {
    return read(storageKeys.autosaveEntries).then((result) => {
      const entries = result[storageKeys.autosaveEntries] || {};
      const now = new Date().toISOString();

      trackedElements.forEach((metadata, element) => {
        const value = getElementValue(element);
        const key = buildDraftKey(metadata);

        if (!value) {
          delete entries[key];
          return;
        }

        entries[key] = {
          ...metadata,
          value,
          url: location.href,
          title: document.title,
          savedAt: now
        };
      });

      pruneOldDrafts(entries);
      return write({ [storageKeys.autosaveEntries]: entries });
    });
  }

  function pruneOldDrafts(entries) {
    const cutoff = Date.now() - limits.maxDraftAgeDays * 24 * 60 * 60 * 1000;
    Object.keys(entries).forEach((key) => {
      const time = Date.parse(entries[key].savedAt || "");
      if (time && time < cutoff) {
        delete entries[key];
      }
    });
  }

  function buildDraftKey(metadata) {
    return `${metadata.pageKey}::${metadata.formKey}::${metadata.fieldKey}`;
  }

  function findCurrentDrafts() {
    const pageKey = getPageKey();
    return read(storageKeys.autosaveEntries).then((result) => {
      const entries = result[storageKeys.autosaveEntries] || {};
      return Object.entries(entries)
        .filter(([, entry]) => entry.pageKey === pageKey)
        .map(([key, entry]) => ({ key, ...entry }));
    });
  }

  function restoreDrafts(drafts) {
    const draftByKey = new Map(drafts.map((draft) => [buildDraftKey(draft), draft]));
    trackedElements.forEach((metadata, element) => {
      const draft = draftByKey.get(buildDraftKey(metadata));
      if (draft && typeof draft.value === "string") {
        setElementValue(element, draft.value);
      }
    });
    hideAutosaveBar();
  }

  function discardDrafts(drafts) {
    return read(storageKeys.autosaveEntries).then((result) => {
      const entries = result[storageKeys.autosaveEntries] || {};
      drafts.forEach((draft) => {
        delete entries[draft.key];
      });
      return write({ [storageKeys.autosaveEntries]: entries }).then(hideAutosaveBar);
    });
  }

  function showRestoreIfNeeded() {
    return findCurrentDrafts().then((drafts) => {
      if (!drafts.length) {
        hideAutosaveBar();
        return;
      }

      renderAutosaveBar(drafts.length, {
        onRestore: () => restoreDrafts(drafts),
        onDiscard: () => discardDrafts(drafts)
      });
    });
  }

  function start() {
    trackElements();
    showRestoreIfNeeded();
    intervalId = setInterval(() => {
      trackElements();
      saveAll();
    }, limits.autosaveIntervalMs);

    const observer = new MutationObserver(trackElements);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("beforeunload", () => {
      saveAll();
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  }

  namespace.autosave = {
    start,
    saveAll,
    findCurrentDrafts
  };

  globalThis.UnipaExt = namespace;
})();
