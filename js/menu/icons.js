/**
 * SVGアイコン生成関数
 * 各関数は color 文字列を受け取り SVG 文字列を返します。
 */

export function iconVF(color) {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17.5V6.5"  stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <path d="M8 15.5V8.5"  stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
      <path d="M12 18V6"     stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".95"/>
      <path d="M16 14.5V9.5" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
      <path d="M20 16.5V7.5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

export function iconScore(color) {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 20h10"             stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 17V7a3 3 0 1 1 6 0v10" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <path d="M8 11h8"              stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    </svg>
  `;
}

export function iconCanvas(color) {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14v10H5z" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M8 14l2-2 2 2 4-4 2 2" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      <path d="M7.5 9.5h0" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `;
}

export function iconLevel(color) {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 18V6"  stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 18V9" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      <path d="M17 18V12" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
      <path d="M6 18h12"  stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    </svg>
  `;
}

export function iconOther(color) {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7h10v10H7z" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M9 10h6" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
      <path d="M9 14h6" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    </svg>
  `;
}

/**
 * href から適切なアイコンを自動選択して返す
 * @param {string} href
 * @returns {string} SVG文字列
 */
export function iconForItem(href) {
  const n = href.toLowerCase();
  if (n.includes("vf"))      return iconVF("var(--cyan)");
  if (n.includes("exscore")) return iconScore("var(--pink)");
  if (n.includes("canvas"))  return iconCanvas("var(--lime)");
  if (n.includes("lv"))      return iconLevel("var(--violet)");
  return iconOther("rgba(233,236,255,.7)");
}

/**
 * グループキーからセクションアイコンを返す
 * @param {string} groupKey
 * @param {string} accent CSS カスタムプロパティ文字列
 * @returns {string} SVG文字列
 */
export function iconForGroup(groupKey, accent) {
  switch (groupKey) {
    case "VF":      return iconVF(accent);
    case "LV17":
    case "LV18":
    case "LV19/20": return iconLevel(accent);
    case "EXSCORE": return iconScore(accent);
    case "CANVAS":  return iconCanvas(accent);
    default:        return iconOther(accent);
  }
}
