/* ====== IndexedDB自動管理システム ====== */
class ScoreVersionManager {
  constructor() {
    this.dbName = 'SDVXDiffTracker';
    this.version = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // スコア履歴ストア
        if (!db.objectStoreNames.contains('scoreSnapshots')) {
          const store = db.createObjectStore('scoreSnapshots', { 
            keyPath: 'id', autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('dateString', 'dateString', { unique: false });
        }
        
        // 楽曲マスターデータ
        if (!db.objectStoreNames.contains('musicMaster')) {
          const store = db.createObjectStore('musicMaster', { keyPath: 'music_id' });
          store.createIndex('music_num', 'music_num', { unique: false });
        }
        
        // 差分結果キャッシュ
        if (!db.objectStoreNames.contains('diffResults')) {
          const store = db.createObjectStore('diffResults', { keyPath: 'id' });
          store.createIndex('fromSnapshot', 'fromSnapshot', { unique: false });
        }
      };
    });
  }

  async saveSnapshot(musicData, scoreData) {
    const timestamp = Date.now();
    const dateString = new Date().toLocaleString('ja-JP');
    
    // VF計算
    const { totalVF, top50Songs } = this.calculateVF(musicData, scoreData);
    
    const snapshot = {
      timestamp,
      dateString,
      musicData,
      scoreData,
      totalVF,
      songCount: musicData.length,
      metadata: {
        version: '2.0',
        created: new Date().toISOString()
      }
    };

    // 楽曲データ更新
    const musicTx = this.db.transaction(['musicMaster'], 'readwrite');
    const musicStore = musicTx.objectStore('musicMaster');
    
    for (const music of musicData) {
      await new Promise((resolve, reject) => {
        const req = musicStore.put(music);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    // スナップショット保存
    const snapTx = this.db.transaction(['scoreSnapshots'], 'readwrite');
    const snapStore = snapTx.objectStore('scoreSnapshots');
    
    return new Promise((resolve, reject) => {
      const request = snapStore.add(snapshot);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  calculateVF(musicData, scoreData) {
    const scoreMap = new Map();
    scoreData.forEach(s => {
      Object.entries(s).forEach(([k, v]) => {
        if (k.startsWith("diff_")) {
          scoreMap.set(`${s.music_title}_${s.artist}_${k}`, v);
        }
      });
    });

    const allSongs = [];
    musicData.forEach(m => {
      Object.entries(m).forEach(([k, v]) => {
        if (!k.startsWith("diff_") || !v.level) return;
        
        const key = `${m.music_title}_${m.artist}_${k}`;
        const score = scoreMap.get(key) || { score: 0, clear: "no", grade: "" };
        
        if (score.score > 0) {
          const vf = this.calcVFSingle(v.level, score.score, score.grade, score.clear);
          allSongs.push({
            music_title: m.music_title,
            level: v.level,
            vf,
            ...score
          });
        }
      });
    });

    allSongs.sort((a, b) => b.vf - a.vf);
    const top50Songs = allSongs.slice(0, 50);
    const totalVF = top50Songs.reduce((sum, s) => sum + s.vf, 0);

    return { totalVF, top50Songs, allSongs };
  }

  calcVFSingle(level, score, grade, clear) {
    const G = {s:1.05, aaa_plus:1.02, aaa:1, aa_plus:0.97, aa:0.94, a_plus:0.91, a:0.88, b:0.85, c:0.82, d:0.8};
    const C = {per:1.1, uc:1.06, comp_max:1.04, comp_ex:1.02, comp:1};
    return Math.floor(level * (score / 1e7) * (G[grade] || 0.8) * (C[clear] || 1) * 20);
  }

  async getSnapshots() {
    const transaction = this.db.transaction(['scoreSnapshots'], 'readonly');
    const store = transaction.objectStore('scoreSnapshots');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const snapshots = request.result;
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        resolve(snapshots);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestSnapshot() {
    const snapshots = await this.getSnapshots();
    return snapshots.length > 0 ? snapshots[0] : null;
  }

  async getPreviousSnapshot() {
    const snapshots = await this.getSnapshots();
    return snapshots.length > 1 ? snapshots[1] : null;
  }

  async clearAllData() {
    const stores = ['scoreSnapshots', 'musicMaster', 'diffResults'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

/* ====== Canvas描画システム ====== */
class DiffCanvasRenderer {
  constructor() {
    this.config = {
      JACKET_SIZE: 100,
      ITEM_HEIGHT: 120,
      ITEM_MARGIN: 12,
      HEADER_HEIGHT: 320,
      STATS_HEIGHT: 100,
      PADDING: 100,
      MAX_COLS: 3,
      MAX_DISPLAY: 60,
      
      COLORS: {
        BG_TOP: "#0a0e1a",
        BG_BOTTOM: "#1a1f35",
        ACCENT: "#00e5ff",
        ACCENT_SECONDARY: "#00ff88",
        TEXT_MAIN: "#ffffff",
        TEXT_SUB: "#aab2bd",
        CARD_BG: "rgba(20, 25, 40, 0.95)",
        GRID: "rgba(0, 229, 255, 0.03)"
      },
      
      FONTS: {
        TITLE: "900 90px 'Orbitron'",
        SUBTITLE: "700 28px 'Inter'",
        ITEM_TITLE: "700 20px 'Inter'",
        ITEM_SCORE: "700 26px 'Orbitron'",
        STATS: "700 36px 'Orbitron'"
      }
    };

    this.jacketCache = new Map();
    this.diffColors = {
      NOV: "#5a49fb", ADV: "#fbb649", EXH: "#fb494c", MXM: "#acacac",
      INF: "#ee65e5", GRV: "#fb8f49", HVN: "#49c9fb", VVD: "#ff59cd",
      XCD: "#187fff", ULT: "#ffdd57"
    };
    
    this.clearColors = {
      per: "#f1ef77", uc: "#f889af", comp_max: "#dfdfdf",
      comp_ex: "#ae73ee", comp: "#6eebaf", play: "#225239", "": "#225239", no: "#333"
    };
  }

  async loadJacket(id) {
    if (!id || this.jacketCache.has(id)) return this.jacketCache.get(id);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { this.jacketCache.set(id, img); resolve(img); };
      img.onerror = () => resolve(null);
      img.src = `images/jacket/${id}.jpg`;
    });
  }

  calculateLayout(diffData) {
    const displayCount = Math.min(diffData.length, this.config.MAX_DISPLAY);
    const rows = Math.ceil(displayCount / this.config.MAX_COLS);
    
    const itemWidth = (this.config.JACKET_SIZE * 6);
    const totalItemsWidth = this.config.MAX_COLS * itemWidth + (this.config.MAX_COLS - 1) * this.config.ITEM_MARGIN;
    
    const canvasWidth = this.config.PADDING * 2 + totalItemsWidth;
    const canvasHeight = this.config.PADDING * 2 + this.config.HEADER_HEIGHT + 
                        this.config.STATS_HEIGHT + rows * (this.config.ITEM_HEIGHT + this.config.ITEM_MARGIN);

    const layoutData = { width: canvasWidth, height: canvasHeight, items: [] };
    
    const startY = this.config.PADDING + this.config.HEADER_HEIGHT + this.config.STATS_HEIGHT + 40;
    
    for (let i = 0; i < displayCount; i++) {
      const col = i % this.config.MAX_COLS;
      const row = Math.floor(i / this.config.MAX_COLS);
      
      const x = this.config.PADDING + col * (itemWidth + this.config.ITEM_MARGIN);
      const y = startY + row * (this.config.ITEM_HEIGHT + this.config.ITEM_MARGIN);
      
      layoutData.items.push({
        x, y, width: itemWidth, height: this.config.ITEM_HEIGHT,
        data: diffData[i]
      });
    }
    
    return layoutData;
  }

  async render(diffData, oldVF, newVF, updateDate) {
    const canvas = document.getElementById('cv');
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    
    const layout = this.calculateLayout(diffData);
    
    canvas.width = layout.width;
    canvas.height = layout.height;
    
    // 背景描画
    await this.drawBackground(ctx, layout.width, layout.height);
    
    // ヘッダー描画
    await this.drawHeader(ctx, diffData.length, oldVF, newVF, updateDate, layout.width, layout.height);
    
    // ジャケット一括読み込み
    const uniqueJackets = [...new Set(diffData.slice(0, this.config.MAX_DISPLAY).map(d => d.jacket_id))];
    await Promise.all(uniqueJackets.map(id => this.loadJacket(id)));
    
    // アイテム描画
    for (const item of layout.items) {
      await this.drawDiffItem(ctx, item);
    }
    
    // 省略表示
    if (diffData.length > this.config.MAX_DISPLAY) {
      this.drawEtcMessage(ctx, diffData.length - this.config.MAX_DISPLAY, layout);
    }
  }

  async drawBackground(ctx, width, height) {
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.config.COLORS.BG_TOP);
    gradient.addColorStop(1, this.config.COLORS.BG_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // サイバーグリッド
    ctx.strokeStyle = this.config.COLORS.GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 50) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  async drawHeader(ctx, updateCount, oldVF, newVF, updateDate, canvasWidth, canvasHeight) {
    const centerX = canvasWidth / 2;
    const headerY = this.config.PADDING + 80;

    // メインタイトル（ネオングロー）
    ctx.save();
    ctx.font = this.config.FONTS.TITLE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // グローエフェクト
    ctx.shadowColor = this.config.COLORS.ACCENT;
    ctx.shadowBlur = 40;
    ctx.fillStyle = this.config.COLORS.ACCENT;
    ctx.fillText("SCORE UPDATES", centerX, headerY);
    
    // 内側ハイライト
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.config.COLORS.TEXT_MAIN;
    ctx.fillText("SCORE UPDATES", centerX, headerY);
    
    // 更新日
    ctx.font = this.config.FONTS.SUBTITLE;
    ctx.textAlign = "right";
    ctx.fillStyle = this.config.COLORS.TEXT_SUB;
    ctx.fillText(`Generated Date: ${updateDate}`,  canvasWidth - this.config.PADDING, 30);
    ctx.restore();

    // VF変化ボックス
    const vfBoxY = this.config.PADDING + this.config.HEADER_HEIGHT - 80;
    const vfBoxWidth = 800;
    const vfBoxHeight = 50;
    const vfBoxX = (canvasWidth - vfBoxWidth) / 2;
    
    const vfDiff = newVF - oldVF;
    const vfChangeText = `VF: ${(oldVF/1000).toFixed(3)} → ${(newVF/1000).toFixed(3)} (${vfDiff > 0 ? '+' : ''}${(vfDiff/1000).toFixed(3)})`;
    
    // ボックス背景
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.config.COLORS.CARD_BG;
    ctx.fillRect(vfBoxX, vfBoxY, vfBoxWidth, vfBoxHeight);
    
    // ボーダー
    ctx.strokeStyle = vfDiff > 0 ? this.config.COLORS.ACCENT_SECONDARY : this.config.COLORS.ACCENT;
    ctx.lineWidth = 3;
    ctx.strokeRect(vfBoxX, vfBoxY, vfBoxWidth, vfBoxHeight);
    
    // VFテキスト
    ctx.font = this.config.FONTS.STATS;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = vfDiff > 0 ? this.config.COLORS.ACCENT_SECONDARY : this.config.COLORS.ACCENT;
    ctx.fillText(vfChangeText, centerX, vfBoxY + vfBoxHeight / 2);
    
    // 更新数表示
    ctx.font = "700 24px Inter";
    ctx.textAlign = "right";
    ctx.fillStyle = this.config.COLORS.TEXT_SUB;
    ctx.fillText(`${updateCount} songs updated`, canvasWidth - this.config.PADDING, canvasHeight - 30);
    ctx.restore();
  }

  async drawDiffItem(ctx, item) {
    const { x, y, width, height, data } = item;
    
    // アイテム背景
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.config.COLORS.CARD_BG;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    // 難易度アクセントバー
    ctx.fillStyle = this.diffColors[data.diff_name] || '#888';
    ctx.fillRect(x, y, 6, height);

    // ジャケット
    const jacket = await this.loadJacket(data.jacket_id);
    const jacketX = x + 15;
    const jacketY = y + 10;
    
    if (jacket) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(jacketX, jacketY, this.config.JACKET_SIZE, this.config.JACKET_SIZE);
      ctx.clip();
      ctx.drawImage(jacket, jacketX, jacketY, this.config.JACKET_SIZE, this.config.JACKET_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(jacketX, jacketY, this.config.JACKET_SIZE, this.config.JACKET_SIZE);
    }

    // 楽曲情報
    const textX = jacketX + this.config.JACKET_SIZE + 20;
    
    // タイトル（省略処理）
    ctx.save();
    ctx.font = this.config.FONTS.ITEM_TITLE;
    ctx.fillStyle = this.config.COLORS.TEXT_MAIN;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    let title = data.music_title;
    const maxTitleWidth = width - (textX - x) - 100;
    while (ctx.measureText(title).width > maxTitleWidth && title.length > 0) {
      title = title.slice(0, -1);
    }
    if (title !== data.music_title) title += '...';
    
    ctx.fillText(title, textX, y + 15);
    
    // 難易度・レベル
    ctx.font = "700 16px Orbitron";
    ctx.textAlign = "right";
    ctx.fillStyle = this.diffColors[data.diff_name];
    ctx.fillText(`${data.diff_name} ${data.level.toFixed(1)}`, x + width - 20, y + 15);
    ctx.restore();

    // スコア変化表示
    const scoreY = y + height - 40;
    
    ctx.save();
    ctx.font = this.config.FONTS.ITEM_SCORE;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const maxScore = 10000000;
    const maxScoreW = ctx.measureText(maxScore.toLocaleString()).width;
    
    // 旧スコア
    const oldScoreX = textX + maxScoreW;
    const oldScore = data.score_old.toLocaleString();
    ctx.fillStyle = this.clearColors[data.clear_old];
    ctx.fillText(oldScore, oldScoreX, scoreY);
    
    // 矢印
    const arrowX = oldScoreX + 35;
    ctx.fillStyle = this.config.COLORS.TEXT_SUB;
    ctx.font = "700 20px Inter";
    ctx.textAlign = "left";
    const arrow = '→';
    const arrowW = ctx.measureText(arrow).width;
    ctx.fillText(arrow, arrowX, scoreY);
    
    // 新スコア
    const newScoreX = arrowX + arrowW + 35 + maxScoreW;
    const newScore = data.score_new.toLocaleString();
    ctx.font = this.config.FONTS.ITEM_SCORE;
    ctx.fillStyle = this.clearColors[data.clear_new];
    ctx.textAlign = "right";
    ctx.fillText(newScore, newScoreX, scoreY);
    
    // 差分表示
    if (data.score_diff > 0) {
      ctx.fillStyle = this.config.COLORS.ACCENT_SECONDARY;
      ctx.font = "700 20px Orbitron";
      ctx.textAlign = "right";
      ctx.fillText(`+${data.score_diff.toLocaleString()}`, x + width - 20, scoreY + 30);
    }
    ctx.restore();
  }

  drawEtcMessage(ctx, remainingCount, layout) {
    ctx.save();
    ctx.font = "700 32px Orbitron";
    ctx.fillStyle = this.config.COLORS.TEXT_SUB;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`... and ${remainingCount} more updates`, layout.width / 2, layout.height - 60);
    ctx.restore();
  }
}

/* ====== メインアプリケーション ====== */
class DiffTrackerApp {
  constructor() {
    this.versionManager = new ScoreVersionManager();
    this.canvasRenderer = new DiffCanvasRenderer();
    this.progressManager = new ProgressManager();
    
    this.selectedFiles = { music: null, score: null };
  }

  async init() {
    await this.versionManager.init();
    this.setupEventListeners();
    await this.displayTimeline();
    
    console.log('SDVX Diff Tracker v2.0 initialized');
  }

  setupEventListeners() {
    // ファイル選択
    document.getElementById('selectFiles').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // ドラッグ&ドロップ
    const importZone = document.getElementById('importZone');
    
    importZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importZone.classList.add('dragover');
    });

    importZone.addEventListener('dragleave', () => {
      importZone.classList.remove('dragover');
    });

    importZone.addEventListener('drop', (e) => {
      e.preventDefault();
      importZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    // 処理実行
    document.getElementById('processBtn').addEventListener('click', () => {
      this.processFiles();
    });

    // 履歴クリア
    document.getElementById('clearAll').addEventListener('click', async () => {
      if (confirm('すべての履歴データを削除しますか？この操作は取り消せません。')) {
        await this.versionManager.clearAllData();
        location.reload();
      }
    });

    // Canvas操作
    document.getElementById('download')?.addEventListener('click', () => {
      this.downloadCanvas();
    });

    document.getElementById('downloadForiOS')?.addEventListener('click', () => {
      this.downloadForiOS();
    });


    document.getElementById('toggleFit')?.addEventListener('click', () => {
      this.toggleCanvasFit();
    });

    document.getElementById('regenerate')?.addEventListener('click', () => {
      this.regenerateCanvas();
    });
  }

  handleFiles(files) {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (file.name.includes('music_data')) {
        this.selectedFiles.music = file;
      } else if (file.name.includes('score_data')) {
        this.selectedFiles.score = file;
      }
    }
    
    this.updateFileStatus();
  }

  updateFileStatus() {
    const fileStatus = document.getElementById('fileStatus');
    const musicStatus = document.getElementById('musicStatus');
    const scoreStatus = document.getElementById('scoreStatus');
    const processBtn = document.getElementById('processBtn');
    
    fileStatus.style.display = 'flex';
    
    // Music Data状態
    if (this.selectedFiles.music) {
      musicStatus.classList.add('status-ready');
      musicStatus.querySelector('.status-value').textContent = this.selectedFiles.music.name;
    } else {
      musicStatus.classList.remove('status-ready');
      musicStatus.querySelector('.status-value').textContent = '未選択';
    }
    
    // Score Data状態
    if (this.selectedFiles.score) {
      scoreStatus.classList.add('status-ready');
      scoreStatus.querySelector('.status-value').textContent = this.selectedFiles.score.name;
    } else {
      scoreStatus.classList.remove('status-ready');
      scoreStatus.querySelector('.status-value').textContent = '未選択';
    }
    
    // 処理ボタン
    processBtn.disabled = !(this.selectedFiles.music && this.selectedFiles.score);
  }

  async processFiles() {
    if (!this.selectedFiles.music || !this.selectedFiles.score) return;
    
    this.progressManager.show('データ処理中...');
    
    try {
      this.progressManager.update(10, 'ファイルを読み込み中...');
      
      const musicText = await this.selectedFiles.music.text();
      const scoreText = await this.selectedFiles.score.text();
      
      const musicData = JSON.parse(musicText);
      const scoreData = JSON.parse(scoreText);
      
      this.progressManager.update(30, 'データベースに保存中...');
      
      await this.versionManager.saveSnapshot(musicData, scoreData);
      
      this.progressManager.update(50, '差分を計算中...');
      
      const diffData = await this.calculateDifferences();
      
      this.progressManager.update(70, '統計を生成中...');
      
      await this.displayStatistics(diffData);
      await this.displayTimeline();
      
      this.progressManager.update(90, 'Canvasを生成中...');
      
      await this.generateCanvas(diffData);
      
      this.progressManager.update(100, '完了！');
      
      setTimeout(() => {
        this.progressManager.hide();
        document.getElementById('canvasStage').style.display = 'block';
      }, 1000);
      
    } catch (error) {
      console.error('Processing error:', error);
      this.progressManager.update(0, 'エラーが発生しました');
      setTimeout(() => this.progressManager.hide(), 3000);
      alert('データの処理に失敗しました: ' + error.message);
    }
  }

  async calculateDifferences() {
    const snapshots = await this.versionManager.getSnapshots();
    
    if (snapshots.length < 2) {
      return []; // 比較対象がない
    }
    
    const latest = snapshots[0];
    const previous = snapshots[1];
    
    return this.compareMusicData(latest.musicData, latest.scoreData, previous.scoreData);
  }

  compareMusicData(musicData, newScoreData, oldScoreData) {
    const newScoreMap = new Map();
    newScoreData.forEach(s => {
      Object.entries(s).forEach(([k, v]) => {
        if (k.startsWith("diff_")) {
          newScoreMap.set(`${s.music_title}_${s.artist}_${k}`, v);
        }
      });
    });

    const oldScoreMap = new Map();
    oldScoreData.forEach(s => {
      Object.entries(s).forEach(([k, v]) => {
        if (k.startsWith("diff_")) {
          oldScoreMap.set(`${s.music_title}_${s.artist}_${k}`, v);
        }
      });
    });

    const differences = [];
    
    musicData.forEach(m => {
      Object.entries(m).forEach(([k, v]) => {
        if (!k.startsWith("diff_") || !v.level || v.level < 17) return;
        
        const key = `${m.music_title}_${m.artist}_${k}`;
        const newScore = newScoreMap.get(key) || { score: 0, clear: "no", grade: "" };
        const oldScore = oldScoreMap.get(key) || { score: 0, clear: "no", grade: "" };
        
        // 差分判定
        if (newScore.score !== oldScore.score || newScore.clear !== oldScore.clear) {
          const newVF = this.versionManager.calcVFSingle(v.level, newScore.score, newScore.grade, newScore.clear);
          const oldVF = this.versionManager.calcVFSingle(v.level, oldScore.score, oldScore.grade, oldScore.clear);
          
          differences.push({
            music_title: m.music_title,
            artist: m.artist,
            diff_name: v.diff_name.toUpperCase(),
            level: v.level,
            jacket_id: v.jacket_id,
            
            score_new: newScore.score,
            score_old: oldScore.score,
            score_diff: newScore.score - oldScore.score,
            
            clear_new: newScore.clear,
            clear_old: oldScore.clear,
            
            vf_new: newVF,
            vf_old: oldVF,
            vf_diff: newVF - oldVF
          });
        }
      });
    });

    // VF差分でソート
    differences.sort((a, b) => b.vf_diff - a.vf_diff || b.score_diff - a.score_diff);
    
    return differences;
  }

  async displayStatistics(diffData) {
    const stats = {
      totalUpdates: diffData.length,
      newPUC: diffData.filter(d => d.clear_new === 'per' && d.clear_old !== 'per').length,
      newUC: diffData.filter(d => d.clear_new === 'uc' && d.clear_old !== 'uc').length,
      scoreImproved: diffData.filter(d => d.score_diff > 0).length,
      vfGain: diffData.reduce((sum, d) => sum + d.vf_diff, 0)
    };

    const snapshots = await this.versionManager.getSnapshots();
    const vfChange = snapshots.length >= 2 ? snapshots[0].totalVF - snapshots[1].totalVF : 0;

    const statsGrid = document.getElementById('statsGrid');
    const statItems = [
      { label: 'Total Updates', value: stats.totalUpdates, icon: '📝', change: stats.totalUpdates },
      { label: 'New PUC', value: stats.newPUC, icon: '⭐', change: stats.newPUC },
      { label: 'New UC', value: stats.newUC, icon: '💎', change: stats.newUC },
      { label: 'VF Change', value: (vfChange / 1000).toFixed(3), icon: '📈', change: vfChange }
    ];

    statsGrid.innerHTML = statItems.map(item => {
      let changeHtml = '';
      if (typeof item.change === 'number') {
        const changeClass = item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'neutral';
        const changeIcon = item.change > 0 ? '↑' : item.change < 0 ? '↓' : '→';
        changeHtml = `<div class="stat-change ${changeClass}">${changeIcon} ${Math.abs(item.change)}</div>`;
      }

      return `
        <div class="stat-card">
          <div class="stat-icon">${item.icon}</div>
          <div class="stat-value">${item.value}</div>
          <div class="stat-label">${item.label}</div>
          ${changeHtml}
        </div>
      `;
    }).join('');

    document.getElementById('statsSection').style.display = 'block';
  }

  async displayTimeline() {
    const snapshots = await this.versionManager.getSnapshots();
    const timelineSection = document.getElementById('timelineSection');
    const timelineContainer = document.getElementById('timelineContainer');

    if (snapshots.length === 0) {
      timelineSection.style.display = 'none';
      return;
    }

    timelineContainer.innerHTML = snapshots.map((snapshot, index) => {
      const vf = (snapshot.totalVF / 1000).toFixed(3);
      const isLatest = index === 0;

      return `
        <div class="timeline-item" data-snapshot-id="${snapshot.id}" ${isLatest ? 'style="background: rgba(0,229,255,0.1);"' : ''}>
          <div class="timeline-date">${snapshot.dateString}</div>
          <div class="timeline-stats">${snapshot.songCount} tracks${isLatest ? ' (最新)' : ''}</div>
          <div class="timeline-vf">VF: ${vf}</div>
        </div>
      `;
    }).join('');

    timelineSection.style.display = 'block';
  }

  async generateCanvas(diffData) {
    const snapshots = await this.versionManager.getSnapshots();
    
    if (snapshots.length < 2) {
      alert('比較対象がありません。2回目以降の更新から差分Canvas生成が可能です。');
      return;
    }
    
    const latest = snapshots[0];
    const previous = snapshots[1];
    
    await this.canvasRenderer.render(
      diffData,
      previous.totalVF,
      latest.totalVF,
      latest.dateString
    );
  }

  downloadCanvas() {
    const canvas = document.getElementById('cv');
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.href = canvas.toDataURL('image/png');
    link.download = `sdvx_diff_${dateStr}.png`;
    link.click();
  }

  downloadForiOS() {
    if (!this.canvas) return;
      
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL("image/png");
    link.download = `${this.pageDefinition.downloadFilePrefix}_${formatDateStamp()}.png`;
    link.target = '_blank'; // iOSではこちらが有効な場合が多い
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  toggleCanvasFit() {
    const wrap = document.getElementById('canvasWrap');
    const btn = document.getElementById('toggleFit');
    const isFit = wrap.classList.toggle('fit');
    btn.textContent = isFit ? '表示：フィット' : '表示：実寸';
  }

  async regenerateCanvas() {
    const diffData = await this.calculateDifferences();
    if (diffData.length > 0) {
      await this.generateCanvas(diffData);
    }
  }
}

/* ====== プログレス管理 ====== */
class ProgressManager {
  constructor() {
    this.overlay = document.getElementById('progressOverlay');
    this.fill = document.getElementById('progressFill');
    this.text = document.getElementById('progressText');
    this.title = document.getElementById('progressTitle');
  }

  show(title = 'Processing...') {
    this.title.textContent = title;
    this.overlay.classList.add('active');
  }

  hide() {
    this.overlay.classList.remove('active');
  }

  update(percent, message) {
    this.fill.style.width = `${percent}%`;
    this.text.textContent = message;
  }
}

/* ====== 初期化 ====== */
const app = new DiffTrackerApp();

window.addEventListener('DOMContentLoaded', async () => {
  await app.init();
});

// エクスポート（他モジュールから利用する場合）
export { DiffTrackerApp, ScoreVersionManager, DiffCanvasRenderer };
