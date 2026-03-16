export const UI_CONFIG = {
  padding: 100,
  headerHeight: 320,
  gridSize: 50,

  jacketSize: 110,
  jacketMargin: 10,
  sectionHeight: 70,
  sectionMargin: 25,
  maxCols: 30,
  preloadBatchSize: 15,

  summaryBox: {
    width: 1000,
    height: 120
  },

  vfCard: {
    width: 600,
    height: 180,
    columns: 3,
    gapX: 30,
    gapY: 24,
    innerPadding: 15,
    jacketSize: 150
  },

  fonts: {
    title: "900 120px 'Orbitron'",
    titleSub: "600 24px 'Inter'",
    section: "700 48px 'Orbitron'",
    score: "700 24px 'Inter'",
    exscore: "700 24px 'Inter'",
    summary: "600 36px 'Inter'",
    summaryLabel: "400 18px 'Inter'",
    vfRank: "700 20px 'Orbitron'",
    vfValue: "700 64px 'Orbitron'",
    vfTitle: "700 20px 'Orbitron'",
    vfMeta: "700 20px 'Orbitron'"
  },

  colors: {
    bgTop: "#0a0e1a",
    bgBottom: "#1a1f35",
    accent: "#00e5ff",
    accentSoft: "rgba(0, 229, 255, 0.15)",
    panel: "rgba(20, 25, 40, 0.9)",
    panelInner: "rgba(16, 21, 65, 0.72)",
    textMain: "#ffffff",
    textSub: "#aab2bd",
    grid: "rgba(0, 229, 255, 0.03)",
    shadow: "rgba(0, 0, 0, 0.45)"
  }
};

export const DATA_PATHS = {
  profile: "../data/sdvx_profile_data.json",
  music: "../data/sdvx_music_data.json",
  score: "../data/sdvx_score_data.json",
  exscore: "../data/sdvx_exscore_data.json",
  ranking: "../data/sdvx_exscore_ranking_data.json",
  jacketBase: "../images/jacket"
};

export const STORAGE_KEYS = {
  canvasFit: "sdvx_canvas_fit",
  lastOpen: "sdvx_menu_last_open"
};

export const DIFFICULTY_COLORS = {
  NOV: { border: "#5a49fb", fill: "rgba(90, 73, 251, 0.82)" },
  ADV: { border: "#fbb649", fill: "rgba(251, 182, 73, 0.82)" },
  EXH: { border: "#fb494c", fill: "rgba(251, 73, 76, 0.82)" },
  MXM: { border: "#acacac", fill: "rgba(172, 172, 172, 0.82)" },
  INF: { border: "#ee65e5", fill: "rgba(238, 101, 229, 0.82)" },
  GRV: { border: "#fb8f49", fill: "rgba(251, 143, 73, 0.82)" },
  HVN: { border: "#49c9fb", fill: "rgba(73, 201, 251, 0.82)" },
  VVD: { border: "#ff59cd", fill: "rgba(255, 89, 205, 0.82)" },
  XCD: { border: "#187fff", fill: "rgba(24, 127, 255, 0.82)" },
  ULT: { border: "#ffdd57", fill: "rgba(255, 221, 87, 0.82)" }
};

export const CLEAR_COLORS = {
  per: "#f1ef77",
  uc: "#f889af",
  comp_max: "#dfdfdf",
  comp_ex: "#ae73ee",
  comp: "#6eebaf",
  play: "#225239",
  "": "#225239",
  no: "#333333"
};

export const MINUS_LEVEL_COLORS = {
  played: "#fff",
  top: "#f1ef77",
  m10: "#f889af",
  m20: "#dfdfdf",
  m30: "#ae73ee",
  m50: "#6eebaf"
};
