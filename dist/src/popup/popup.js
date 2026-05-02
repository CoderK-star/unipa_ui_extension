(function () {
  const namespace = globalThis.UnipaExt;
  const { storageKeys, messages } = namespace.constants;
  const { read, getSettings, setSettings, sendMessage } = namespace.storage;
  const { formatDateTime } = namespace.utils;

  const fields = {
    autosaveEnabled: document.getElementById("autosaveEnabled"),
    keepaliveEnabled: document.getElementById("keepaliveEnabled"),
    keepaliveIntervalMinutes: document.getElementById("keepaliveIntervalMinutes"),
    pdfViewerEnabled: document.getElementById("pdfViewerEnabled"),
    commandPaletteEnabled: document.getElementById("commandPaletteEnabled")
  };

  const metrics = {
    draftCount: document.getElementById("draftCount"),
    sessionState: document.getElementById("sessionState"),
    sessionDetail: document.getElementById("sessionDetail")
  };

  const clearData = document.getElementById("clearData");
  const message = document.getElementById("message");
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsPanel = document.getElementById("settingsPanel");

  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener("click", () => {
      const isOpen = !settingsPanel.hidden;
      settingsPanel.hidden = isOpen;
      settingsToggle.setAttribute("aria-expanded", String(!isOpen));
      settingsToggle.setAttribute("aria-label", isOpen ? "設定を開く" : "設定を閉じる");
    });
  }

  function load() {
    getSettings().then((settings) => {
      Object.entries(fields).forEach(([key, element]) => {
        if (!element) {
          return;
        }
        if (element.type === "checkbox") {
          element.checked = Boolean(settings[key]);
        } else {
          element.value = settings[key];
        }
      });
    });

    loadMetrics();
  }

  function loadMetrics() {
    read([
      storageKeys.autosaveEntries,
      storageKeys.keepaliveStatus
    ]).then((result) => {
      const drafts = result[storageKeys.autosaveEntries] || {};
      metrics.draftCount.textContent = `${Object.keys(drafts).length}件`;

      const status = result[storageKeys.keepaliveStatus];
      metrics.sessionState.textContent = status ? status.state : "未確認";
      metrics.sessionDetail.textContent = status ? status.detail : "待機中";

      const sessionDot = document.getElementById("sessionDot");
      if (sessionDot && status) {
        sessionDot.dataset.state = status.state === "成功" || status.state === "有効" ? "ok" : status.state === "失敗" ? "bad" : "warn";
        const pill = document.getElementById("sessionState");
        if (pill) {
          pill.className = "status-pill " + (sessionDot.dataset.state === "ok" ? "pill-ok" : sessionDot.dataset.state === "bad" ? "pill-bad" : "pill-warn");
        }
      }
    });
  }

  function save() {
    const settings = {
      autosaveEnabled: fields.autosaveEnabled.checked,
      keepaliveEnabled: fields.keepaliveEnabled.checked,
      keepaliveIntervalMinutes: clampNumber(fields.keepaliveIntervalMinutes.value, 5, 30, 5),
      pdfViewerEnabled: fields.pdfViewerEnabled.checked,
      commandPaletteEnabled: fields.commandPaletteEnabled.checked
    };

    setSettings(settings)
      .then(() => sendMessage({ type: messages.settingsChanged }))
      .then(() => {
        message.textContent = "設定を保存しました。UNIPAページを再読み込みすると反映されます。";
        setTimeout(() => {
          message.textContent = "";
        }, 2200);
      });
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  }

  Object.values(fields).forEach((element) => {
    if (element) {
      element.addEventListener("change", save);
    }
  });

  if (clearData) {
    clearData.addEventListener("click", () => {
      sendMessage({ type: messages.clearLocalData }).then(() => {
        if (message) {
          message.textContent = "下書き、掲示板、ナビゲーション、締切のローカルデータを削除しました。";
        }
        loadMetrics();
      });
    });
  }

  load();
})();
