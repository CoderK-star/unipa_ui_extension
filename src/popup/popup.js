(function () {
  const namespace = globalThis.UnipaExt;
  const { storageKeys, messages } = namespace.constants;
  const { read, getSettings, setSettings, sendMessage } = namespace.storage;

  const fields = {
    autosaveEnabled: document.getElementById("autosaveEnabled"),
    keepaliveEnabled: document.getElementById("keepaliveEnabled"),
    keepaliveIntervalMinutes: document.getElementById("keepaliveIntervalMinutes"),
    bulletinEnhancerEnabled: document.getElementById("bulletinEnhancerEnabled"),
    pdfViewerEnabled: document.getElementById("pdfViewerEnabled"),
    deadlineDashboardEnabled: document.getElementById("deadlineDashboardEnabled"),
    deadlineNotificationsEnabled: document.getElementById("deadlineNotificationsEnabled"),
    deadlineNotificationHours: document.getElementById("deadlineNotificationHours"),
    commandPaletteEnabled: document.getElementById("commandPaletteEnabled")
  };

  const metrics = {
    deadlineCount: document.getElementById("deadlineCount"),
    deadlineSummary: document.getElementById("deadlineSummary"),
    bulletinCount: document.getElementById("bulletinCount"),
    draftCount: document.getElementById("draftCount"),
    sessionState: document.getElementById("sessionState"),
    sessionDetail: document.getElementById("sessionDetail")
  };

  const clearData = document.getElementById("clearData");
  const message = document.getElementById("message");

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
      storageKeys.deadlineEntries,
      storageKeys.bulletinReadItems,
      storageKeys.autosaveEntries,
      storageKeys.keepaliveStatus
    ]).then((result) => {
      const deadlines = (result[storageKeys.deadlineEntries] || [])
        .filter((entry) => Date.parse(entry.dueAt) > Date.now())
        .sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt));
      metrics.deadlineCount.textContent = `${deadlines.length}件`;
      metrics.deadlineSummary.textContent = deadlines[0]
        ? `次: ${formatDate(deadlines[0].dueAt)}`
        : "検出なし";

      const readItems = result[storageKeys.bulletinReadItems] || {};
      metrics.bulletinCount.textContent = `${Object.keys(readItems).length}件`;

      const drafts = result[storageKeys.autosaveEntries] || {};
      metrics.draftCount.textContent = `${Object.keys(drafts).length}件`;

      const status = result[storageKeys.keepaliveStatus];
      metrics.sessionState.textContent = status ? status.state : "未確認";
      metrics.sessionDetail.textContent = status ? status.detail : "待機中";
    });
  }

  function save() {
    const settings = {
      autosaveEnabled: fields.autosaveEnabled.checked,
      keepaliveEnabled: fields.keepaliveEnabled.checked,
      keepaliveIntervalMinutes: clampNumber(fields.keepaliveIntervalMinutes.value, 5, 30, 5),
      bulletinEnhancerEnabled: fields.bulletinEnhancerEnabled.checked,
      pdfViewerEnabled: fields.pdfViewerEnabled.checked,
      deadlineDashboardEnabled: fields.deadlineDashboardEnabled.checked,
      deadlineNotificationsEnabled: fields.deadlineNotificationsEnabled.checked,
      deadlineNotificationHours: clampNumber(fields.deadlineNotificationHours.value, 1, 168, 24),
      commandPaletteEnabled: fields.commandPaletteEnabled.checked,
      uiTheme: "light"
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

  function formatDate(value) {
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  Object.values(fields).forEach((element) => {
    if (element) {
      element.addEventListener("change", save);
    }
  });

  clearData.addEventListener("click", () => {
    sendMessage({ type: messages.clearLocalData }).then(() => {
      message.textContent = "下書き、掲示板、ナビゲーション、締切のローカルデータを削除しました。";
      loadMetrics();
    });
  });

  load();
})();
