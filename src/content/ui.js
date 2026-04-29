(function () {
  const namespace = globalThis.UnipaExt || {};
  const { ui } = namespace.constants;

  function createRoot(id, position) {
    let host = document.getElementById(id);
    if (host) {
      return host.shadowRoot;
    }

    host = document.createElement("div");
    host.id = id;
    host.style.all = "initial";
    host.style.position = position === "top" ? "sticky" : position === "inline" ? "static" : "fixed";
    host.style.zIndex = "2147483647";
    if (position === "top") {
      host.style.top = "0";
      host.style.display = "block";
    } else if (position !== "inline") {
      host.style.right = "16px";
      host.style.bottom = "16px";
    }

    const shadow = host.attachShadow({ mode: "open" });
    const mount = document.body || document.documentElement;
    if (position === "top" && mount.firstChild) {
      mount.insertBefore(host, mount.firstChild);
    } else {
      mount.appendChild(host);
    }
    return shadow;
  }

  function baseStyles() {
    return `
      :host {
        --unipa-bg: #f6f8fb;
        --unipa-surface: #ffffff;
        --unipa-subtle: #f9fafb;
        --unipa-text: #172033;
        --unipa-muted: #667085;
        --unipa-border: #dde5ef;
        --unipa-blue: #2563eb;
        --unipa-blue-soft: #eef4ff;
        --unipa-red: #dc2626;
        --unipa-red-soft: #fff1f2;
        --unipa-amber: #d97706;
        --unipa-amber-soft: #fffbeb;
        --unipa-green: #16a34a;
        --unipa-green-soft: #f0fdf4;
        --unipa-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
        color-scheme: light;
      }
      :host, * {
        box-sizing: border-box;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }
      button, select, input {
        font-family: inherit;
        font-size: 13px;
        letter-spacing: 0;
      }
      button {
        border: 1px solid var(--unipa-border);
        background: var(--unipa-surface);
        color: var(--unipa-text);
        border-radius: 7px;
        min-height: 30px;
        padding: 4px 10px;
        line-height: 1.4;
        cursor: pointer;
      }
      button:hover {
        background: var(--unipa-subtle);
      }
      button.primary {
        border-color: var(--unipa-blue);
        background: var(--unipa-blue);
        color: #ffffff;
      }
      button.danger {
        border-color: #fecdd3;
        background: var(--unipa-red-soft);
        color: #b91c1c;
      }
      input, select {
        border: 1px solid var(--unipa-border);
        border-radius: 7px;
        min-height: 32px;
        padding: 4px 8px;
        background: var(--unipa-surface);
        color: var(--unipa-text);
      }
      .panel {
        color: var(--unipa-text);
        background: var(--unipa-surface);
        border: 1px solid var(--unipa-border);
        box-shadow: var(--unipa-shadow);
        border-radius: 8px;
      }
      .muted {
        color: var(--unipa-muted);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 4px 10px;
        border: 1px solid var(--unipa-border);
        border-radius: 999px;
        background: var(--unipa-surface);
        color: var(--unipa-text);
        font-size: 12px;
        font-weight: 700;
      }
      .chip.active,
      .chip[aria-pressed="true"] {
        border-color: #bfdbfe;
        background: var(--unipa-blue-soft);
        color: #1d4ed8;
      }
    `;
  }

  function renderAutosaveBar(draftCount, handlers) {
    const shadow = createRoot(ui.autosaveRootId, "bottom");
    shadow.innerHTML = `
      <style>${baseStyles()}
        .autosave {
          width: min(440px, calc(100vw - 32px));
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
          border-left: 4px solid var(--unipa-amber);
        }
        .title {
          font-size: 13px;
          font-weight: 800;
        }
        .detail {
          font-size: 12px;
          margin-top: 2px;
        }
      </style>
      <div class="panel autosave" role="status">
        <div>
          <div class="title">保存済みの下書きがあります</div>
          <div class="detail muted">${draftCount}件の入力内容を復元できます。</div>
        </div>
        <button class="primary" data-action="restore">復元</button>
        <button data-action="discard">破棄</button>
      </div>
    `;

    shadow.querySelector("[data-action='restore']").addEventListener("click", handlers.onRestore);
    shadow.querySelector("[data-action='discard']").addEventListener("click", handlers.onDiscard);
  }

  function hideAutosaveBar() {
    const host = document.getElementById(ui.autosaveRootId);
    if (host) {
      host.remove();
    }
  }

  function renderNavigation(history, handlers) {
    const shadow = createRoot(ui.navRootId, "top");
    const trail = history
      .slice(0, 5)
      .map((entry, index) => {
        const label = entry.title || entry.url;
        return `<button class="chip" data-index="${index}" title="${escapeHtml(entry.url)}">${escapeHtml(label)}</button>`;
      })
      .join("");

    shadow.innerHTML = `
      <style>${baseStyles()}
        .nav {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 6px 10px;
          border-radius: 0;
          border-left: 0;
          border-right: 0;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.10);
        }
        .back {
          flex: 0 0 auto;
        }
        .trail {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .trail button {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status {
          margin-left: auto;
          font-size: 12px;
          white-space: nowrap;
        }
      </style>
      <div class="panel nav">
        <button class="back" data-action="back" title="戻る">戻る</button>
        <div class="trail">${trail}</div>
        <span class="status muted" data-status></span>
      </div>
    `;

    shadow.querySelector("[data-action='back']").addEventListener("click", handlers.onBack);
    shadow.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("click", () => handlers.onGo(Number(button.dataset.index)));
    });
  }

  function setNavStatus(text) {
    const host = document.getElementById(ui.navRootId);
    const status = host && host.shadowRoot && host.shadowRoot.querySelector("[data-status]");
    if (status) {
      status.textContent = text || "";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  namespace.uiHelpers = {
    createRoot,
    baseStyles,
    renderAutosaveBar,
    hideAutosaveBar,
    renderNavigation,
    setNavStatus,
    escapeHtml
  };

  globalThis.UnipaExt = namespace;
})();
