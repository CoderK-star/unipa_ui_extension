(function () {
  const namespace = globalThis.UnipaExt || {};
  const { storageKeys, limits, ui, messages } = namespace.constants;
  const { read, write, stableHash, sendMessage } = namespace.storage;
  const { rules, hasAnySignal, getPageTitle } = namespace.selectors;
  const { createRoot, baseStyles, escapeHtml } = namespace.uiHelpers;

  function start(settings) {
    const entries = extractDeadlines();
    if (!entries.length) {
      return read(storageKeys.deadlineEntries).then((result) => {
        renderDashboard(result[storageKeys.deadlineEntries] || []);
      });
    }

    return mergeEntries(entries).then((merged) => {
      renderDashboard(merged);
      if (settings.deadlineNotificationsEnabled) {
        sendMessage({
          type: messages.deadlinesUpdated,
          entries: merged,
          settings
        });
      }
    });
  }

  function extractDeadlines() {
    const candidates = Array.from(document.querySelectorAll("tr, li, p, div"))
      .slice(0, limits.deadlineScanLimit * 4)
      .map((element) => ({
        element,
        text: normalizeText(element.innerText || element.textContent || "")
      }))
      .filter((candidate) => candidate.text.length >= 8)
      .filter((candidate) => hasAnySignal(candidate.text, rules.deadlineSignals) || findDateTime(candidate.text))
      .slice(0, limits.deadlineScanLimit);

    return candidates
      .map((candidate) => {
        const dueAt = findDateTime(candidate.text);
        if (!dueAt) {
          return null;
        }
        const title = deriveTitle(candidate.text);
        return {
          id: stableHash(`${location.origin}${location.pathname}:${title}:${dueAt.toISOString()}`),
          title,
          dueAt: dueAt.toISOString(),
          sourceUrl: location.href,
          sourceTitle: getPageTitle(),
          capturedAt: new Date().toISOString()
        };
      })
      .filter(Boolean);
  }

  function mergeEntries(newEntries) {
    return read(storageKeys.deadlineEntries).then((result) => {
      const byId = new Map((result[storageKeys.deadlineEntries] || []).map((entry) => [entry.id, entry]));
      newEntries.forEach((entry) => byId.set(entry.id, entry));
      const now = Date.now();
      const merged = Array.from(byId.values())
        .filter((entry) => Date.parse(entry.dueAt) > now - 24 * 60 * 60 * 1000)
        .sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt))
        .slice(0, limits.deadlineHistorySize);
      return write({ [storageKeys.deadlineEntries]: merged }).then(() => merged);
    });
  }

  function renderDashboard(entries) {
    const shadow = createRoot(ui.deadlineRootId, "bottom");
    const host = document.getElementById(ui.deadlineRootId);
    host.style.left = "16px";
    host.style.right = "auto";
    host.style.bottom = "16px";

    const upcoming = entries
      .filter((entry) => Date.parse(entry.dueAt) > Date.now())
      .slice(0, 6);

    const items = upcoming.length
      ? upcoming.map(renderItem).join("")
      : `<div class="empty muted">検出された締切はありません。</div>`;

    shadow.innerHTML = `
      <style>${baseStyles()}
        .dashboard {
          width: min(360px, calc(100vw - 32px));
          max-height: min(440px, calc(100vh - 90px));
          display: grid;
          grid-template-rows: auto 1fr;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-bottom: 1px solid #e1e7ef;
        }
        .header strong {
          flex: 1;
          font-size: 13px;
        }
        .list {
          overflow: auto;
          padding: 8px;
          display: grid;
          gap: 8px;
        }
        .item {
          display: grid;
          gap: 4px;
          padding: 8px;
          border: 1px solid #e1e7ef;
          border-left-width: 4px;
          border-radius: 6px;
          background: #ffffff;
        }
        .item.soon {
          border-left-color: #dc2626;
        }
        .item.medium {
          border-left-color: #d97706;
        }
        .item.later {
          border-left-color: #16a34a;
        }
        .item-title {
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .meta {
          font-size: 12px;
        }
        .empty {
          padding: 8px;
          font-size: 12px;
        }
      </style>
      <div class="panel dashboard">
        <div class="header">
          <strong>締切</strong>
          <span class="muted">${upcoming.length}件</span>
        </div>
        <div class="list">${items}</div>
      </div>
    `;
  }

  function renderItem(entry) {
    const dueTime = Date.parse(entry.dueAt);
    const hours = Math.max(0, Math.round((dueTime - Date.now()) / 36e5));
    const level = hours <= 24 ? "soon" : hours <= 72 ? "medium" : "later";
    return `
      <div class="item ${level}">
        <div class="item-title">${escapeHtml(entry.title)}</div>
        <div class="meta muted">${escapeHtml(formatDate(entry.dueAt))} / 残り${hours}時間</div>
      </div>
    `;
  }

  function findDateTime(text) {
    const pattern = new RegExp("(20\\d{2})[\\/\\-.\\u5e74](\\d{1,2})[\\/\\-.\\u6708](\\d{1,2})(?:[\\u65e5\\s]*(\\d{1,2})[:\\u6642](\\d{1,2})?)?");
    const match = String(text).match(pattern);
    if (!match) {
      return null;
    }
    const hour = match[4] ? Number(match[4]) : 23;
    const minute = match[5] ? Number(match[5]) : 59;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function deriveTitle(text) {
    const pattern = new RegExp("(20\\d{2})[\\/\\-.\\u5e74]\\d{1,2}[\\/\\-.\\u6708]\\d{1,2}.*");
    return normalizeText(text)
      .replace(pattern, "")
      .slice(0, 80)
      || "UNIPAの締切";
  }

  function formatDate(value) {
    const date = new Date(value);
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeText(text) {
    return String(text).replace(/\s+/g, " ").trim();
  }

  namespace.deadlineDashboard = { start, extractDeadlines };
  globalThis.UnipaExt = namespace;
})();
