(function () {
  const namespace = globalThis.UnipaExt || {};

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateTime(value, options) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    if (options && options.includeYear === false) {
      return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
    }

    return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${time}`;
  }

  function debounce(callback, waitMs) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(...args), waitMs);
    };
  }

  namespace.utils = {
    normalizeText,
    formatDateTime,
    debounce
  };

  globalThis.UnipaExt = namespace;
})();
