import { MENU_ITEMS, STORAGE_KEYS } from "../config/menu-items.js";
import {
  renderMenuSections,
  toggleAllSections,
  recordLastOpen,
  copyToClipboard
} from "./renderer.js";

/**
 * ハンバーガー式サイドメニューを初期化する。
 * @param {Object} params
 * @param {HTMLElement} params.toggleButton   - ☰ ボタン
 * @param {HTMLElement} params.overlay        - オーバーレイ背景
 * @param {HTMLElement} params.panel          - サイドパネル
 * @param {HTMLElement} params.closeButton    - ✕ ボタン
 * @param {HTMLElement} params.contentRoot    - メニュー描画先
 * @param {HTMLElement} params.collapseButton - セクション一括開閉ボタン
 */
export function initSubmenu({
  toggleButton,
  overlay,
  panel,
  closeButton,
  contentRoot,
  collapseButton
}) {
  // メニューセクションを一度だけ描画
  renderMenuSections(contentRoot, MENU_ITEMS);

  // ── 開閉 ───────────────────────────────────────────────
  const open = () => {
    overlay.classList.add("active");
    panel.classList.add("active");
    panel.setAttribute("aria-hidden", "false");
    toggleButton.setAttribute("aria-expanded", "true");
    closeButton.focus();
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    overlay.classList.remove("active");
    panel.classList.remove("active");
    panel.setAttribute("aria-hidden", "true");
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.focus();
    document.body.style.overflow = "";
  };

  toggleButton.addEventListener("click", () => {
    const isOpen = panel.classList.contains("active");
    isOpen ? close() : open();
  });

  closeButton.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (!panel.contains(e.target)) close();
  });

  // ── ESC で閉じる ──────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("active")) {
      close();
    }
  });

  // ── セクション一括開閉 ────────────────────────────────
  collapseButton?.addEventListener("click", () => {
    toggleAllSections(contentRoot);
  });

  // ── launch / copy のイベント委任（サイドメニュー内） ──
  contentRoot.addEventListener("click", async (e) => {
    const launchLink = e.target.closest("a.launch");
    if (launchLink) {
      recordLastOpen(launchLink.getAttribute("data-href"));
      close();
      return;
    }

    const copyButton = e.target.closest("button.copy");
    if (copyButton) {
      await copyToClipboard(copyButton, copyButton.getAttribute("data-copy"));
    }
  });
}
