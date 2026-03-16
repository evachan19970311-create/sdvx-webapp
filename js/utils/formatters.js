export function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function formatDisplayDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export function formatInteger(value) {
  return Math.floor(value).toLocaleString("ja-JP");
}

export function fitTextToWidth(ctx, text, maxWidth, ellipsis = "...") {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  const ellipsisWidth = ctx.measureText(ellipsis).width;

  while (trimmed.length > 0) {
    const next = trimmed.slice(0, -1);
    if (ctx.measureText(next).width + ellipsisWidth <= maxWidth) {
      return next + ellipsis;
    }
    trimmed = next;
  }

  return ellipsis;
}
