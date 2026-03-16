import { PROFILE_JSON, VF_CLASS, VF_LEVEL } from "../config/menu-items.js";

/**
 * プロフィールデータを読み込む
 * @returns {Promise<{playerId:string, playerName:string, vf:string, vfClass:string, vfLevel:string, playCount:string} | null>}
 */
export async function loadProfileData() {
  try {
    const response = await fetch(PROFILE_JSON);
    if (!response.ok) return null;

    const data = await response.json();
    return Array.isArray(data) ? data[0] ?? null : data;
  } catch (_) {
    return null;
  }
}

/**
 * プロフィールカードを #profileSection に描画する
 * @param {HTMLElement} container   描画先要素
 * @param {{ playerId:string, playerName:string, vf:string, vfClass:string, vfLevel:string, playCount:string } | null} profile
 */
export function renderProfile(container, profile) {
  if (!container) return;

  if (!profile) {
    container.innerHTML = `
      <div class="card profile-card profile-error" aria-label="プロフィール読み込みエラー">
        <p class="profile-error-text">プロフィールデータを読み込めませんでした。</p>
      </div>
    `;
    return;
  }

  const vfClass = VF_CLASS.find(item => item.class === profile.vfClass)?.name || "";
  const vfLevel = VF_LEVEL.find(item => item.level === profile.vfLevel)?.name || "";
  const vfCls = VF_CLASS.find(item => item.class === profile.vfClass)?.cls || "";

  container.innerHTML = `
    <div class="card profile-card" aria-label="プレイヤープロフィール">

      <div class="profile-inner">

        <!-- アバター / ネームプレート -->
        <div class="profile-avatar" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="18" r="10" stroke="var(--cyan)" stroke-width="2"/>
            <path d="M6 42c0-9.941 8.059-18 18-18s18 8.059 18 18"
              stroke="var(--cyan)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- プレイヤー名 -->
        <div class="profile-name-block">
          <p class="profile-player-name">${escapeHtml(profile.playerName)}</p>
          <p class="profile-player-id">${escapeHtml(profile.playerId)}</p>
        </div>

        <div class="profile-stat-divider" aria-hidden="true"></div>

        <!-- ステータス -->
        <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat-value profile-vf-value">${escapeHtml(String(profile.vf))}</span>
            <span class="profile-stat-label">VOLFORCE</span>
            <span class="tag ${vfCls} profile-rank-tag">${vfClass} ${vfLevel}</span>
          </div>
        </div>

      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return (str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
