(function () {
  const namespace = globalThis.UnipaExt || {};

  function getChromeStorage() {
    if (!globalThis.chrome || !chrome.storage || !chrome.storage.local) {
      return null;
    }
    return chrome.storage.local;
  }

  function isContextInvalidated(error) {
    return error && typeof error.message === "string" && error.message.includes("Extension context invalidated");
  }

  function read(keys) {
    const storage = getChromeStorage();
    if (!storage) {
      return Promise.resolve({});
    }
    return storage.get(keys).catch((error) => {
      if (isContextInvalidated(error)) {
        return {};
      }
      throw error;
    });
  }

  function write(items) {
    const storage = getChromeStorage();
    if (!storage) {
      return Promise.resolve();
    }
    return storage.set(items).catch((error) => {
      if (isContextInvalidated(error)) {
        return;
      }
      throw error;
    });
  }

  function remove(keys) {
    const storage = getChromeStorage();
    if (!storage) {
      return Promise.resolve();
    }
    return storage.remove(keys).catch((error) => {
      if (isContextInvalidated(error)) {
        return;
      }
      throw error;
    });
  }

  function stableHash(value) {
    let hash = 5381;
    const input = String(value || "");
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 33) ^ input.charCodeAt(index);
    }
    return (hash >>> 0).toString(36);
  }

  function normalizePath(urlLike) {
    try {
      const fallback = globalThis.location ? location.href : "https://unipa.invalid/";
      const url = new URL(urlLike, fallback);
      return `${url.origin}${url.pathname}`;
    } catch (error) {
      if (globalThis.location) {
        return `${location.origin}${location.pathname}`;
      }
      return "https://unipa.invalid/";
    }
  }

  function getSettings() {
    const { storageKeys, defaults } = namespace.constants;
    return read(storageKeys.settings).then((result) => ({
      ...defaults,
      ...(result[storageKeys.settings] || {})
    }));
  }

  function setSettings(settings) {
    const { storageKeys } = namespace.constants;
    return getSettings()
      .then((current) => ({ ...current, ...settings }))
      .then((next) => write({ [storageKeys.settings]: next }).then(() => next));
  }

  function sendMessage(message) {
    if (!globalThis.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response || null);
      });
    });
  }

  namespace.storage = {
    read,
    write,
    remove,
    stableHash,
    normalizePath,
    getSettings,
    setSettings,
    sendMessage
  };

  globalThis.UnipaExt = namespace;
})();
