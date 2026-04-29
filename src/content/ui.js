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
      :host, * {
        box-sizing: border-box;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
        color-scheme: light;
      }
      button, select, input {
        font-family: inherit;
        font-size: 13px;
        letter-spacing: 0;
      }
      button {
        border: 1px solid #cfd6df;
        background: #ffffff;
        color: #1f2937;
        border-radius: 6px;
        min-height: 30px;
        padding: 4px 10px;
        line-height: 1.4;
        cursor: pointer;
      }
      button:hover {
        background: #f3f6f9;
      }
      button.primary {
        border-color: #2563eb;
        background: #2563eb;
        color: #ffffff;
      }
      button.danger {
        border-color: #b91c1c;
        color: #991b1b;
      }
      input, select {
        border: 1px solid #cfd6df;
        border-radius: 6px;
        min-height: 30px;
        padding: 4px 8px;
        background: #ffffff;
        color: #1f2937;
      }
      .panel {
        color: #1f2937;
        background: #ffffff;
        border: 1px solid #d7dee8;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
        border-radius: 8px;
      }
      .muted {
        color: #667085;
      }
    `;
  }

  function renderAutosaveBar(draftCount, handlers) {
    const shadow = createRoot(ui.autosaveRootId, "bottom");
    shadow.innerHTML = `
      <style>${baseStyles()}
        .autosave {
          width: min(420px, calc(100vw - 32px));
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
        }
        .title {
          font-size: 13px;
          font-weight: 600;
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
        return `<button data-index="${index}" title="${escapeHtml(entry.url)}">${escapeHtml(label)}</button>`;
      })
      .join("");

    shadow.innerHTML = `
      <style>${baseStyles()}
        .nav {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 6px 10px;
          border-radius: 0;
          border-left: 0;
          border-right: 0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.10);
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
        <button data-action="back" title="戻る">戻る</button>
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
