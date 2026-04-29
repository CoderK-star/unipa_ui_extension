importScripts("../shared/constants.js", "../shared/storage.js");

const namespace = self.UnipaExt;
const { storageKeys, defaults, messages } = namespace.constants;
const { read, write, getSettings } = namespace.storage;

const KEEPALIVE_ALARM = "unipa.keepalive";

chrome.runtime.onInstalled.addListener(() => {
  getSettings().then(syncKeepaliveAlarm);
});

chrome.runtime.onStartup.addListener(() => {
  getSettings().then(syncKeepaliveAlarm);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === messages.pageSeen) {
    handlePageSeen(message).then(sendResponse);
    return true;
  }

  if (message.type === messages.settingsChanged) {
    getSettings().then(syncKeepaliveAlarm).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === messages.clearLocalData) {
    chrome.storage.local.remove([
      storageKeys.autosaveEntries,
      storageKeys.navigationHistory,
      storageKeys.keepaliveStatus
    ], () => sendResponse({ ok: !chrome.runtime.lastError }));
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== KEEPALIVE_ALARM) {
    return;
  }

  runKeepalive();
});

function handlePageSeen(message) {
  const settings = {
    ...defaults,
    ...(message.settings || {})
  };

  return write({ [storageKeys.keepaliveOrigin]: message.origin })
    .then(() => syncKeepaliveAlarm(settings))
    .then(() => ({ ok: true }));
}

function syncKeepaliveAlarm(settings) {
  if (!settings.keepaliveEnabled) {
    return chrome.alarms.clear(KEEPALIVE_ALARM);
  }

  const interval = Number(settings.keepaliveIntervalMinutes)
    || defaults.keepaliveIntervalMinutes;
  return chrome.alarms.create(KEEPALIVE_ALARM, {
    delayInMinutes: interval,
    periodInMinutes: interval
  });
}

function runKeepalive() {
  return Promise.all([
    getSettings(),
    read(storageKeys.keepaliveOrigin)
  ]).then(([settings, result]) => {
    if (!settings.keepaliveEnabled) {
      return null;
    }

    const origin = result[storageKeys.keepaliveOrigin];
    if (!origin || origin === "null") {
      return writeStatus("未実行", "有効な UNIPA の接続先が見つかりませんでした。");
    }

    return fetch(origin, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      redirect: "manual"
    })
      .then((response) => writeStatus(
        response.ok || response.type === "opaqueredirect" ? "成功" : "失敗",
        `HTTP ${response.status || "リダイレクト"}`
      ))
      .catch((error) => writeStatus("失敗", error.message));
  });
}

function writeStatus(state, detail) {
  return write({
    [storageKeys.keepaliveStatus]: {
      state,
      detail,
      checkedAt: new Date().toISOString()
    }
  });
}
