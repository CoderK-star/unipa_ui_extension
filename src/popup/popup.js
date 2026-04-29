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
    deadlineNotificationHours: document.getElementById("deadlineNotificationHours")
  };

  const keepaliveStatus = document.getElementById("keepaliveStatus");
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

    read(storageKeys.keepaliveStatus).then((result) => {
      const status = result[storageKeys.keepaliveStatus];
      keepaliveStatus.textContent = status ? `${status.state}: ${status.detail}` : "未確認";
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
      deadlineNotificationHours: clampNumber(fields.deadlineNotificationHours.value, 1, 168, 24)
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

  clearData.addEventListener("click", () => {
    sendMessage({ type: messages.clearLocalData }).then(() => {
      message.textContent = "下書き、掲示板、ナビゲーション、締切のローカルデータを削除しました。";
      load();
    });
  });

  load();
})();
