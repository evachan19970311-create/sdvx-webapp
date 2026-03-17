import { MINUS_LEVEL_COLORS, DIFFICULTY_COLORS } from "../config/app-config.js";
import {
  drawThemedBackground,
  drawNeonTitle,
  drawStatPanel,
  createSummaryItemsForExScoreGrid
} from "./common-canvas.js";

export async function renderExScoreGridPage({
  canvas,
  data: songs,
  pageDefinition,
  uiConfig,
  jacketRepository,
  progress
}) {
  progress.update(75, "Calculating layout...");

  const canvasWidth = getScoreGridCanvasWidth(uiConfig);
  const layout = calculateScoreGridLayout(songs, canvasWidth, uiConfig);

  canvas.width = canvasWidth;
  canvas.height = layout.totalHeight;

  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });

  progress.update(90, "Rendering canvas...");

  drawThemedBackground(ctx, canvasWidth, layout.totalHeight, uiConfig);
  drawNeonTitle(
    ctx,
    {
      title: pageDefinition.title,
      subtitle: pageDefinition.subtitle,
      canvasWidth,
      topY: uiConfig.padding + 80
    },
    uiConfig
  );

  const summaryWidth = uiConfig.summaryBox.width;
  const summaryHeight = uiConfig.summaryBox.height;
  const summaryX = canvasWidth - summaryWidth - uiConfig.padding;
  const summaryY = uiConfig.padding + 150;

  drawStatPanel(
    ctx,
    {
      x: summaryX,
      y: summaryY,
      width: summaryWidth,
      height: summaryHeight,
      items: createSummaryItemsForExScoreGrid(songs, MINUS_LEVEL_COLORS)
    },
    uiConfig
  );

  drawSections(ctx, layout.sections, uiConfig);
  await drawJackets(ctx, layout.jackets, jacketRepository, uiConfig);

  progress.update(100, "Complete!");
}

function getScoreGridCanvasWidth(uiConfig) {
  return (
    uiConfig.padding * 2 +
    uiConfig.maxCols * (uiConfig.jacketSize + uiConfig.jacketMargin) -
    uiConfig.jacketMargin
  );
}

function calculateScoreGridLayout(songs, canvasWidth, uiConfig) {
  const groups = new Map();

  songs.forEach((song) => {
    // ★ レベル20以上を20にまとめる（表示用）
    const displayLevel = song.level >= 20 ? 20 : song.level;

    if (!groups.has(displayLevel)) {
      groups.set(displayLevel, []);
    }
    groups.get(displayLevel).push(song);
  });

  const levels = [...groups.keys()].sort((a, b) => b - a);

  const layout = {
    sections: [],
    jackets: [],
    totalHeight: 0
  };

  let currentY = uiConfig.headerHeight + uiConfig.padding;

  for (const level of levels) {
    const levelSongs = groups.get(level);
    
    // ★ レベル20グループ内では元レベル→マイナス値でソート
    if (level === 20) {
      levelSongs.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;     // 元レベル降順
        if (b.minus !== a.minus) return b.minus - a.minus;     // マイナス値昇順
        return b.musicNum - a.musicNum;                        // 楽曲番号降順
      });
    }
    
    const rows = Math.ceil(levelSongs.length / uiConfig.maxCols);

    layout.sections.push({
      level,
      count: levelSongs.length,
      x: uiConfig.padding,
      y: currentY,
      width: canvasWidth - uiConfig.padding * 2,
      height: uiConfig.sectionHeight
    });

    currentY += uiConfig.sectionHeight + uiConfig.sectionMargin;

    levelSongs.forEach((song, index) => {
      const col = index % uiConfig.maxCols;
      const row = Math.floor(index / uiConfig.maxCols);

      layout.jackets.push({
        song,
        x: uiConfig.padding + col * (uiConfig.jacketSize + uiConfig.jacketMargin),
        y: currentY + row * (uiConfig.jacketSize + uiConfig.jacketMargin),
        size: uiConfig.jacketSize
      });
    });

    currentY +=
      rows * (uiConfig.jacketSize + uiConfig.jacketMargin) + uiConfig.padding;
  }

  layout.totalHeight = currentY;
  return layout;
}

function drawSections(ctx, sections, uiConfig) {
  ctx.font = uiConfig.fonts.section;

  for (const section of sections) {
    const grad = ctx.createLinearGradient(
      section.x,
      0,
      section.x + section.width,
      0
    );
    grad.addColorStop(0, "rgba(0, 229, 255, 0.15)");
    grad.addColorStop(1, "rgba(0, 229, 255, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(section.x, section.y, section.width, section.height);

    ctx.fillStyle = uiConfig.colors.accent;
    ctx.fillRect(section.x, section.y, 6, section.height);

    // ★ レベル表示の改善
    const levelText = section.level === 20 ? "LEVEL 20+" : `LEVEL ${section.level.toFixed(1)}`;

    ctx.fillStyle = uiConfig.colors.textMain;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      levelText,
      section.x + 25,
      section.y + section.height / 2
    );

    ctx.font = uiConfig.fonts.summary;
    ctx.fillStyle = uiConfig.colors.textSub;
    ctx.textAlign = "right";
    ctx.fillText(
      `${section.count} TRACKS`,
      section.x + section.width - 25,
      section.y + section.height / 2
    );
    ctx.font = uiConfig.fonts.section;
  }
}

async function drawJackets(ctx, jackets, jacketRepository, uiConfig) {
  for (const jacket of jackets) {
    await drawJacket(ctx, jacket, jacketRepository, uiConfig);
  }
}

async function drawJacket(ctx, jacketData, jacketRepository, uiConfig) {
  const { song, x, y, size } = jacketData;
  const img = await jacketRepository.load(song.jacketId);

  if (song.clear === "per" || song.clear === "uc") {
    ctx.save();
    ctx.shadowColor = song.clear === "per" ? "#f1ef77" : "#f889af";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
    ctx.restore();
  }

  ctx.fillStyle = DIFFICULTY_COLORS[song.diffName]?.border || "#333";
  ctx.fillRect(x - 3, y - 3, size + 6, size + 6);

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, size, size);
  }

  if (song.exscore > 0) {
    const exscoreHeight = size * 0.3;
    const exscoreY = y + size - exscoreHeight;

    const exscoreGrad = ctx.createLinearGradient(0, exscoreY, 0, y + size);
    exscoreGrad.addColorStop(0, "rgba(0,0,0,0.6)");
    exscoreGrad.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = exscoreGrad;
    ctx.fillRect(x, exscoreY, size, exscoreHeight);

    ctx.fillStyle = MINUS_LEVEL_COLORS[song.minusAch] || "#fff";
    ctx.font = uiConfig.fonts.exscore;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    ctx.fillText(
      song.minus,
      x + size / 2,
      y + size * 0.85
    );
  }
}
