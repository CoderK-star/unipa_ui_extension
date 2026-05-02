importScripts("../shared/constants.js", "../shared/storage.js", "../shared/utils.js");

const namespace = self.UnipaExt;
const { storageKeys, defaults, messages } = namespace.constants;
const { read, write, getSettings } = namespace.storage;
const { formatDateTime } = namespace.utils;

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
      storageKeys.keepaliveStatus,
      storageKeys.bulletinReadItems,
      storageKeys.deadlineEntries,
      storageKeys.deadlineNotifications
    ], () => sendResponse({ ok: !chrome.runtime.lastError }));
    return true;
  }

  if (message.type === messages.deadlinesUpdated) {
    handleDeadlinesUpdated(message).then(sendResponse);
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

  // UNIPAドメイン以外からの通知は keepaliveOrigin を更新しない
  const { unipaHostname } = namespace.constants;
  let originHostname;
  try {
    originHostname = new URL(message.origin).hostname;
  } catch (_) {
    return Promise.resolve({ ok: false, reason: "invalid origin" });
  }
  if (originHostname !== unipaHostname) {
    return syncKeepaliveAlarm(settings).then(() => ({ ok: true }));
  }

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
      return writeStatus("未実行", "有効なUNIPAページが見つかりませんでした。");
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

function handleDeadlinesUpdated(message) {
  const settings = {
    ...defaults,
    ...(message.settings || {})
  };

  if (!settings.deadlineNotificationsEnabled) {
    return Promise.resolve({ ok: true, notified: 0 });
  }

  const thresholdMs = Number(settings.deadlineNotificationHours || 24) * 60 * 60 * 1000;
  const now = Date.now();
  const entries = Array.isArray(message.entries) ? message.entries : [];

  return read(storageKeys.deadlineNotifications).then((result) => {
    const notified = result[storageKeys.deadlineNotifications] || {};
    const dueSoon = entries.filter((entry) => {
      const dueTime = Date.parse(entry.dueAt);
      return dueTime > now && dueTime - now <= thresholdMs && !notified[entry.id];
    });

    dueSoon.forEach((entry) => {
      chrome.notifications.create(`unipa-deadline-${entry.id}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
        title: "UNIPA 締切通知",
        message: `${entry.title} の締切は ${formatDateTime(entry.dueAt)} です。`
      });
      notified[entry.id] = new Date().toISOString();
    });

    return write({ [storageKeys.deadlineNotifications]: notified })
      .then(() => ({ ok: true, notified: dueSoon.length }));
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

