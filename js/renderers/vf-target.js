import { DIFFICULTY_COLORS, CLEAR_COLORS } from "../config/app-config.js";
import { formatDisplayDate, fitTextToWidth } from "../utils/formatters.js";
import {
  drawThemedBackground,
  drawNeonTitle,
  drawGlassPanel,
  drawStatPanel,
  drawTextWithStroke
} from "./common-canvas.js";

export async function renderVfTargetPage({
  canvas,
  data,
  pageDefinition,
  uiConfig,
  jacketRepository,
  progress
}) {
  progress.update(75, "Calculating layout...");

  const layout = calculateVfLayout(data.items, uiConfig);

  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });

  progress.update(90, "Rendering canvas...");

  drawThemedBackground(ctx, layout.canvasWidth, layout.canvasHeight, uiConfig);
  drawNeonTitle(
    ctx,
    {
      title: pageDefinition.title,
      subtitle: pageDefinition.subtitle,
      canvasWidth: layout.canvasWidth,
      topY: uiConfig.padding + 80
    },
    uiConfig
  );

  drawStatPanel(
    ctx,
    {
      x: uiConfig.padding,
      y: uiConfig.padding + 150,
      width: 720,
      height: 120,
      items: [
        {
          label: "TOTAL VF",
          value: formatTotalVf(data.totalVf),
          color: uiConfig.colors.textMain
        },
        {
          label: "UPDATED",
          value: formatDisplayDate(),
          color: uiConfig.colors.textSub
        }
      ]
    },
    uiConfig
  );

  for (const card of layout.cards) {
    await drawVfCard(ctx, card, jacketRepository, uiConfig);
  }

  progress.update(100, "Complete!");
}

function calculateVfLayout(items, uiConfig) {
  const { width, height, columns, gapX, gapY } = uiConfig.vfCard;
  const rows = Math.ceil(items.length / columns);

  const canvasWidth = uiConfig.padding * 2 + columns * width + (columns - 1) * gapX;
  const startY = uiConfig.headerHeight + uiConfig.padding;
  const canvasHeight =
    startY + rows * height + Math.max(rows - 1, 0) * gapY + uiConfig.padding;

  const cards = items.map((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      item,
      rank: index + 1,
      x: uiConfig.padding + col * (width + gapX),
      y: startY + row * (height + gapY),
      width,
      height
    };
  });

  return {
    canvasWidth,
    canvasHeight,
    cards
  };
}

async function drawVfCard(ctx, card, jacketRepository, uiConfig) {
  const { item, rank, x, y, width, height } = card;
  const jacketSize = uiConfig.vfCard.jacketSize;
  const innerPadding = uiConfig.vfCard.innerPadding;
  const diffColor = DIFFICULTY_COLORS[item.diffName] || {
    border: uiConfig.colors.accent,
    fill: uiConfig.colors.accentSoft
  };

  drawGlassPanel(
    ctx,
    {
      x,
      y,
      width,
      height,
      accentColor: diffColor.border
    },
    uiConfig
  );

  ctx.fillStyle = uiConfig.colors.panelInner;
  ctx.fillRect(x + 2, y + 2, width - 4, height - 4);

  const jacketBgX = x + innerPadding;
  const jacketBgY = y + innerPadding;

  ctx.fillStyle = diffColor.fill;
  ctx.fillRect(jacketBgX, jacketBgY, jacketSize, jacketSize);

  const jacket = await jacketRepository.load(item.jacketId);
  if (jacket) {
    ctx.drawImage(jacket, jacketBgX + 4, jacketBgY + 4, jacketSize - 8, jacketSize - 8);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(jacketBgX + 4, jacketBgY + 4, jacketSize - 8, jacketSize - 8);
  }

  const textX = jacketBgX + jacketSize + innerPadding;
  const rightX = x + width - innerPadding;

  drawTextWithStroke(ctx, {
    text: `# ${rank}`,
    x: textX,
    y: y + innerPadding,
    font: uiConfig.fonts.vfRank,
    fillStyle: uiConfig.colors.textMain
  });

  drawTextWithStroke(ctx, {
    text: String(item.vf),
    x: rightX,
    y: jacketBgY + jacketSize,
    font: uiConfig.fonts.vfValue,
    fillStyle: CLEAR_COLORS[item.clear] || uiConfig.colors.textMain,
    textAlign: "right",
    textBaseline: "bottom"
  });

  ctx.save();
  ctx.font = uiConfig.fonts.vfTitle;
  const titleWidth = width - jacketSize - innerPadding * 3;
  const fittedTitle = fitTextToWidth(ctx, item.musicTitle, titleWidth);
  ctx.restore();

  drawTextWithStroke(ctx, {
    text: fittedTitle,
    x: textX,
    y: y + 54,
    font: uiConfig.fonts.vfTitle,
    fillStyle: uiConfig.colors.textMain
  });

  const badgeX = textX;
  const badgeY = y + 92;
  const badgeWidth = 180;
  const badgeHeight = 38;

  ctx.fillStyle = diffColor.border;
  ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  ctx.fillStyle = diffColor.fill;
  ctx.fillRect(badgeX + 2, badgeY + 2, badgeWidth - 4, badgeHeight - 4);

  drawTextWithStroke(ctx, {
    text: item.diffName,
    x: badgeX + 12,
    y: badgeY + badgeHeight / 2,
    font: uiConfig.fonts.vfMeta,
    fillStyle: uiConfig.colors.textMain,
    textBaseline: "middle"
  });

  drawTextWithStroke(ctx, {
    text: item.level.toFixed(1),
    x: badgeX + badgeWidth - 12,
    y: badgeY + badgeHeight / 2,
    font: uiConfig.fonts.vfMeta,
    fillStyle: uiConfig.colors.textMain,
    textAlign: "right",
    textBaseline: "middle"
  });

  drawTextWithStroke(ctx, {
    text: item.score.toLocaleString("ja-JP"),
    x: badgeX + badgeWidth,
    y: jacketBgY + jacketSize,
    font: uiConfig.fonts.vfMeta,
    fillStyle: uiConfig.colors.textMain,
    textAlign: "right",
    textBaseline: "bottom"
  });
}

function formatTotalVf(totalVf) {
  return (totalVf / 1000).toFixed(3);
}
