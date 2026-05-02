(function () {
  const namespace = globalThis.UnipaExt || {};
  const { ui } = namespace.constants;
  const { createRoot, baseStyles, escapeHtml } = namespace.uiHelpers;

  let hideTimer = null;

  function start() {
    const links = Array.from(document.querySelectorAll("a[href]"))
      .filter(isPdfLink);

    links.forEach((link) => {
      if (link.dataset.unipaPdfEnhanced === "true") {
        return;
      }
      link.dataset.unipaPdfEnhanced = "true";
      link.target = "_blank";
      link.rel = "noopener";
      link.addEventListener("mouseenter", () => showPreview(link));
      link.addEventListener("focus", () => showPreview(link));
    });
  }

  function isPdfLink(link) {
    const href = link.getAttribute("href") || "";
    const text = link.textContent || "";
    return /\.pdf(\?|#|$)/i.test(href) || /\.pdf(\s|$)/i.test(text);
  }

  function showPreview(link) {
    clearTimeout(hideTimer);
    const url = new URL(link.getAttribute("href"), location.href).href;
    const shadow = createRoot(ui.pdfRootId, "bottom");
    const host = document.getElementById(ui.pdfRootId);
    host.style.left = "auto";
    host.style.right = "16px";
    host.style.bottom = "82px";

    shadow.innerHTML = `
      <style>${baseStyles()}
        .preview {
          width: min(540px, calc(100vw - 32px));
          height: min(560px, calc(100vh - 120px));
          display: grid;
          grid-template-rows: auto 1fr;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid #eef2f7;
        }
        .title {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 800;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: #f8fafc;
        }
      </style>
      <div class="panel preview">
        <div class="header">
          <span class="title">${escapeHtml(link.textContent || "PDFプレビュー")}</span>
          <button class="primary" data-open type="button">開く</button>
          <button data-close type="button">閉じる</button>
        </div>
        <iframe title="PDFプレビュー" src="${escapeHtml(url)}"></iframe>
      </div>
    `;

    shadow.querySelector("[data-open]").addEventListener("click", () => {
      window.open(url, "_blank", "noopener");
    });
    shadow.querySelector("[data-close]").addEventListener("click", hidePreview);
    shadow.host.addEventListener("mouseleave", scheduleHide);
  }

  function scheduleHide() {
    hideTimer = setTimeout(hidePreview, 600);
  }

  function hidePreview() {
    const host = document.getElementById(ui.pdfRootId);
    if (host) {
      host.remove();
    }
  }

  namespace.pdfViewer = { start };
  globalThis.UnipaExt = namespace;
})();
