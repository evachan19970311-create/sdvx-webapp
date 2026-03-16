javascript:(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const DIFF = [
    { c:"nov", i:1, n:"nov" },
    { c:"adv", i:2, n:"adv" },
    { c:"exh", i:3, n:"exh" },
    { c:"mxm", i:4, n:"mxm" },
    { c:"inf", i:5, n:"inf" },
    { c:"grv", i:5, n:"grv" },
    { c:"hvn", i:5, n:"hvn" },
    { c:"vvd", i:5, n:"vvd" },
    { c:"xcd", i:5, n:"xcd" },
    { c:"ult", i:6, n:"ult" }
  ];

  const results = [];

  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;top:10px;right:10px;z-index:99999;" +
    "background:#000;color:#0f0;padding:10px 14px;border-radius:8px";
  document.body.appendChild(ov);

  const sel = document.querySelector("#search_page");
  const totalPage = sel ? sel.options.length : 1;

  let page = 1;
  let music_num = 0;

  while (page <= totalPage) {
    ov.textContent = `Loading ${page}/${totalPage}`;

    console.log("-----------------------------");
    console.log(`Fetching page ${page}...`);
    console.log("-----------------------------");

    const basicUrl =
      `https://p.eagate.573.jp/game/sdvx/vii/music/index.html?page=${page}`;

    const basicRes = await fetch(basicUrl, { credentials: 'include' });
    const basicHtml = await basicRes.text();

    const basicDoc = new DOMParser().parseFromString(basicHtml, 'text/html');
    const basicBlocks = basicDoc.querySelectorAll('div.music');

    if (basicBlocks.length === 0) break;

    for (const b of basicBlocks) {
      const a = b.querySelector('a.detail_pop');
      if (!a) return;

      const music_id =
        new URL(a.href).searchParams.get('music_id');
      
      console.log(`Found music_id: ${music_id}`);
      if (!music_id) return;

      const infoPs = b.querySelectorAll('.info p');
      const levelPs = b.querySelectorAll('.level p');

      const music_title = infoPs[0]?.textContent.trim() || "Unknown Title";
      const artist = infoPs[1]?.textContent.trim() || "Unknown Artist";

      console.log(`Title: ${music_title}`);
      console.log(`Artist: ${artist}`);

      const jacketIds = await getJacketId(music_id);
      const diffs = await setLevels(DIFF,levelPs, jacketIds);

      console.log(diffs);

      results.push({
        music_num: music_num,
        music_id: music_id,
        music_title: music_title,
        artist: artist,
        ...diffs
      });
      music_num++;
      console.log("---------------");
    };

    page++;
    await sleep(500);
  }

  ov.textContent = `Done! ${results.length} songs`;

  const json = JSON.stringify(results, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'sdvx_music_data.json';
  a.click();

  URL.revokeObjectURL(url);

  async function getJacketId(music_id) {
    const datailUrl =
      `https://p.eagate.573.jp/game/sdvx/vii/music/detail.html?music_id=${music_id}`;

    const datailRes = await fetch(datailUrl, { credentials: 'include' });
    const datailHtml = await datailRes.text();

    const datailDoc = new DOMParser().parseFromString(datailHtml, 'text/html');
    const datailBlocks = datailDoc.querySelectorAll('div.cat');

    const jacketIds = [];

    datailBlocks.forEach(c => {
      const diffP = c.querySelector('p');
      if (!diffP) return;

      const diff_name = diffP.classList[0];
      const diff_num = DIFF.find(d => d.c === diff_name)?.i;

      const img = c.querySelector('img');
      if (!img) return;

      const jacket_id =
        new URL(img.src).searchParams.get('img');
      
      jacketIds[`diff_${diff_num}`] = {
        jacket_id
      };
    });

    return jacketIds;
  }

  async function setLevels(DIFF,levelPs, jacketIds) {
    const diffs = [];

    levelPs.forEach(e => {
      const diff_name = e.classList[0];
      const diff_num = DIFF.find(d => d.c === diff_name)?.i;
      const level = Number(e.textContent.trim());

      if(!level) return;

      diffs[`diff_${diff_num}`] = {
          diff_num: diff_num,
          diff_name: diff_name,
          level: level || null,
          jacket_id: jacketIds?.[`diff_${diff_num}`]?.jacket_id ?? null
      };
    });

    return diffs;
  }
})();
