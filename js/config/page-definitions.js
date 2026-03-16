export const SCORE_GRID_PAGES = {
  lv17: {
    key: "lv17",
    minLevel: 17,
    maxLevel: 18,
    title: "LV17 SCORE GRID",
    subtitle: "Ver 1.0",
    downloadFilePrefix: "lv17_score_grid"
  },
  lv17ex: {
    key: "lv17ex",
    minLevel: 17,
    maxLevel: 18,
    title: "LV17 EX-SCORE GRID",
    subtitle: "Ver 1.0",
    downloadFilePrefix: "lv17_exscore_grid"
  },
  lv18: {
    key: "lv18",
    minLevel: 18,
    maxLevel: 19,
    title: "LV18 SCORE GRID",
    subtitle: "Ver 1.0",
    downloadFilePrefix: "lv18_score_grid"
  },
  lv18ex: {
    key: "lv18ex",
    minLevel: 18,
    maxLevel: 19,
    title: "LV18 EX-SCORE GRID",
    subtitle: "Ver 1.0",
    downloadFilePrefix: "lv18_exscore_grid"
  },
  lv1920: {
    key: "lv1920",
    minLevel: 19,
    maxLevel: 21,
    title: "LV19/LV20 SCORE GRID",
    subtitle: "Ver 1.0",
    downloadFilePrefix: "lv1920_score_grid"
  },
  lv1920ex: {
    key: "lv1920ex",
    minLevel: 19,
    maxLevel: 21,
    title: "LV19/LV20 EX-SCORE GRID",
    subtitle: "Ver 1.0",
    downloadFilePrefix: "lv1920_exscore_grid"
  }
};

export const VF_TARGET_PAGE = {
  key: "vf-target",
  title: "VF TARGET LIST",
  subtitle: "Ver 1.0",
  downloadFilePrefix: "vf_target_list",
  maxItems: 50
};

export function isLevelInRange(level, pageDefinition) {
  return level >= pageDefinition.minLevel && level < pageDefinition.maxLevel;
}

export function getPageDefinition(pageType, pageKey = "") {
  if (pageType === "score-grid") {
    const pageDefinition = SCORE_GRID_PAGES[pageKey];
    if (!pageDefinition) {
      throw new Error(`Unknown score-grid page key: ${pageKey}`);
    }
    return pageDefinition;
  }

  if (pageType === "exscore-grid") {
    const pageDefinition = SCORE_GRID_PAGES[pageKey];
    if (!pageDefinition) {
      throw new Error(`Unknown exscore-grid page key: ${pageKey}`);
    }
    return pageDefinition;
  }

  if (pageType === "vf-target") {
    return VF_TARGET_PAGE;
  }

  throw new Error(`Unsupported page type: ${pageType}`);
}