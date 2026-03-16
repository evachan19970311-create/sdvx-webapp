javascript:(async () => {
  const sleep = t => new Promise(r => setTimeout(r, t));

  const DIFF = [
    { c:"nov", i:1},
    { c:"adv", i:2 },
    { c:"exh", i:3},
    { c:"mxm", i:4},
    { c:"inf", i:5},
    { c:"ult", i:6}
  ];

  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;top:10px;right:10px;z-index:99999;" +
    "background:#000;color:#0f0;padding:10px 14px;border-radius:8px";
  document.body.appendChild(ov);

  const musicBaseUrl = "https://p.eagate.573.jp/game/sdvx/vii/playdata/musicdata/index.html";
  const musicRes = await fetch(musicBaseUrl, { credentials: 'include' });
  const musicHtml = await musicRes.text();

  const musicDoc = new DOMParser().parseFromString(musicHtml, 'text/html');
  const sel = musicDoc.querySelector("#search_page");
  const totalPage = sel ? sel.options.length : 1;

  const musics = [];

  let page = 1;

  while (page <= totalPage) {
    ov.textContent = `Loading ${page}/${totalPage}`;

    console.log("-----------------------------");
    console.log(`Fetching page ${page}...`);
    console.log("-----------------------------");

    const musicUrl =
      `https://p.eagate.573.jp/game/sdvx/vii/playdata/musicdata/index.html?page=${page}`;
    
    const Res = await fetch(musicUrl, { credentials: 'include' });
    const Html = await Res.text();

    const Doc = new DOMParser().parseFromString(Html, 'text/html');
    const scoreList = Doc.querySelector('div#pc-list');
    const Blocks = scoreList.querySelectorAll('tr.data_col');
    if (Blocks.length === 0) break;

    console.log(`Found ${Blocks.length} songs on this page.`);

    for (const b of Blocks) {
      const tds = b.querySelectorAll('td');
      const a = b.querySelector('a.detail_pop');
      const c = b.querySelector('.artist');
      if (!a) return;

      const music_id =
        new URL(a.href).searchParams.get('music_id');
      if (!music_id) return;

      const music_title = a.textContent.trim() || "Unknown Title";
      const artist = c.textContent.trim() || "Unknown Artist";
      
      console.log(`Found music_id: ${music_id}`);
      console.log(`music_title: ${music_title}`);
      console.log(`artist: ${artist}`);

      const scores = [];

      for (const diff of DIFF) {
        const diff_td = Array.from(tds).find(td => td.classList.contains(diff.c));
        if (!diff_td) continue;
        const score = diff_td.textContent.trim();
        const clear = diff_td.querySelectorAll('img')[0]?.src.match(/rival_mark_([^\.]+)\.png/)?.[1] || "no image";
        const grade = diff_td.querySelectorAll('img')[1]?.src.match(/rival_grade_([^\.]+)\.png/)?.[1] || "no image";
        if (score) {
          scores[`diff_${diff.i}`] = {
            diff_num: diff.i,
            score: Number(score),
            clear: clear,
            grade: grade
          };
        }
      }
      console.log(scores);

      musics.push({
        music_id: music_id,
        music_title:music_title,
        artist:artist,
        ...scores,
      });
    }
    page++;
    await sleep(500);
  }

  ov.textContent = `Done! ${musics.length} songs`;

  const json = JSON.stringify(musics, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'sdvx_score_data.json';
  a.click();

  URL.revokeObjectURL(url);
})();