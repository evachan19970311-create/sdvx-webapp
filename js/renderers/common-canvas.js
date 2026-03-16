import { formatInteger } from "../utils/formatters.js";

export function drawThemedBackground(ctx, canvasWidth, canvasHeight, uiConfig) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, uiConfig.colors.bgTop);
  gradient.addColorStop(1, uiConfig.colors.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.strokeStyle = uiConfig.colors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x <= canvasWidth; x += uiConfig.gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
  }

  for (let y = 0; y <= canvasHeight; y += uiConfig.gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
  }

  ctx.stroke();
}

export function drawNeonTitle(
  ctx,
  { title, subtitle = "", canvasWidth, topY },
  uiConfig
) {
  const centerX = canvasWidth / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = uiConfig.fonts.title;
  ctx.shadowColor = uiConfig.colors.accent;
  ctx.shadowBlur = 40;
  ctx.fillStyle = uiConfig.colors.accent;
  ctx.fillText(title, centerX, topY);

  ctx.shadowBlur = 0;
  ctx.fillStyle = uiConfig.colors.textMain;
  ctx.fillText(title, centerX, topY);

  if (subtitle) {
    ctx.font = uiConfig.fonts.titleSub;
    ctx.fillStyle = uiConfig.colors.textSub;
    ctx.fillText(subtitle, centerX, topY + 70);
  }

  ctx.restore();
}

export function drawGlassPanel(
  ctx,
  { x, y, width, height, accentColor = null },
  uiConfig
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = uiConfig.colors.panel;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = accentColor || uiConfig.colors.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  if (accentColor) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(x, y, 6, height);
  }

  ctx.restore();
}

export function drawStatPanel(ctx, { x, y, width, height, items }, uiConfig) {
  drawGlassPanel(ctx, { x, y, width, height }, uiConfig);

  const stepX = width / items.length;
  ctx.font = uiConfig.fonts.summary;
  ctx.textAlign = "center";

  items.forEach((item, index) => {
    const statX = x + stepX * index + stepX / 2;

    ctx.fillStyle = item.color || uiConfig.colors.textMain;
    ctx.fillText(item.value, statX, y + 80);

    ctx.fillStyle = uiConfig.colors.textSub;
    ctx.font = uiConfig.fonts.summaryLabel;
    ctx.fillText(item.label, statX, y + 40);
    ctx.font = uiConfig.fonts.summary;
  });
}

export function drawTextWithStroke(
  ctx,
  {
    text,
    x,
    y,
    font,
    fillStyle = "#fff",
    strokeStyle = "rgba(0, 0, 0, 0.7)",
    lineWidth = 4,
    textAlign = "left",
    textBaseline = "top"
  }
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.fillStyle = fillStyle;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function createSummaryItemsForScoreGrid(songs, clearColors) {
  const total = songs.length;
  const played = songs.filter((song) => song.score > 0);
  const puc = songs.filter((song) => song.clear === "per").length;
  const uc = songs.filter((song) => song.clear === "uc").length;
  const max = songs.filter((song) => song.clear === "comp_max").length;

  const avgAll = total > 0
    ? songs.reduce((sum, song) => sum + song.score, 0) / total
    : 0;

  const avgPlayed = played.length > 0
    ? played.reduce((sum, song) => sum + song.score, 0) / played.length
    : 0;

  return [
    { label: "AVG", value: formatInteger(avgAll) },
    { label: "AVG(PLAYED)", value: formatInteger(avgPlayed) },
    { label: "PUC", value: `${puc}/${total}`, color: clearColors.per },
    { label: "UC", value: `${uc}/${total}`, color: clearColors.uc },
    { label: "MAX", value: `${max}/${total}`, color: clearColors.comp_max }
  ];
}

export function createSummaryItemsForExScoreGrid(songs, minusLevelColors) {
  const total = songs.length;
  const played = songs.filter((song) => song.exscore > 0).length;
  const top = songs.filter((song) => song.minus === 0).length;
  const m10 = songs.filter((song) => song.minus > -10).length;
  const m20 = songs.filter((song) => song.minus > -20).length;
  const m30 = songs.filter((song) => song.minus > -30).length;
  const m50 = songs.filter((song) => song.minus > -50).length;

  return [
    { label: "PLAYED", value: `${played}/${total}`, color: minusLevelColors.played },
    { label: "TOP", value: `${top}/${total}`, color: minusLevelColors.top },
    { label: "-10↑", value: `${m10}/${total}`, color: minusLevelColors.m10 },
    { label: "-20↑", value: `${m20}/${total}`, color: minusLevelColors.m20 },
    { label: "-30↑", value: `${m30}/${total}`, color: minusLevelColors.m30 },
    { label: "-50↑", value: `${m50}/${total}`, color: minusLevelColors.m50 }
  ];
}
