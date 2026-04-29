(function () {
  const namespace = globalThis.UnipaExt || {};

  const rules = {
    unipaSignals: [
      "UNIVERSAL PASSPORT",
      "UNIPA",
      "Universal Passport",
      "unipa"
    ],
    headingSelectors: [
      "h1",
      "h2",
      ".page-title",
      ".title",
      "#title",
      "[role='heading']"
    ],
    editableSelectors: [
      "textarea",
      "input[type='text']",
      "input[type='search']",
      "input[type='email']",
      "input[type='url']",
      "input[type='tel']",
      "input:not([type])",
      "[contenteditable='true']"
    ],
    ignoredInputTypes: [
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "password",
      "radio",
      "range",
      "reset",
      "submit"
    ]
  };

  function textIncludesSignal(text) {
    const value = String(text || "");
    return rules.unipaSignals.some((signal) => value.includes(signal));
  }

  function isLikelyUnipaPage() {
    const host = location.hostname.toLowerCase();
    if (host.includes("unipa")) {
      return true;
    }

    if (textIncludesSignal(document.title)) {
      return true;
    }

    const bodyText = document.body ? document.body.innerText.slice(0, 4000) : "";
    return textIncludesSignal(bodyText);
  }

  function getPageTitle() {
    for (const selector of rules.headingSelectors) {
      const element = document.querySelector(selector);
      const text = element && element.textContent ? element.textContent.trim() : "";
      if (text) {
        return text;
      }
    }

    return document.title || location.pathname || "UNIPAページ";
  }

  function isEditableElement(element) {
    if (!element || element.disabled || element.readOnly) {
      return false;
    }

    if (element.matches("[contenteditable='true']")) {
      return true;
    }

    if (element.tagName === "TEXTAREA") {
      return true;
    }

    if (element.tagName !== "INPUT") {
      return false;
    }

    const type = (element.getAttribute("type") || "text").toLowerCase();
    return !rules.ignoredInputTypes.includes(type);
  }

  function findEditableElements(root) {
    return Array.from((root || document).querySelectorAll(rules.editableSelectors.join(",")))
      .filter(isEditableElement);
  }

  namespace.selectors = {
    rules,
    isLikelyUnipaPage,
    getPageTitle,
    findEditableElements,
    isEditableElement
  };

  globalThis.UnipaExt = namespace;
})();
