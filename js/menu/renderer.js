import { GROUP_ORDER, GROUP_INFO, STORAGE_KEYS } from "../config/menu-items.js";
import { classifyTags, groupItems } from "./classifier.js";
import { iconForItem, iconForGroup } from "./icons.js";

/**
 * HTML特殊文字のエスケープ
 */
function escapeHtml(str) {
  return (str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, "&#96;");
}

/**
 * localStorage からセクション開閉状態を読み込む
 */
function loadOpenState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sectionsOpen);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * localStorage にセクション開閉状態を書き込む
 */
function saveOpenState(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.sectionsOpen, JSON.stringify(state));
  } catch (_) {}
}

/**
 * 単一のアイテムカード要素を生成して返す
 * @param {{ href: string, name: string }} item
 * @returns {HTMLElement}
 */
function createItemCard(item) {
  const tags = classifyTags(item.href);
  const thumbSvg = iconForItem(item.href);
  const cleanLabel = item.name.replace(/\.html$/i, "");

  const el = document.createElement("article");
  el.className = "item";
  el.setAttribute("role", "listitem");

  el.innerHTML = `
    <div class="topline">
      <div class="nameRow">
        <div class="thumb" aria-hidden="true">${thumbSvg}</div>
        <h2 class="label" title="${escapeAttr(cleanLabel)}">${escapeHtml(cleanLabel)}</h2>
      </div>
      <div class="meta">
        ${tags.map((t) => `<span class="tag ${t.cls}">${escapeHtml(t.text)}</span>`).join("")}
      </div>
    </div>
    <div class="linkrow">
      <a class="launch" href="${escapeAttr(item.href)}" data-href="${escapeAttr(item.href)}">
        起動 <span aria-hidden="true">↗</span>
        <span class="sr-only">${escapeHtml(item.href)} を開く</span>
      </a>
      <button class="copy" type="button" data-copy="${escapeAttr(item.href)}">
        URL をコピー
      </button>
    </div>
  `;

  return el;
}

/**
 * 単一のセクション details 要素を生成して返す
 * @param {string} groupKey
 * @param {Array<{href:string, name:string}>} items
 * @param {Record<string, boolean>} openState
 * @returns {HTMLDetailsElement}
 */
function createSection(groupKey, items, openState) {
  const info = GROUP_INFO[groupKey] || GROUP_INFO["OTHER"];
  const iconSvg = iconForGroup(groupKey, info.accent);

  const details = document.createElement("details");
  details.className = "section";
  details.dataset.group = groupKey;
  details.open = typeof openState[groupKey] === "boolean" ? openState[groupKey] : true;

  details.innerHTML = `
    <summary class="sectionHead">
      <div class="secLeft">
        <div class="secIcon">
          ${iconSvg}
        </div>
        <div class="secTitleWrap">
          <p class="secTitle">${escapeHtml(info.title)}</p>
          <p class="secDesc">${escapeHtml(info.desc)}</p>
        </div>
      </div>
      <div class="secRight">
        <span class="pill">${items.length} 件</span>
        <span class="chev" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
    </summary>
    <div class="grid" role="list"></div>
  `;

  const grid = details.querySelector(".grid");
  for (const item of items) {
    grid.appendChild(createItemCard(item));
  }

  details.addEventListener("toggle", () => {
    const current = loadOpenState() || {};
    current[groupKey] = details.open;
    saveOpenState(current);
  });

  return details;
}

/**
 * メニューセクション全体をレンダリングする
 * @param {HTMLElement} root       描画先の #sections 要素
 * @param {Array<{href:string, name:string}>} menuItems
 */
export function renderMenuSections(root, menuItems) {
  const groups = groupItems(menuItems);
  const openState = loadOpenState() || {};

  root.innerHTML = "";

  const orderedKeys = GROUP_ORDER.filter((key) => groups.has(key));

  for (const key of orderedKeys) {
    const section = createSection(key, groups.get(key), openState);
    root.appendChild(section);
  }
}

/**
 * セクションの開閉を一括切替する
 * いずれか1つでも開いていれば全部閉じる。全部閉じていれば全部開く。
 * @param {HTMLElement} root  #sections 要素
 */
export function toggleAllSections(root) {
  const sections = [...root.querySelectorAll("details.section")];
  if (!sections.length) return;

  const anyOpen = sections.some((d) => d.open);
  const nextOpen = !anyOpen;
  const state = loadOpenState() || {};

  for (const d of sections) {
    d.open = nextOpen;
    state[d.dataset.group] = nextOpen;
  }

  saveOpenState(state);
}

/**
 * launch クリック時の最終ページ記録
 * @param {string} href
 */
export function recordLastOpen(href) {
  try {
    localStorage.setItem(STORAGE_KEYS.lastOpen, href);
  } catch (_) {}
}

/**
 * テキストをクリップボードにコピーし、ボタンのラベルを一時的に変える
 * @param {HTMLButtonElement} button
 * @param {string} text
 */
export async function copyToClipboard(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = "コピーしました";
    setTimeout(() => { button.textContent = original; }, 900);
  } catch (_) {
    const original = button.textContent;
    button.textContent = "コピー失敗";
    setTimeout(() => { button.textContent = original; }, 900);
  }
}
