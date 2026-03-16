import { STORAGE_KEYS } from "./config/menu-items.js";
import { loadProfileData, renderProfile } from "./menu/profile.js";
import { initSubmenu } from "./menu/submenu.js";
import { renderStatsPanel } from "./menu/stats-panel.js";
import { renderSongTable } from "./menu/song-table.js";
import { loadMenuStatsData, computeStats } from "./services/menu-stats-data.js";

window.addEventListener("DOMContentLoaded", async () => {
  // ── DOM 参照 ─────────────────────────────────────────
  const profileSection  = document.getElementById("profileSection");
  const statsSection    = document.getElementById("statsSection");
  const tableSection    = document.getElementById("tableSection");
  const openLastBtn     = document.getElementById("openLast");
  const hamburgerBtn    = document.getElementById("hamburgerBtn");
  const sideOverlay     = document.getElementById("sideMenuOverlay");
  const sidePanel       = document.getElementById("sideMenu");
  const sideCloseBtn    = document.getElementById("sideMenuClose");
  const sideContent     = document.getElementById("sideMenuContent");
  const sideCollapseBtn = document.getElementById("sideCollapseAll");
  const loadingBanner   = document.getElementById("loadingBanner");

  // ── プロフィール描画 ──────────────────────────────────
  const profileData = await loadProfileData();
  renderProfile(profileSection, profileData);

  // ── サイドメニュー初期化 ──────────────────────────────
  initSubmenu({
    toggleButton:   hamburgerBtn,
    overlay:        sideOverlay,
    panel:          sidePanel,
    closeButton:    sideCloseBtn,
    contentRoot:    sideContent,
    collapseButton: sideCollapseBtn
  });

  // ── 最後に開いたページへ ──────────────────────────────
  openLastBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      const href = localStorage.getItem(STORAGE_KEYS.lastOpen);
      if (href) {
        location.href = href;
      } else {
        alert("まだ履歴がありません。どれか1つ起動すると記録されます。");
      }
    } catch (_) {
      alert("履歴の取得に失敗しました。");
    }
  });

  // ── キーボードショートカット ─────────────────────────
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = document.querySelector("a.launch");
      if (first && document.activeElement !== first) {
        const href = first.getAttribute("data-href");
        try { localStorage.setItem(STORAGE_KEYS.lastOpen, href); } catch (_) {}
        location.href = href;
      }
    }
  });

  // ── スタッツ・テーブルデータ読み込み ─────────────────
  try {
    loadingBanner?.classList.add("active");

    const entries = await loadMenuStatsData();
    const statsMap = computeStats(entries);

    loadingBanner?.classList.remove("active");

    renderStatsPanel(statsSection, statsMap);
    renderSongTable(tableSection, entries);
  } catch (err) {
    console.error("データ読み込みエラー:", err);
    loadingBanner?.classList.remove("active");

    if (statsSection) {
      statsSection.innerHTML = `
        <div class="load-error">
          データの読み込みに失敗しました。<br>
          <small>${err.message}</small>
        </div>
      `;
    }
  }
});
