javascript:(async () => {
  // 設定値（必要に応じて調整）
  const CONCURRENCY = 4; // 同時リクエスト数
  const REQUEST_DELAY = 150; // リクエスト間隔（ms）
  
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  
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

  const musicData = await loadExistingData();
  if (!musicData?.length) {
    alert("データが読み込まれませんでした");
    return;
  }

  // UI作成
  const ov = document.createElement("div");
  ov.style.cssText = 
    "position:fixed;top:10px;right:10px;z-index:99999;" +
    "background:#000;color:#0f0;padding:10px 14px;border-radius:8px;" +
    "font-family:monospace;font-size:12px;";
  document.body.appendChild(ov);

  const totalMusic = musicData.length;
  let processedCount = 0;
  let foundCount = 0;
  let unFoundCount = 0;

  console.log(`開始: ${totalMusic}曲を処理します`);

  // DOMParserを使い回し
  const parser = new DOMParser();

  // 1つの難易度を処理する関数
  async function fetchDifficultyScore(music, diffNum) {
    const diffInfo = music[`diff_${diffNum + 1}`];
    if (!diffInfo || diffInfo.level < 17) return null;

    const { diff_name, diff_num, level } = diffInfo;
    
    // type値の計算（元のロジックを維持）
    let type = 0;
    if (diff_num === 4) type = 4;
    else if (diff_num === 5) type = 3;
    else type = diff_num - 1;

    const url = `https://p.eagate.573.jp/game/sdvx/vii/ranking/ranking.html?id=${music.music_id}&type=${type}&score_type=1`;

    try {
      const res = await fetch(url, { credentials: 'include' });
      const html = await res.text();
      const doc = parser.parseFromString(html, 'text/html');
      
      const rank = doc.querySelector('div#rank');
      if (!rank) {
        unFoundCount++;
        return null;
      }

      // データ有無の確認（修正版）
      const dataJudge = rank.querySelector('p')?.textContent.trim() || "";
      if (dataJudge === "データがありません") {
        unFoundCount++;
        return null;
      }

      // 1位スコアの取得
      const block = rank.querySelector('ul#rank_tbl li');
      if (!block) {
        unFoundCount++;
        return null;
      }

      const exscoreText = block.querySelector('div.score')?.textContent.trim() || "0";
      const exscore1st = Number(exscoreText.replace(/\D/g, '')) || 0;
      
      foundCount++;
      return {
        [`diff_${diff_num}`]: {
          num: diff_num,
          name: diff_name,
          level: Number(level),
          exscore1st: exscore1st
        }
      };
      
    } catch (error) {
      console.error(`エラー: ${music.music_title} ${diff_name}`, error);
      unFoundCount++;
      return null;
    }
  }

  // 1曲分の処理
  async function processMusic(music) {
    const difficulties = [];
    
    // 各難易度を処理（j=2〜5 → diff_3〜diff_6）
    for (let j = 2; j < 6; j++) {
      const result = await fetchDifficultyScore(music, j);
      if (result) difficulties.push(result);
    }

    processedCount++;
    ov.textContent = `処理中: ${processedCount}/${totalMusic} (取得: ${foundCount})`;

    if (difficulties.length === 0) return null;

    // 結果をマージ
    const levels = Object.assign({}, ...difficulties);
    return {
      music_id: music.music_id,
      music_title: music.music_title,
      artist: music.artist,
      ...levels
    };
  }

  // 全タスクを作成
  const tasks = musicData.map(music => () => processMusic(music));

  // 並列実行
  const results = await processWithConcurrency(tasks, CONCURRENCY);
  const data = results.filter(r => r !== null);

  console.log(`完了: 取得${foundCount}件、未発見${unFoundCount}件`);
  ov.textContent = `完了! ${data.length}曲のデータを保存`;

  // ダウンロード処理
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `sdvx_exscore_ranking_data.json`;
  a.click();
  
  URL.revokeObjectURL(url);

  async function loadExistingData() {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return resolve([]);
        
        const text = await file.text();
        resolve(JSON.parse(text));
      };
      
      input.click();
    });
  }
})();
