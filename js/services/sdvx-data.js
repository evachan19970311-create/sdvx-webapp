import { DATA_PATHS } from "../config/app-config.js";
import { isLevelInRange } from "../config/page-definitions.js";
import { calcVF } from "../domain/vf-calculator.js";

export async function loadScoreGridData({
  pageDefinition,
  uiConfig,
  jacketRepository,
  progress
}) {
  progress.update(5, "Loading data files...");

  const { musicRows, scoreRows, exscoreRows, rankingRows } = await loadMusicAndScore();

  progress.update(20, "Merging data...");

  const scoreMap = buildScoreMap(scoreRows);
  const exscoreMap = buildExScoreMap(exscoreRows);
  const rankingMap = buildRankingMap(rankingRows);
  const songs = collectSongs(musicRows, scoreMap, exscoreMap, rankingMap)
    .filter((song) => isLevelInRange(song.level, pageDefinition))
    .sort((a, b) => b.level - a.level || b.musicNum - a.musicNum);

  progress.update(40, "Loading jacket images...");

  await jacketRepository.preload(
    songs.map((song) => song.jacketId),
    uiConfig.preloadBatchSize,
    ({ loaded, total }) => {
      const ratio = total === 0 ? 1 : loaded / total;
      progress.update(
        40 + Math.floor(ratio * 30),
        `Loading jackets... ${loaded}/${total}`
      );
    }
  );

  return songs;
}

export async function loadExScoreGridData({
  pageDefinition,
  uiConfig,
  jacketRepository,
  progress
}) {
  progress.update(5, "Loading data files...");

  const { musicRows, scoreRows, exscoreRows, rankingRows } = await loadMusicAndScore();

  progress.update(20, "Merging data...");

  const scoreMap = buildExScoreMap(scoreRows);
  const exscoreMap = buildExScoreMap(exscoreRows);
  const rankingMap = buildRankingMap(rankingRows);
  const songs = collectSongs(musicRows, scoreMap, exscoreMap, rankingMap)
    .filter((song) => isLevelInRange(song.level, pageDefinition))
    .sort((a, b) => b.level - a.level || b.minus - a.minus || b.musicNum - a.musicNum);

  progress.update(40, "Loading jacket images...");

  await jacketRepository.preload(
    songs.map((song) => song.jacketId),
    uiConfig.preloadBatchSize,
    ({ loaded, total }) => {
      const ratio = total === 0 ? 1 : loaded / total;
      progress.update(
        40 + Math.floor(ratio * 30),
        `Loading jackets... ${loaded}/${total}`
      );
    }
  );

  return songs;
}

export async function loadVfTargetData({
  pageDefinition,
  uiConfig,
  jacketRepository,
  progress
}) {
  progress.update(5, "Loading data files...");

  const { musicRows, scoreRows, exscoreRows, rankingRows } = await loadMusicAndScore();

  progress.update(20, "Calculating VF values...");

  const scoreMap = buildExScoreMap(scoreRows);
  const exscoreMap = buildExScoreMap(exscoreRows);
  const rankingMap = buildRankingMap(rankingRows);
  const items = collectSongs(musicRows, scoreMap, exscoreMap, rankingMap)
    .map((song) => ({
      ...song,
      vf: calcVF(song.level, song.score, song.grade, song.clear)
    }))
    .sort((a, b) => b.vf - a.vf || b.level - a.level || b.score - a.score)
    .slice(0, pageDefinition.maxItems);

  const totalVf = items.reduce((sum, item) => sum + item.vf, 0);
  const averageVf = items.length > 0 ? totalVf / items.length : 0;

  progress.update(40, "Loading jacket images...");

  await jacketRepository.preload(
    items.map((item) => item.jacketId),
    uiConfig.preloadBatchSize,
    ({ loaded, total }) => {
      const ratio = total === 0 ? 1 : loaded / total;
      progress.update(
        40 + Math.floor(ratio * 30),
        `Loading jackets... ${loaded}/${total}`
      );
    }
  );

  return {
    items,
    totalVf,
    averageVf
  };
}

async function loadMusicAndScore() {
  const [ musicRows, scoreRows, exscoreRows, rankingRows] = await Promise.all([
    fetch(DATA_PATHS.music).then((response) => response.json()),
    fetch(DATA_PATHS.score).then((response) => response.json()),
    fetch(DATA_PATHS.exscore).then((response) => response.json()),
    fetch(DATA_PATHS.ranking).then((response) => response.json())
  ]);

  return {musicRows, scoreRows, exscoreRows, rankingRows };
}

function buildScoreMap(scoreRows) {
  const scoreMap = new Map();

  scoreRows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key.startsWith("diff_")) {
        scoreMap.set(`${row.music_title}_${row.artist}_${key}`, value);
      }
    });
  });

  return scoreMap;
}

function buildExScoreMap(exscoreRows) {
  const exscoreMap = new Map();

  exscoreRows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key.startsWith("diff_")) {
        exscoreMap.set(`${row.music_title}_${row.artist}_${key}`, value);
      }
    });
  });

  return exscoreMap;
}

function buildRankingMap(rankingRows) {
  const rankingMap = new Map();

  rankingRows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key.startsWith("diff_")) {
        rankingMap.set(`${row.music_title}_${row.artist}_${key}`, value);
      }
    });
  });

  return rankingMap;
}

function collectSongs(musicRows, scoreMap, exscoreMap, rankingMap) {
  const songs = [];

  musicRows.forEach((music) => {
    Object.entries(music).forEach(([diffKey, diffValue]) => {
      if (!diffKey.startsWith("diff_")) return;
      if (!diffValue?.level) return;

      const scoreKey = `${music.music_title}_${music.artist}_${diffKey}`;
      const score = scoreMap.get(scoreKey) ?? {
        score: 0,
        clear: "no",
        grade: null
      };
      const exscore = exscoreMap.get(scoreKey) ?? {
        exscore: 0
      };
      const ranking = rankingMap.get(scoreKey) ?? {
        exscore1st: 0
      };

      let minus = exscore.exscore - ranking.exscore1st;
      if(exscore.exscore === 0) minus = -99999;

      let minusAch = "";
      if(minus === 0) minusAch === "top";
      if(minus > -10 && minusAch === "") minusAch = "m10";
      if(minus > -20 && minusAch === "") minusAch = "m20";
      if(minus > -30 && minusAch === "") minusAch = "m30";
      if(minus > -50 && minusAch === "") minusAch = "m50";

      songs.push({
        musicId: music.music_id,
        musicNum: music.music_num,
        musicTitle: normalizeMusicTitle(music.music_title),
        diffName: (diffValue.diff_name ?? "").toUpperCase(),
        level: diffValue.level,
        jacketId: diffValue.jacket_id,
        score: score.score ?? 0,
        exscore: exscore.exscore ?? 0,
        exscore1st: ranking.exscore1st ?? 0,
        minus: minus,
        minusAch: minusAch,
        clear: score.clear ?? "no",
        grade: score.grade ?? null
      });
    });
  });

  console.log(songs);
  return songs;
}

function normalizeMusicTitle(title) {
  if (!title) return "";
  return title.endsWith("(EXIT TUNES)")
    ? title.replace("(EXIT TUNES)", "").trim()
    : title;
}
