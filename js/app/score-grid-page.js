import { ProgressManager } from "../services/progress-manager.js";
import { JacketRepository } from "../services/jacket-repository.js";
import { loadGridSongs } from "../services/sdvx-data-service.js";
import { calculateLayout } from "../renderers/layout-calculator.js";
import { renderCanvas } from "../renderers/canvas-renderer.js";
import { DATA_PATHS } from "../config/ui-config.js";

export class ScoreGridPage {
  constructor({ pageDefinition, uiConfig }) {
    this.pageDefinition = pageDefinition;
    this.uiConfig = uiConfig;
    this.progress = new ProgressManager();
    this.jacketRepository = new JacketRepository(DATA_PATHS.jacketBase);
    this.isGenerating = false;
  }

  async init() {
    this.cacheDom();
    this.applyPageMeta();
    this.bindEvents();
    this.initFitToggle();
    await this.generate();
  }

  cacheDom() {
    this.canvas = document.getElementById("cv");
    this.canvasWrap = document.getElementById("canvasWrap");
    this.downloadButton = document.getElementById("download");
    this.regenerateButton = document.getElementById("regenerate");
    this.toggleFitButton = document.getElementById("toggleFit");
    this.titleElement = document.querySelector(".title");
    this.subtitleElement = document.querySelector(".subtitle");
  }

  applyPageMeta() {
    document.title = this.pageDefinition.title;
    if (this.titleElement) this.titleElement.textContent = this.pageDefinition.title;
    if (this.subtitleElement) this.subtitleElement.textContent = this.pageDefinition.subtitle;
  }

  bindEvents() {
    this.downloadButton?.addEventListener("click", () => this.downloadPng());
    this.regenerateButton?.addEventListener("click", () => this.generate());
  }

  initFitToggle() {
    let isFit = true;

    const apply = () => {
      this.canvasWrap.classList.toggle("fit", isFit);
      this.toggleFitButton.textContent = isFit ? "表示：フィット" : "表示：実寸";
      this.toggleFitButton.setAttribute("aria-pressed", String(!isFit));
    };

    apply();

    this.toggleFitButton?.addEventListener("click", () => {
      isFit = !isFit;
      apply();
    });
  }

  async generate() {
    if (this.isGenerating) return;

    this.isGenerating = true;
    let succeeded = false;

    try {
      this.progress.show();
      this.progress.update(5, "Loading data files...");

      const songs = await loadGridSongs(this.pageDefinition);

      this.progress.update(20, "Merging data...");

      const jacketIds = songs.map((song) => song.jacketId);
      await this.preloadJackets(jacketIds);

      this.progress.update(85, "Calculating layout...");

      const canvasWidth = this.getCanvasWidth();
      const layoutData = calculateLayout(songs, canvasWidth, this.uiConfig);

      this.canvas.width = canvasWidth;
      this.canvas.height = layoutData.totalHeight;

      const ctx = this.canvas.getContext("2d", {
        alpha: false,
        desynchronized: true
      });

      this.progress.update(95, "Rendering canvas...");

      await renderCanvas({
        ctx,
        songs,
        layoutData,
        canvasWidth,
        canvasHeight: layoutData.totalHeight,
        pageDefinition: this.pageDefinition,
        uiConfig: this.uiConfig,
        jacketRepository: this.jacketRepository
      });

      this.progress.update(100, "Complete!");
      succeeded = true;
    } catch (error) {
      console.error("Generation error:", error);
      this.progress.update(0, "Error occurred. Please reload.");
    } finally {
      this.isGenerating = false;
      if (succeeded) {
        setTimeout(() => this.progress.hide(), 800);
      }
    }
  }

  async preloadJackets(jacketIds) {
    await this.jacketRepository.preload(
      jacketIds,
      this.uiConfig.preloadBatchSize,
      ({ loaded, total }) => {
        const percent = total === 0
          ? 80
          : 40 + Math.floor((loaded / total) * 40);

        this.progress.update(
          percent,
          `Loading jackets... ${loaded}/${total}`
        );
      }
    );
  }

  getCanvasWidth() {
    return this.uiConfig.padding * 2 +
      this.uiConfig.maxCols * (this.uiConfig.jacketSize + this.uiConfig.jacketMargin) -
      this.uiConfig.jacketMargin;
  }

  downloadPng() {
    const link = document.createElement("a");
    link.href = this.canvas.toDataURL("image/png");
    link.download = `${this.pageDefinition.downloadFilePrefix}_${this.getDateStamp()}.png`;
    link.click();
  }

  getDateStamp() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }
}
