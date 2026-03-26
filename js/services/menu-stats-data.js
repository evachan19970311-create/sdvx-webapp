import { MENU_DATA_PATHS, JACKET_BASE_PATH } from "../config/menu-items.js";
import { calcVF } from "../domain/vf-calculator.js";

/** diff_num → デフォルト難易度名（ranking に name がない場合のフォールバック） */
const DEFAULT_DIFF_NAME = {
  1: "NOV", 2: "ADV", 3: "EXH", 4: "MXM", 5: "INF", 6: "ULT"
};

/**
 * 3つのJSONを読み込み、結合した曲エントリ配列を返す。
 * ジャケットIDは music_data.json から補完する（なければ null）。
 *
 * @returns {Promise<SongEntry[]>}
 *
 * @typedef {Object} SongEntry
 * @property {number}  musicNum
 * @property {string}  musicId
 * @property {string}  musicTitle
 * @property {string}  artist
 * @property {string}  diffKey      - "diff_3" など
 * @property {number}  diffNum
 * @property {string}  diffName     - "EXH" / "MXM" 等（大文字）
 * @property {number}  level        - 17.5 など小数
 * @property {number}  levelInt     - 17 など整数
 * @property {string|null} jacketId
 * @property {number}  score
 * @property {string}  clear        - "per" / "uc" / "comp" / "no" 等
 * @property {string}  grade        - "s" / "aaa" 等
 * @property {number}  exscore
 * @property {number}  exscore1st   - 1位スコア（ranking にない場合 0）
 * @property {number}  exDiff       - exscore1st - exscore（正 = 差あり）
 * @property {number}  vf           - 計算済み VF
 */
export async function loadMenuStatsData() {
  const [scoreRows, exscoreRows, rankingRows, musicRows] = await Promise.all([
    fetchJson(MENU_DATA_PATHS.score),
    fetchJson(MENU_DATA_PATHS.exscore),
    fetchJson(MENU_DATA_PATHS.exscoreRanking),
    fetchJson(MENU_DATA_PATHS.music).catch(() => [])  // music_data がなくても続行
  ]);

  // ── ジャケットIDマップ: music_id → jacket_id ──────────────────
  const jacketMap = new Map();
  const musicNumMap = new Map();
  const musicMap = new Map();
  for (const m of musicRows) {
    // music_data の各diff から jacket_id を取得
    for (const [k, v] of Object.entries(m)) {
      if (k.startsWith("diff_") && v?.jacket_id) {
        // diff_key ごとに保存
        jacketMap.set(`${m.music_id}_${k}`, v.jacket_id);
        musicNumMap.set(`${m.music_id}_${k}`, m.music_num);
        musicMap.set(`${m.music_id}_${k}`, {
          musicTitle: m.music_title,
          artist: m.artist,
          ...v
        });
      }
    }
  }

  // ── scoreMap: `${music_id}_${diff_key}` → { score, clear, grade } ──
  const scoreMap = new Map();
  for (const row of scoreRows) {
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("diff_") && v != null) {
        scoreMap.set(`${row.music_id}_${k}`, v);
      }
    }
  }

  // ── exscoreMap: `${music_id}_${diff_key}` → { exscore } ─────────
  const exscoreMap = new Map();
  for (const row of exscoreRows) {
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("diff_") && v != null) {
        exscoreMap.set(`${row.music_id}_${k}`, v);
      }
    }
  }

  // ── rankingMap: `${music_id}_${diff_key}` → { exscore1st } ──
  const rankingMap = new Map();
  for (const row of rankingRows) {
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("diff_") && v != null) {
        rankingMap.set(`${row.music_id}_${k}`, v);
      }
    }
  }

  // ── 結合: music_data を軸にエントリを生成 ─────────────────────
  const entries = [];

  for (const [compositeKey, musicInfo] of musicMap) {
    const [musicId, diffKey] = splitCompositeKey(compositeKey);

    const scoreInfo   = scoreMap.get(compositeKey)  ?? { score: 0, clear: "no", grade: "no" };
    const exInfo      = exscoreMap.get(compositeKey) ?? { exscore: 0 };
    const rankingInfo = rankingMap.get(compositeKey) ?? { exscore1st: 0 };

    const diffNum    = musicInfo.num ?? diffKeyToNum(diffKey);
    const diffName   = (musicInfo.name ?? DEFAULT_DIFF_NAME[diffNum] ?? "?").toUpperCase();
    const level      = musicInfo.level ?? 0;
    if (level < 17) continue;  // レベル17未満はスキップ

    const levelInt   = Math.floor(level);
    const exscore1st = rankingInfo.exscore1st ?? 0;
    const exscore    = exInfo.exscore ?? 0;
    const exDiff     = exscore1st - exscore;
    const score      = scoreInfo.score ?? 0;
    const clear      = scoreInfo.clear ?? "no";
    const grade      = scoreInfo.grade ?? "no";
    const vf         = calcVF(level, score, grade, clear);

    // jacket_id: diff_key 優先 → music_id フォールバック
    const jacketId = jacketMap.get(compositeKey) ?? jacketMap.get(musicId) ?? null;
    const musicNum = musicNumMap.get(compositeKey) ?? musicNumMap.get(musicId) ?? null;

    entries.push({
      musicNum,
      musicId,
      musicTitle: musicInfo.musicTitle ?? "",
      artist: musicInfo.artist ?? "",
      diffKey,
      diffNum,
      diffName,
      level,
      levelInt,
      jacketId,
      score,
      clear,
      grade,
      exscore,
      exscore1st,
      exDiff,
      vf
    });
  }

  // レベル降順 → スコア降順
  entries.sort((a, b) => a.musicNum - b.musicNum || b.level - a.level || b.score - a.score);
  console.log(entries);
  return entries;
}

/**
 * エントリ配列からレベルグループ別の集計を返す。
 * @param {SongEntry[]} entries
 * @returns {Map<string, StatsGroup>}
 *
 * @typedef {Object} StatsGroup
 * @property {string} label
 * @property {number} total
 * @property {number} played
 * @property {number} avgScorePlayed
 * @property {number} puc
 * @property {number} uc
 * @property {number} score9900k
 * @property {number} score9950k
 * @property {number} score9990k
 * @property {number} avgExDiff
 */
export function computeStats(entries) {
  const groups = {
    "ALL":   entries,
    "LV17":  entries.filter(e => e.levelInt === 17),
    "LV18":  entries.filter(e => e.levelInt === 18),
    "LV19":  entries.filter(e => e.levelInt === 19),
    "LV20":  entries.filter(e => e.levelInt === 20),
  };

  const result = new Map();

  for (const [label, group] of Object.entries(groups)) {
    const avgScore = group.length > 0
      ? group.reduce((s, e) => s + e.score, 0) / group.length
      : 0;
    
    const played = group.filter(e => e.score > 0);

    const avgScorePlayed = played.length > 0
      ? played.reduce((s, e) => s + e.score, 0) / played.length
      : 0;

    const exDiffs = played.filter(e => e.exscore > 0).map(e => e.exDiff);
    const avgExDiff = exDiffs.length > 0
      ? exDiffs.reduce((s, v) => s + v, 0) / exDiffs.length
      : 0;

    result.set(label, {
      label,
      total:      group.length,
      played:     played.length,
      avgScore,
      avgScorePlayed,
      puc:        group.filter(e => e.clear === "per").length,
      uc:         group.filter(e => e.clear === "uc").length,
      score9900k: group.filter(e => e.score >= 9900000).length,
      score9950k: group.filter(e => e.score >= 9950000).length,
      score9980k: group.filter(e => e.score >= 9980000).length,
      score9990k: group.filter(e => e.score >= 9990000).length,
      avgExDiff
    });
  }

  return result;
}

// ── ユーティリティ ─────────────────────────────────────────────────

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch: ${path} (${res.status})`);
  return res.json();
}

function splitCompositeKey(key) {
  const idx = key.lastIndexOf("_diff_");
  if (idx === -1) return [key, ""];
  return [key.slice(0, idx), "diff_" + key.slice(idx + 6)];
}

function diffKeyToNum(diffKey) {
  return parseInt(diffKey.replace("diff_", ""), 10) || 0;
}
