javascript:(async () => {
  // 設定値（環境に応じて調整）
  const CONCURRENCY = 6;        // 同時リクエスト数
  const REQUEST_DELAY = 100;    // リクエスト間隔（ms）
  const PAGE_DELAY = 200;       // ページ間待機時間（ms）

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const DIFF = [
    { id: "novice",   n: 1, c: "nov" },
    { id: "advanced", n: 2, c: "adv" },
    { id: "exhaust",  n: 3, c: "exh" },
    { id: "maximum",  n: 4, c: "mxm" },
    { id: "infinite", n: 5, c: "inf" },
    { id: "ultimate", n: 6, c: "ult" }
  ];

  // 並列処理制御関数
  async function processWithConcurrency(tasks, limit) {
    const results = [];
    const executing = [];
    
    for (const task of tasks) {
      const promise = task().then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      });
      
      results.push(promise);
      executing.push(promise);
      
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
      
      await sleep(REQUEST_DELAY);
    }
    
    return Promise.all(results);
  }

  // UI作成
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;top:10px;right:10px;z-index:99999;" +
    "background:#000;color:#0f0;padding:10px 14px;border-radius:8px;" +
    "font-family:monospace;font-size:12px;line-height:1.4;";
  document.body.appendChild(ov);

  const parser = new DOMParser();

  // 総ページ数取得
  const musicBaseUrl = "https://p.eagate.573.jp/game/sdvx/vii/playdata/musicdata/index.html";
  const musicRes = await fetch(musicBaseUrl, { credentials: 'include' });
  const musicHtml = await musicRes.text();
  const musicDoc = parser.parseFromString(musicHtml, 'text/html');
  const sel = musicDoc.querySelector("#search_page");
  const totalPage = sel ? sel.options.length : 1;

  console.log(`総ページ数: ${totalPage}`);

  // 1曲の全難易度のEXスコアを一括取得
  async function getAllExScores(music_id) {
    const detailUrl = 
      `https://p.eagate.573.jp/game/sdvx/vii/playdata/musicdata/data_detail.html?music_id=${music_id}`;

    try {
      const detailRes = await fetch(detailUrl, { credentials: 'include' });
      const detailHtml = await detailRes.text();
      const detailDoc = parser.parseFromString(detailHtml, 'text/html');

      const exscores = {};

      // 各難易度のEXスコアを抽出
      for (const diff of DIFF) {
        const block = detailDoc.querySelector(`div#${diff.id}`);
        if (!block) {
          exscores[diff.id] = 0;
          continue;
        }

        let maxExscore = 0;

        block.querySelectorAll("li").forEach(li => {
          const label = li.querySelector(".col")?.textContent.trim() || "";
          const valueText = li.querySelector(".cnt")?.textContent || "";
          const value = Number(valueText.replace(/\D/g, "")) || 0;

          // EXスコア関連のラベルを検出（サイトの表記に応じて調整）
          if (label.includes("EX") || label === "EX SCORE") {
            maxExscore = Math.max(maxExscore, value);
          }
        });

        exscores[diff.id] = maxExscore;
      }

      return exscores;

    } catch (error) {
      console.error(`EXスコア取得エラー (music_id: ${music_id}):`, error);
      // エラー時は全て0を返す
      const empty = {};
      DIFF.forEach(diff => empty[diff.id] = 0);
      return empty;
    }
  }

  // 1曲分のデータを処理
  async function processSong(songData) {
    const { music_id, music_title, artist, listScores } = songData;

    // スコアが1つもない場合はスキップ
    if (Object.keys(listScores).length === 0) {
      return null;
    }

    try {
      // 詳細ページから全難易度のEXスコアを一括取得
      const exscores = await getAllExScores(music_id);

      const scores = {};

      // リストページのスコアと詳細ページのEXスコアを結合
      for (const diff of DIFF) {
        const listScore = listScores[`diff_${diff.n}`];
        if (listScore) {
          scores[`diff_${diff.n}`] = {
            diff_num: diff.n,
            score: listScore.score,
            exscore: exscores[diff.id] || 0
          };
        }
      }

      return {
        music_id,
        music_title,
        artist,
        ...scores
      };

    } catch (error) {
      console.error(`楽曲処理エラー: ${music_title}`, error);
      return null;
    }
  }

  // メイン処理
  const allMusics = [];
  let totalProcessed = 0;

  for (let page = 1; page <= totalPage; page++) {
    ov.textContent = `ページ ${page}/${totalPage} 読み込み中...`;
    
    console.log(`ページ ${page} を処理中...`);

    const url = `https://p.eagate.573.jp/game/sdvx/vii/playdata/musicdata/index.html?page=${page}`;
    
    try {
      const res = await fetch(url, { credentials: 'include' });
      const html = await res.text();
      const doc = parser.parseFromString(html, 'text/html');
      
      const scoreList = doc.querySelector('div#pc-list');
      if (!scoreList) break;
      
      const blocks = scoreList.querySelectorAll('tr.data_col');
      if (blocks.length === 0) break;

      console.log(`ページ ${page}: ${blocks.length}曲を発見`);

      // このページの楽曲データを準備
      const pageSongs = [];

      for (const block of blocks) {
        const tds = block.querySelectorAll('td');
        const a = block.querySelector('a.detail_pop');
        const c = block.querySelector('.artist');
        
        if (!a) continue;

        const music_id = new URL(a.href).searchParams.get('music_id');
        if (!music_id) continue;

        const music_title = a.textContent.trim() || "Unknown Title";
        const artist = c?.textContent.trim() || "Unknown Artist";

        // リストページのスコア情報を取得
        const listScores = {};

        for (const diff of DIFF) {
          const diff_td = Array.from(tds).find(td => td.classList.contains(diff.c));
          if (!diff_td) continue;
          
          const scoreText = diff_td.textContent.trim();
          if (!scoreText || scoreText === "-") continue;

          const score = Number(scoreText.replace(/\D/g, ""));
          if (score > 0) {
            listScores[`diff_${diff.n}`] = {
              diff_num: diff.n,
              score: score
            };
          }
        }

        // スコアがある楽曲のみを処理対象に追加
        if (Object.keys(listScores).length > 0) {
          pageSongs.push({ music_id, music_title, artist, listScores });
        }
      }

      // 並列処理でEXスコアを取得
      if (pageSongs.length > 0) {
        ov.textContent = `ページ ${page}/${totalPage}: ${pageSongs.length}曲処理中...`;
        
        const tasks = pageSongs.map(song => () => processSong(song));
        const results = await processWithConcurrency(tasks, CONCURRENCY);
        
        const validResults = results.filter(r => r !== null);
        allMusics.push(...validResults);
        totalProcessed += validResults.length;

        console.log(`ページ ${page} 完了: ${validResults.length}曲処理`);
      }

      // 次のページへ移行前の待機
      if (page < totalPage) {
        await sleep(PAGE_DELAY);
      }

    } catch (error) {
      console.error(`ページ ${page} の処理エラー:`, error);
      continue;
    }
  }

  console.log(`処理完了: 合計 ${allMusics.length} 曲`);
  ov.textContent = `完了! ${allMusics.length}曲を保存中...`;

  // データをダウンロード
  const json = JSON.stringify(allMusics, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `sdvx_exscore_data.json`;
  a.click();

  URL.revokeObjectURL(url);
})();
