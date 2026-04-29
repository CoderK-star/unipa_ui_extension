(function () {
  const namespace = window.UnipaExt;
  const { storageKeys, messages } = namespace.constants;
  const { read, getSettings, setSettings, sendMessage } = namespace.storage;

  const autosaveEnabled = document.getElementById("autosaveEnabled");
  const keepaliveEnabled = document.getElementById("keepaliveEnabled");
  const keepaliveIntervalMinutes = document.getElementById("keepaliveIntervalMinutes");
  const keepaliveStatus = document.getElementById("keepaliveStatus");
  const clearData = document.getElementById("clearData");
  const message = document.getElementById("message");

  function load() {
    getSettings().then((settings) => {
      autosaveEnabled.checked = Boolean(settings.autosaveEnabled);
      keepaliveEnabled.checked = Boolean(settings.keepaliveEnabled);
      keepaliveIntervalMinutes.value = settings.keepaliveIntervalMinutes;
    });

    read(storageKeys.keepaliveStatus).then((result) => {
      const status = result[storageKeys.keepaliveStatus];
      if (!status) {
        keepaliveStatus.textContent = "未確認";
        return;
      }
      keepaliveStatus.textContent = `${status.state}: ${status.detail}`;
    });
  }

  function save() {
    const settings = {
      autosaveEnabled: autosaveEnabled.checked,
      keepaliveEnabled: keepaliveEnabled.checked,
      keepaliveIntervalMinutes: Math.max(5, Number(keepaliveIntervalMinutes.value) || 5)
    };

    setSettings(settings)
      .then(() => sendMessage({ type: messages.settingsChanged }))
      .then(() => {
        message.textContent = "設定を保存しました。";
        setTimeout(() => {
          message.textContent = "";
        }, 1800);
      });
  }

  autosaveEnabled.addEventListener("change", save);
  keepaliveEnabled.addEventListener("change", save);
  keepaliveIntervalMinutes.addEventListener("change", save);

  clearData.addEventListener("click", () => {
    sendMessage({ type: messages.clearLocalData }).then(() => {
      message.textContent = "ローカルの下書きとナビゲーション履歴を削除しました。";
      load();
    });
  });

  load();
})();
