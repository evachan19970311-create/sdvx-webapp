javascript:(async () => {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;top:10px;right:10px;z-index:99999;" +
    "background:#000;color:#0f0;padding:10px 14px;border-radius:8px";
  document.body.appendChild(ov);

  const profiles = [];

  const profileUrl =
    `https://p.eagate.573.jp/game/sdvx/vii/playdata/profile/index.html`;
    
  const profoileRes = await fetch(profileUrl, { credentials: 'include' });
  const profileHtml = await profoileRes.text();

  const profileDoc = new DOMParser().parseFromString(profileHtml, 'text/html');
  const profile = profileDoc.querySelector('div#profile');
  const profileLi = profileDoc.querySelectorAll('ul#profile_li li');
  const playerId = profile.querySelector('div#player_id').textContent.trim();
  const playerName = profile.querySelectorAll('div#player_name p')[1].textContent.trim();
  const vf = profile.querySelector('div#force_point').textContent.trim();
  const vfClass = profile.querySelector('div.force_class').id;
  const vfLevel = profile.querySelector('div.force_level').id;
  const playCount = profileLi[0].querySelector('div.profile_cnt').textContent.trim();

  profiles.push({
    playerId: playerId,
    playerName: playerName,
    vf:vf,
    vfClass: vfClass,
    vfLevel: vfLevel,
    playCount: playCount,
    update: formatDisplayDate()
  });

  ov.textContent = `Profile Data Export Done!`;

  const json = JSON.stringify(profiles, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'sdvx_profile_data.json';
  a.click();

  URL.revokeObjectURL(url);

  function formatDisplayDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}
})();