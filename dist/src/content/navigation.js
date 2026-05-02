(function () {
  const namespace = globalThis.UnipaExt || {};
  const { storageKeys, limits } = namespace.constants;
  const { read, write } = namespace.storage;
  const { getPageTitle } = namespace.selectors;
  const { renderNavigation } = namespace.uiHelpers;

  function getCurrentEntry() {
    return {
      url: location.href,
      title: getPageTitle(),
      visitedAt: new Date().toISOString()
    };
  }

  function isSamePage(left, right) {
    try {
      const leftUrl = new URL(left.url);
      const rightUrl = new URL(right.url);
      return leftUrl.origin === rightUrl.origin
        && leftUrl.pathname === rightUrl.pathname
        && leftUrl.search === rightUrl.search
        && leftUrl.hash === rightUrl.hash;
    } catch (error) {
      return left.url === right.url;
    }
  }

  function updateHistory() {
    return read(storageKeys.navigationHistory).then((result) => {
      const current = getCurrentEntry();
      const existing = result[storageKeys.navigationHistory] || [];
      const deduped = existing.filter((entry) => !isSamePage(entry, current));
      const next = [current, ...deduped].slice(0, limits.navigationHistorySize);
      return write({ [storageKeys.navigationHistory]: next }).then(() => next);
    });
  }

  function getHistory() {
    return read(storageKeys.navigationHistory).then((result) => (
      result[storageKeys.navigationHistory] || []
    ));
  }

  function goBack(history) {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    const fallback = history.find((entry) => entry.url !== location.href);
    if (fallback) {
      location.href = fallback.url;
    }
  }

  function goTo(history, index) {
    const entry = history[index];
    if (entry && entry.url !== location.href) {
      location.href = entry.url;
    }
  }

  function render(history) {
    renderNavigation(history, {
      onBack: () => goBack(history),
      onGo: (index) => goTo(history, index)
    });
  }

  function start() {
    return updateHistory().then(render);
  }

  namespace.navigation = {
    start,
    updateHistory,
    getHistory
  };

  globalThis.UnipaExt = namespace;
})();
