import { UI_CONFIG, DATA_PATHS } from "./config/app-config.js";
import { getPageDefinition } from "./config/page-definitions.js";
import { JacketRepository } from "./services/assets.js";
import { loadScoreGridData, loadExScoreGridData ,loadVfTargetData } from "./services/sdvx-data.js";
import { renderScoreGridPage } from "./renderers/score-grid.js";
import { renderExScoreGridPage } from "./renderers/exscore-grid.js";
import { renderVfTargetPage } from "./renderers/vf-target.js";
import { BaseCanvasPage } from "./app/base-canvas-page.js";

window.addEventListener("DOMContentLoaded", async () => {
  const pageType = document.body.dataset.pageType;
  const pageKey = document.body.dataset.pageKey || "";
  const pageDefinition = getPageDefinition(pageType, pageKey);

  const jacketRepository = new JacketRepository(DATA_PATHS.jacketBase);

  let loadData;
  let renderPage;

  switch (pageType) {
    case "score-grid":
      loadData = loadScoreGridData;
      renderPage = renderScoreGridPage;
      break;

    case "exscore-grid":
      loadData = loadExScoreGridData;
      renderPage = renderExScoreGridPage;
      break;

    case "vf-target":
      loadData = loadVfTargetData;
      renderPage = renderVfTargetPage;
      break;

    default:
      throw new Error(`Unsupported page type: ${pageType}`);
  }

  const app = new BaseCanvasPage({
    pageDefinition,
    uiConfig: UI_CONFIG,
    jacketRepository,
    loadData,
    renderPage
  });

  await app.init();
});
