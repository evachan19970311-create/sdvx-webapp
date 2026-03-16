/**
 * 集計スタッツパネルの描画
 */

const TAB_LABELS = ["ALL", "LV17", "LV18", "LV19", "LV20"];

/**
 * スタッツパネルを描画し、タブ切り替えを初期化する。
 * @param {HTMLElement} container   - 描画先要素
 * @param {Map<string, import('../services/menu-stats-data.js').StatsGroup>} statsMap
 */
export function renderStatsPanel(container, statsMap) {
  if (!container) return;

  container.innerHTML = `
    <div class="stats-tabs" role="tablist" aria-label="レベル選択">
      ${TAB_LABELS.map((label, i) => `
        <button
          class="stats-tab${i === 0 ? " active" : ""}"
          role="tab"
          data-tab="${label}"
          aria-selected="${i === 0 ? "true" : "false"}"
        >${label}</button>
      `).join("")}
    </div>
    <div class="stats-grid" id="statsGrid" aria-live="polite"></div>
  `;

  const tabs = [...container.querySelectorAll(".stats-tab")];
  const grid = container.querySelector("#statsGrid");

  const render = (label) => {
    const stats = statsMap.get(label);
    if (!stats) return;
    grid.innerHTML = buildStatsGrid(stats);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      render(tab.dataset.tab);
    });
  });

  render("ALL");
}

/** @param {import('../services/menu-stats-data.js').StatsGroup} stats */
function buildStatsGrid(stats) {
  const playedPct = stats.total > 0
    ? ((stats.played / stats.total) * 100).toFixed(1)
    : "0.0";

  const avgScoreStr = stats.avgScore > 0
    ? Math.floor(stats.avgScore).toLocaleString("ja-JP")
    : "—";

  const avgScorePlayedStr = stats.avgScorePlayed > 0
    ? Math.floor(stats.avgScorePlayed).toLocaleString("ja-JP")
    : "—";

  const items = [
    { label: "SONGS",                   value: `${stats.total} songs`,                          color: "cyan"   },
    { label: "PLAYED SONGS",            value: `${stats.played} songs`,                         color: "cyan"   },
    { label: "AVERAGE",                 value: avgScoreStr,                                     color: "lime"   },
    { label: "PLAYED AVERAGE",          value: avgScorePlayedStr,                               color: "lime"   },
    { label: "PUC",                     value: `${stats.puc} / ${stats.total}`,                 color: "amber"  },
    { label: "UC",                      value: `${stats.uc} / ${stats.total}`,                  color: "violet" },
    { label: "9,990,000+",              value: `${stats.score9990k} / ${stats.total}`,          color: ""       },
    { label: "9,980,000+",              value: `${stats.score9980k} / ${stats.total}`,          color: ""       },
    { label: "9,950,000+",              value: `${stats.score9950k} / ${stats.total}`,          color: ""       },
    { label: "9,900,000+",              value: `${stats.score9900k} / ${stats.total}`,          color: ""       },
  ];

  return items.map(item => `
    <div class="stat-card">
      <div class="stat-card-value ${item.color ? `stat-${item.color}` : ""}">${item.value}</div>
      ${item.sub ? `<div class="stat-card-sub">${item.sub}</div>` : ""}
      <div class="stat-card-label">${item.label}</div>
    </div>
  `).join("");
}
