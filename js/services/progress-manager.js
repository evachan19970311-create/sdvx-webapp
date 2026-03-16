export class ProgressManager {
  constructor() {
    this.overlay = document.getElementById("progressOverlay");
    this.fill = document.getElementById("progressFill");
    this.text = document.getElementById("progressText");
  }

  show() {
    this.overlay?.classList.add("active");
  }

  hide() {
    this.overlay?.classList.remove("active");
  }

  update(percent, message) {
    if (this.fill) {
      this.fill.style.width = `${percent}%`;
    }
    if (this.text) {
      this.text.textContent = message;
    }
  }
}
