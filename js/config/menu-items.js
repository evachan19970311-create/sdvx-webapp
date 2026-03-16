/**
 * VFクラス名定義
 */
export const VF_CLASS = [
  { class: "force_10",         name: "Imperial",  cls: "violet" },
  { class: "force_9",          name: "Crimson",   cls: "" },
  { class: "force_8",          name: "Eldora",    cls: "amber" },
  { class: "force_7",          name: "Argento",   cls: "" },
  { class: "force_6",          name: "Coral",     cls: "pink" },
  { class: "force_5",          name: "Scarlet",   cls: "" },
  { class: "force_4",          name: "Cyan",      cls: "cyan" },
  { class: "force_3",          name: "Dandelion", cls: "amber" },
  { class: "force_2",          name: "Cobalt",    cls: "" },
  { class: "force_1",          name: "Sienna",    cls: "" }
];

/**
 * VFレベル名定義
 */
export const VF_LEVEL = [
  { level: "level_04",          name: "IV" },
  { level: "level_03",          name: "III" },
  { level: "level_02",          name: "II" },
  { level: "level_01",          name: "I" }
];

export const MENU_ITEMS = [
  { href: "sdvx_diff_canvas.html",          name: "DIFF CANVAS" },
  { href: "sdvx_vf_canvas.html",            name: "VF TARGET LIST" },
  { href: "sdvx_lv17_score_canvas.html",           name: "LV17 SCORE GRID" },
  { href: "sdvx_lv18_score_canvas.html",           name: "LV18 SCORE GRID" },
  { href: "sdvx_lv1920_score_canvas.html",       name: "LV19+ SCORE GRID" },
  { href: "sdvx_lv17_exscore_canvas.html",  name: "LV17 EX-SCORE LIST" },
  { href: "sdvx_lv18_exscore_canvas.html",  name: "LV18 EX-SCORE LIST" },
  { href: "sdvx_lv1920_exscore_canvas.html",name: "LV19/20 EX-SCORE LIST" },
];

export const GROUP_ORDER = [
  "VF", "LV17", "LV18", "LV19/20", "EXSCORE", "CANVAS", "OTHER"
];

export const GROUP_INFO = {
  "VF":      { title: "VF",       desc: "VF関連",          accent: "var(--cyan)"   },
  "LV17":    { title: "LV17",     desc: "Lv17関連",        accent: "var(--violet)" },
  "LV18":    { title: "LV18",     desc: "Lv18関連",        accent: "var(--violet)" },
  "LV19/20": { title: "LV19/20",  desc: "Lv19/20関連",     accent: "var(--violet)" },
  "EXSCORE": { title: "EXSCORE",  desc: "EXSCORE関連",     accent: "var(--pink)"   },
  "CANVAS":  { title: "CANVAS",   desc: "Canvas/可視化系",  accent: "var(--lime)"   },
  "OTHER":   { title: "OTHER",    desc: "その他",          accent: "rgba(233,236,255,.7)" }
};

export const STORAGE_KEYS = {
  lastOpen: "sdvx_menu_last_open",
  sectionsOpen: "sdvx_menu_sections_open"
};

export const PROFILE_JSON = "../data/sdvx_profile_data.json";

/** メニューページ固有のデータパス */
export const MENU_DATA_PATHS = {
  music:           "../data/sdvx_music_data.json",
  score:           "../data/sdvx_score_data.json",
  exscore:         "../data/sdvx_exscore_data.json",
  exscoreRanking:  "../data/sdvx_exscore_ranking_data.json"
};

/** ジャケット画像ベースパス */
export const JACKET_BASE_PATH = "../images/jacket";

