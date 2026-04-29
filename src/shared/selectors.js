(function () {
  const namespace = globalThis.UnipaExt || {};

  const rules = {
    unipaSignals: [
      "UNIVERSAL PASSPORT",
      "UNIPA",
      "Universal Passport",
      "unipa"
    ],
    bulletinSignals: [
      "\u63b2\u793a",
      "\u304a\u77e5\u3089\u305b",
      "\u9023\u7d61",
      "notice",
      "news"
    ],
    deadlineSignals: [
      "\u7de0\u5207",
      "\u63d0\u51fa",
      "\u671f\u9650",
      "\u671f\u65e5",
      "deadline",
      "due"
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

  function hasAnySignal(text, signals) {
    const value = String(text || "").toLowerCase();
    return signals.some((signal) => value.includes(signal.toLowerCase()));
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
    isEditableElement,
    hasAnySignal
  };

  globalThis.UnipaExt = namespace;
})();
