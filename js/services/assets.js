export class ImageRepository {
  constructor(urlFactory) {
    this.urlFactory = urlFactory;
    this.cache = new Map();
  }

  async load(key) {
    if (!key) return null;

    if (this.cache.has(key)) {
      return await this.cache.get(key);
    }

    const loadPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = this.urlFactory(key);
    });

    this.cache.set(key, loadPromise);

    const image = await loadPromise;
    this.cache.set(key, image);
    return image;
  }

  async preload(keys, batchSize = 15, onProgress = null) {
    const uniqueKeys = [...new Set(keys)].filter(Boolean);
    const total = uniqueKeys.length;

    if (total === 0) {
      onProgress?.({ loaded: 0, total: 0 });
      return;
    }

    let loaded = 0;

    for (let i = 0; i < total; i += batchSize) {
      const batch = uniqueKeys.slice(i, i + batchSize);
      await Promise.all(batch.map((key) => this.load(key)));
      loaded += batch.length;
      onProgress?.({ loaded, total });
    }
  }
}

export class JacketRepository extends ImageRepository {
  constructor(basePath) {
    super((jacketId) => `${basePath}/${jacketId}.jpg`);
  }
}
