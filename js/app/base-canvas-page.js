import { STORAGE_KEYS } from "../config/app-config.js";
import { ProgressManager } from "../services/progress-manager.js";
import { formatDateStamp } from "../utils/formatters.js";

export class BaseCanvasPage {
  constructor({
    pageDefinition,
    uiConfig,
    jacketRepository,
    loadData,
    renderPage
  }) {
    this.pageDefinition = pageDefinition;
    this.uiConfig = uiConfig;
    this.jacketRepository = jacketRepository;
    this.loadData = loadData;
    this.renderPage = renderPage;
    this.progress = new ProgressManager();
    this.isGenerating = false;
  }

  async init() {
    this.cacheDom();
    this.applyPageMeta();
    this.bindCommonEvents();
    this.initFitToggle();

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await this.generate();
  }

  cacheDom() {
    this.canvas = document.getElementById("cv");
    this.canvasWrap = document.getElementById("canvasWrap");
    this.titleElement = document.querySelector(".title");
    this.subtitleElement = document.querySelector(".subtitle");
    this.downloadButton = document.getElementById("download");
    this.downloadForiOSButton = document.getElementById("downloadForiOS");
    this.regenerateButton = document.getElementById("regenerate");
    this.toggleFitButton = document.getElementById("toggleFit");
    this.openLastButton = document.getElementById("openLast");
  }

  applyPageMeta() {
    document.title = this.pageDefinition.title;

    if (this.titleElement) {
      this.titleElement.textContent = this.pageDefinition.title;
    }

    if (this.subtitleElement) {
      this.subtitleElement.textContent = this.pageDefinition.subtitle;
    }
  }

  bindCommonEvents() {
    this.downloadButton?.addEventListener("click", () => this.downloadPng());
    this.regenerateButton?.addEventListener("click", () => this.generate());

    this.openLastButton?.addEventListener("click", (event) => {
      event.preventDefault();

      try {
        const href = localStorage.getItem(STORAGE_KEYS.lastOpen);
        if (href) {
          location.href = href;
        } else {
          alert("まだ履歴がありません。メニューからどれか起動すると記録されます。");
        }
      } catch (_) {
        alert("履歴の取得に失敗しました。");
      }
    });
  }

  initFitToggle() {
    if (!this.canvasWrap || !this.toggleFitButton) return;

    let fit = true;

    try {
      fit = localStorage.getItem(STORAGE_KEYS.canvasFit) !== "0";
    } catch (_) {}

    const apply = () => {
      this.canvasWrap.classList.toggle("fit", fit);
      this.toggleFitButton.setAttribute("aria-pressed", String(fit));
      this.toggleFitButton.textContent = fit ? "表示：フィット" : "表示：実寸";
    };

    apply();

    this.toggleFitButton.addEventListener("click", () => {
      fit = !fit;
      apply();

      try {
        localStorage.setItem(STORAGE_KEYS.canvasFit, fit ? "1" : "0");
      } catch (_) {}
    });
  }

  async generate() {
    if (this.isGenerating) return;
    if (!this.canvas) {
      throw new Error("Canvas element #cv was not found.");
    }

    this.isGenerating = true;
    this.progress.show();

    let succeeded = false;

    try {
      const data = await this.loadData({
        pageDefinition: this.pageDefinition,
        uiConfig: this.uiConfig,
        jacketRepository: this.jacketRepository,
        progress: this.progress
      });

      await this.renderPage({
        canvas: this.canvas,
        data,
        pageDefinition: this.pageDefinition,
        uiConfig: this.uiConfig,
        jacketRepository: this.jacketRepository,
        progress: this.progress
      });

      succeeded = true;
    } catch (error) {
      console.error("Canvas generation error:", error);
      this.progress.update(0, "Error occurred. Please reload.");
    } finally {
      this.isGenerating = false;

      if (succeeded) {
        setTimeout(() => this.progress.hide(), 800);
      }
    }
  }

  downloadPng() {
    if (!this.canvas) return;

    const data_url = this.canvas.toDataURL("image/png");

    const is_ios = /iPhone|iPad|iPod/.test(navigator.userAgent);

    if (is_ios) {
      // iPhone対応（新規タブで開く）
      const new_window = window.open();
      new_window.document.write(`
        <html>
          <body style="margin:0">
            <img src="${data_url}" style="width:100%">
            <p style="text-align:center;font-size:14px">
              長押しして「写真に保存」
            </p>
          </body>
        </html>
      `);
    } else {
      // PC / Android
      const link = document.createElement("a");
      link.href = this.canvas.toDataURL("image/png");
      link.download = `${this.pageDefinition.downloadFilePrefix}_${formatDateStamp()}.png`;
      link.click();
    }
  }
}
