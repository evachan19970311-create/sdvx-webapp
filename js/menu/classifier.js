/**
 * タグ付け・グループ分類ロジック
 * MENU_ITEMS の href 文字列を元に、表示タグとグループを決定します。
 */

/**
 * href に対応するタグ一覧を返す
 * @param {string} href
 * @returns {{ text: string, cls: string }[]}
 */
export function classifyTags(href) {
  const n = href.toLowerCase();
  const tags = [];

  if (n.includes("vf"))                                    tags.push({ text: "VF",      cls: "cyan"   });
  if (n.includes("lv17"))                                  tags.push({ text: "LV17",    cls: "violet" });
  if (n.includes("lv18"))                                  tags.push({ text: "LV18",    cls: "violet" });
  if (n.includes("lv1920") || n.includes("lv19") || n.includes("lv20")) {
    tags.push({ text: "LV19/20", cls: "violet" });
  }
  if (n.includes("exscore"))                               tags.push({ text: "EXSCORE", cls: "pink"   });
  if (n.includes("canvas") || n.includes("grid"))          tags.push({ text: "CANVAS",  cls: "lime"   });

  return tags.length ? tags : [{ text: "HTML", cls: "" }];
}

/**
 * href に対応するプライマリグループキーを返す
 * @param {string} href
 * @returns {string}
 */
export function primaryGroup(href) {
  const n = href.toLowerCase();
  if (n.includes("vf"))                                          return "VF";
  if (n.includes("lv17"))                                        return "LV17";
  if (n.includes("lv18"))                                        return "LV18";
  if (n.includes("lv1920") || n.includes("lv19plus") || n.includes("lv20")) return "LV19/20";
  if (n.includes("exscore"))                                     return "EXSCORE";
  if (n.includes("canvas") || n.includes("grid"))                return "CANVAS";
  return "OTHER";
}

/**
 * アイテム配列をグループごとに Map<string, item[]> へまとめる
 * @param {Array<{href:string, name:string}>} items
 * @returns {Map<string, Array<{href:string, name:string}>>}
 */
export function groupItems(items) {
  const groups = new Map();

  for (const item of items) {
    const key = primaryGroup(item.href);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }

  return groups;
}
