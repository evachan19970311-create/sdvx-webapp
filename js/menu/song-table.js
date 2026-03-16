import { JACKET_BASE_PATH } from "../config/menu-items.js";

const CLEAR_LABEL = {
  per: "PUC",
  uc: "UC",
  comp_max: "MXV",
  comp_ex: "EX",
  comp: "COMP",
  play: "PLAY",
  no: "—",
  "": "—"
};

const CLEAR_CLASS = {
  per: "clear-per",
  uc: "clear-uc",
  comp_max: "clear-mxv",
  comp_ex: "clear-ex",
  comp: "clear-comp",
  play: "clear-play",
  no: "clear-no",
  "": "clear-no"
};

const DIFF_CLASS = {
  NOV: "diff-nov",
  ADV: "diff-adv",
  EXH: "diff-exh",
  MXM: "diff-mxm",
  INF: "diff-inf",
  GRV: "diff-grv",
  HVN: "diff-hvn",
  VVD: "diff-vvd",
  XCD: "diff-xcd",
  ULT: "diff-ult"
};

let allEntries = [];
let currentSort = { key: "musicNum", dir: "asc" };
let currentFilter = "ALL";
let currentPage = 1;
let pageSize = 10;

let tableBody = null;
let resultCountEl = null;
let pageInfoEl = null;
let pageButtonsEl = null;
let prevPageBtn = null;
let nextPageBtn = null;
let pageSizeSelect = null;

/**
 * 曲一覧テーブルを描画・初期化する
 * @param {HTMLElement} container
 * @param {Array} entries
 */
export function renderSongTable(container, entries) {
  if (!container) return;

  allEntries = entries;

  container.innerHTML = `
    <div class="table-controls">
      <div class="table-filter-tabs" role="tablist" aria-label="レベルフィルタ">
        ${["ALL", "LV17", "LV18", "LV19", "LV20"].map((f, i) => `
          <button
            class="stats-tab${i === 0 ? " active" : ""}"
            role="tab"
            data-filter="${f}"
            aria-selected="${i === 0 ? "true" : "false"}"
            type="button"
          >${f}</button>
        `).join("")}
      </div>

      <div class="table-sort-controls" aria-label="ソート">
        ${[
          { key: "musicNum",  label: "新曲順" },
          { key: "level",     label: "LV" },
          { key: "score",     label: "スコア" },
          { key: "exDiff",    label: "EX差分" },
          { key: "vf",        label: "VF" }
        ].map((s) => `
          <button class="sort-btn${s.key === "musicNum" ? " active desc" : ""}"
            data-sort="${s.key}" type="button" title="${s.label}でソート">
            ${s.label} <span class="sort-arrow">${s.key === "musicNum" ? "↓" : "↕"}</span>
          </button>
        `).join("")}
      </div>
    </div>

    <div class="table-meta">
      <div class="table-meta-left">
        <span class="table-count-label">表示件数:</span>
        <strong class="table-count" id="tableCount">0 件</strong>
      </div>

      <div class="table-meta-right">
        <label class="page-size-label" for="pageSizeSelect">1ページ表示数</label>
        <select id="pageSizeSelect" class="page-size-select">
          ${[10, 20, 50, 100].map((size) => `
            <option value="${size}" ${size === pageSize ? "selected" : ""}>${size}</option>
          `).join("")}
        </select>
      </div>
    </div>

    <div class="song-table-wrap" role="region" aria-label="曲一覧" tabindex="0">
      <table class="song-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-jacket">JKT</th>
            <th class="col-title">曲名 / 難易度</th>
            <th class="col-lv">LV</th>
            <th class="col-score">スコア</th>
            <th class="col-clear">クリア</th>
            <th class="col-exscore">EXスコア</th>
            <th class="col-exdiff">EX差分</th>
            <th class="col-vf">VF</th>
          </tr>
        </thead>
        <tbody id="songTableBody"></tbody>
      </table>
    </div>

    <div class="table-pagination">
      <button id="prevPageBtn" class="pager-btn" type="button">← Prev</button>
      <div id="pageButtons" class="page-buttons" aria-label="ページ番号"></div>
      <button id="nextPageBtn" class="pager-btn" type="button">Next →</button>
    </div>

    <div class="table-page-info" id="tablePageInfo" aria-live="polite"></div>
  `;

  tableBody = container.querySelector("#songTableBody");
  resultCountEl = container.querySelector("#tableCount");
  pageInfoEl = container.querySelector("#tablePageInfo");
  pageButtonsEl = container.querySelector("#pageButtons");
  prevPageBtn = container.querySelector("#prevPageBtn");
  nextPageBtn = container.querySelector("#nextPageBtn");
  pageSizeSelect = container.querySelector("#pageSizeSelect");

  bindFilterTabs(container);
  bindSortButtons(container);
  bindPagerButtons();
  bindPageSizeSelector();

  refreshTable();
}

function bindFilterTabs(container) {
  const filterTabs = [...container.querySelectorAll("[data-filter]")];

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      currentFilter = tab.dataset.filter;
      currentPage = 1;
      refreshTable();
    });
  });
}

function bindSortButtons(container) {
  const sortBtns = [...container.querySelectorAll(".sort-btn")];

  sortBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;

      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === "desc" ? "asc" : "desc";
      } else {
        currentSort = { key, dir: "desc" };
      }

      sortBtns.forEach((b) => {
        b.classList.remove("active", "asc", "desc");
        const arrow = b.querySelector(".sort-arrow");
        if (arrow) arrow.textContent = "↕";
      });

      btn.classList.add("active", currentSort.dir);
      const activeArrow = btn.querySelector(".sort-arrow");
      if (activeArrow) {
        activeArrow.textContent = currentSort.dir === "desc" ? "↓" : "↑";
      }

      currentPage = 1;
      refreshTable();
    });
  });
}

function bindPagerButtons() {
  prevPageBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      refreshTable();
    }
  });

  nextPageBtn?.addEventListener("click", () => {
    const { totalPages } = getViewState();
    if (currentPage < totalPages) {
      currentPage++;
      refreshTable();
    }
  });
}

function bindPageSizeSelector() {
  pageSizeSelect?.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value) || 50;
    currentPage = 1;
    refreshTable();
  });
}

function refreshTable() {
  if (!tableBody) return;

  const filtered = filterEntries(allEntries, currentFilter);
  const sorted = sortEntries(filtered, currentSort);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageEntries = sorted.slice(startIndex, endIndex);

  renderRows(pageEntries, startIndex);
  renderPagination(totalCount, totalPages, startIndex, pageEntries.length);
}

function renderRows(pageEntries, startIndex) {
  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  pageEntries.forEach((entry, index) => {
    fragment.appendChild(createRow(entry, startIndex + index + 1));
  });

  tableBody.appendChild(fragment);
}

function renderPagination(totalCount, totalPages, startIndex, pageLength) {
  if (resultCountEl) {
    resultCountEl.textContent = `${totalCount.toLocaleString("ja-JP")} 件`;
  }

  if (pageInfoEl) {
    const from = totalCount === 0 ? 0 : startIndex + 1;
    const to = startIndex + pageLength;
    pageInfoEl.textContent = `Page ${currentPage} / ${totalPages} ・ ${from.toLocaleString("ja-JP")} - ${to.toLocaleString("ja-JP")} / ${totalCount.toLocaleString("ja-JP")} 件`;
  }

  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage <= 1;
  }
  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  renderPageButtons(totalPages);
}

function renderPageButtons(totalPages) {
  if (!pageButtonsEl) return;

  pageButtonsEl.innerHTML = "";

  const pages = buildPageList(currentPage, totalPages);

  pages.forEach((page) => {
    if (page === "...") {
      const span = document.createElement("span");
      span.className = "page-ellipsis";
      span.textContent = "...";
      pageButtonsEl.appendChild(span);
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `page-number-btn${page === currentPage ? " active" : ""}`;
    btn.textContent = page;
    btn.setAttribute("aria-label", `${page}ページ目へ移動`);

    btn.addEventListener("click", () => {
      currentPage = page;
      refreshTable();
    });

    pageButtonsEl.appendChild(btn);
  });
}

function buildPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [1];

  if (current > 3) pages.push("...");

  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return [...new Set(pages)];
}

function filterEntries(entries, filter) {
  switch (filter) {
    case "LV17":
      return entries.filter((e) => e.levelInt === 17);
    case "LV18":
      return entries.filter((e) => e.levelInt === 18);
    case "LV19":
      return entries.filter((e) => e.levelInt === 19);
    case "LV20":
      return entries.filter((e) => e.levelInt === 20);
    default:
      return entries;
  }
}

function sortEntries(entries, { key, dir }) {
  return [...entries].sort((a, b) => {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;

    let diff = 0;

    if (typeof av === "string" || typeof bv === "string") {
      diff = String(av).localeCompare(String(bv), "ja");
    } else {
      diff = av - bv;
    }

    if (diff === 0) {
      diff = (a.musicTitle ?? "").localeCompare(b.musicTitle ?? "", "ja");
    }

    return dir === "asc" ? diff : -diff;
  });
}

function createRow(entry, rank) {
  const tr = document.createElement("tr");
  tr.className = entry.score > 0 ? "row-played" : "row-unplayed";

  const jacketSrc = entry.jacketId
    ? `${JACKET_BASE_PATH}/${entry.jacketId}.jpg`
    : null;

  const exDiffDisplay = formatExDiff(entry.exDiff, entry.exscore);
  const exDiffClass = getExDiffClass(entry.exDiff, entry.exscore);

  tr.innerHTML = `
    <td class="col-num">${rank}</td>
    <td class="col-jacket">
      ${
        jacketSrc
          ? `<img src="${jacketSrc}" class="jacket-thumb" alt="" loading="lazy" width="44" height="44">`
          : `<div class="jacket-placeholder" aria-hidden="true"></div>`
      }
    </td>
    <td class="col-title">
      <div class="title-line">${escapeHtml(entry.musicTitle)}</div>
      <div class="diff-line">
        <span class="diff-badge ${DIFF_CLASS[entry.diffName] ?? ""}">
          ${escapeHtml(entry.diffName)}
        </span>
      </div>
    </td>
    <td class="col-lv">${entry.level.toFixed(1)}</td>
    <td class="col-score ${entry.score >= 9900000 ? "score-high" : ""}">
      ${entry.score > 0 ? entry.score.toLocaleString("ja-JP") : "—"}
    </td>
    <td class="col-clear">
      <span class="clear-badge ${CLEAR_CLASS[entry.clear] ?? "clear-no"}">
        ${CLEAR_LABEL[entry.clear] ?? "—"}
      </span>
    </td>
    <td class="col-exscore">
      ${entry.exscore > 0 ? entry.exscore.toLocaleString("ja-JP") : "—"}
    </td>
    <td class="col-exdiff ${exDiffClass}">
      ${exDiffDisplay}
    </td>
    <td class="col-vf ${entry.vf > 0 ? "vf-value" : ""}">
      ${entry.vf > 0 ? entry.vf : "—"}
    </td>
  `;

  return tr;
}

function formatExDiff(exDiff, exscore) {
  if (exscore <= 0) return "-";
  if (exDiff === 0) return "±0";
  return exDiff > 0
    ? `−${exDiff.toLocaleString("ja-JP")}`
    : `+${Math.abs(exDiff).toLocaleString("ja-JP")}`;
}

function getExDiffClass(exDiff, exscore) {
  if (exscore <= 0) return "";
  if (exDiff <= 0) return "exdiff-over";
  if (exDiff <= 50) return "exdiff-close";
  if (exDiff <= 200) return "exdiff-near";
  return "exdiff-far";
}

function escapeHtml(str) {
  return (str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function getViewState() {
  const filtered = filterEntries(allEntries, currentFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  return { totalPages };
}
