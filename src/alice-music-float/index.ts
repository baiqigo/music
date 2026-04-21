import { createScriptIdIframe } from '@util/script';

// ============================================================
// 悬浮球音乐播放器 — 最小骨架
// 折叠态：圆形可拖拽悬浮球 (fa-regular fa-music)
// 展开态：播放器面板（含齿轮/关闭按钮）
//
// 架构 v4.1（setPointerCapture 全程方案）：
//   - iframe 尺寸动态跟随内容（折叠=50x50，展开=280x380）
//   - 拖拽方案：
//     1. iframe 内部 ball 上 pointerdown → setPointerCapture
//     2. ball 上 pointermove：3px 阈值判定，超过则拖拽移动 iframe
//     3. ball 上 pointerup：未超过阈值 → 单击展开；超过 → 停留在释放位置
//     4. 全程不切换 pointer-events，不使用父窗口事件监听
//     5. setPointerCapture 确保鼠标移出 iframe 后事件仍路由到 ball
// ============================================================

const BALL_SIZE = 50;
const PANEL_W = 280;
const PANEL_H = 380;
const DRAG_THRESHOLD = 3;

// ============================================================
// 离线播放核心 — 四阶段歌曲映射 + HTML5 Audio 引擎
// ============================================================

/** 循环模式类型 */
type RepeatMode = 'repeat-all' | 'repeat-one' | 'sequential';

/** 剧情阶段类型 */
type StageKey = '初识期' | '软化期' | '失去期' | '热恋期';
const VALID_STAGES: readonly string[] = ['初识期', '软化期', '失去期', '热恋期'];

/** 离线歌曲信息 */
interface OfflineTrack {
  title: string;
  artist: string;
  url: string;
  stage: StageKey;
}

/** 四阶段离线歌曲映射 */
const OFFLINE_TRACKS: OfflineTrack[] = [
  { title: '17', artist: '椎名林檎', url: 'https://cdn.jsdelivr.net/gh/baiqigo/music/17.flac', stage: '初识期' },
  { title: '春风吹', artist: '方大同', url: 'https://cdn.jsdelivr.net/gh/baiqigo/music/cunfc.flac', stage: '软化期' },
  {
    title: 'I Really Want to Stay at Your House',
    artist: '',
    url: 'https://cdn.jsdelivr.net/gh/baiqigo/music/sbpk.mp3',
    stage: '失去期',
  },
  {
    title: '打上花火',
    artist: 'DAOKO × 米津玄师',
    url: 'https://cdn.jsdelivr.net/gh/baiqigo/music/biaobai.mp3',
    stage: '热恋期',
  },
];

/**
 * 离线播放引擎
 * 封装 HTML5 Audio，管理当前曲目索引、播放/暂停/切歌逻辑。
 */
class OfflinePlayer {
  private audio: HTMLAudioElement;
  private tracks: OfflineTrack[];
  private _currentIndex: number;
  private _isPlaying: boolean = false;
  /** 为 true 时跳过 ended 事件中的自动切歌（在线播放模式下使用） */
  _skipEndedHandler: boolean = false;

  /** 状态变化回调：播放/暂停切换时触发 */
  onStateChange: ((playing: boolean) => void) | null = null;
  /** 曲目变化回调：切歌时触发 */
  onTrackChange: ((track: OfflineTrack, index: number) => void) | null = null;
  /** 切回离线模式时的回调（用于重置在线播放状态） */
  onResumeOffline: (() => void) | null = null;
  /** 播放结束回调：外部可覆盖默认行为（返回 true 表示已处理，跳过默认 next()） */
  onEnded: (() => boolean) | null = null;
  /** 播放出错回调：通知 UI 层显示提示 */
  onError: ((track: OfflineTrack) => void) | null = null;

  constructor(tracks: OfflineTrack[]) {
    this.tracks = tracks;
    this._currentIndex = 0;
    this.audio = new Audio();
    this.audio.preload = 'auto';

    // 播放结束后自动切下一首（仅离线模式，受 onEnded 回调控制）
    this.audio.addEventListener('ended', () => {
      if (this._skipEndedHandler) return;
      if (this.onEnded?.()) return; // 外部已处理
      this.next();
    });

    // 播放出错时暂停并通知
    this.audio.addEventListener('error', () => {
      this._isPlaying = false;
      this.onStateChange?.(false);
      this.onError?.(this.currentTrack);
      console.warn('[OfflinePlayer] 播放出错:', this.currentTrack.url);
    });
  }

  get currentTrack(): OfflineTrack {
    return this.tracks[this._currentIndex];
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** 暴露内部 Audio 元素，供外部绑定 timeupdate 等事件 */
  get audioElement(): HTMLAudioElement {
    return this.audio;
  }

  /** 加载指定索引的曲目（不自动播放） */
  loadTrack(index: number) {
    this._currentIndex = ((index % this.tracks.length) + this.tracks.length) % this.tracks.length;
    this.audio.src = this.currentTrack.url;
    this.audio.load();
    this.onTrackChange?.(this.currentTrack, this._currentIndex);
  }

  /** 播放当前曲目 */
  play() {
    if (!this.audio.hasAttribute('src')) {
      this.loadTrack(this._currentIndex);
    }
    this.audio
      .play()
      .then(() => {
        this._isPlaying = true;
        this.onStateChange?.(true);
      })
      .catch(err => {
        console.warn('[OfflinePlayer] play() 被拒绝:', err);
      });
  }

  /** 暂停播放 */
  pause() {
    this.audio.pause();
    this._isPlaying = false;
    this.onStateChange?.(false);
  }

  /** 播放/暂停切换 */
  togglePlay() {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /** 下一首 */
  next() {
    const wasPlaying = this._isPlaying;
    this.pause();
    this.loadTrack(this._currentIndex + 1);
    if (wasPlaying) this.play();
  }

  /** 上一首 */
  prev() {
    const wasPlaying = this._isPlaying;
    this.pause();
    this.loadTrack(this._currentIndex - 1);
    if (wasPlaying) this.play();
  }

  /** 按阶段名切歌（切回离线模式） */
  playByStage(stage: StageKey) {
    const idx = this.tracks.findIndex(t => t.stage === stage);
    if (idx === -1) return;
    if (idx === this._currentIndex && this._isPlaying) return; // 已在播放该阶段
    this._skipEndedHandler = false; // 切回离线模式
    this.onResumeOffline?.();
    this.pause();
    this.loadTrack(idx);
    this.play();
  }

  /** 销毁播放器 */
  destroy() {
    this.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}

// ============================================================
// 在线搜索播放 — 标准化结果 + API 调用 + 音频校验
// ============================================================

/** 搜索结果标准化格式 */
interface SearchResult {
  title: string;
  artist: string;
  url: string;
  cover: string;
  source: '网易云' | 'QQ音乐';
}

/** 收藏项（仅存元数据，不存 URL —— URL 有时效性，播放时重新获取） */
interface FavoriteItem {
  title: string;
  artist: string;
  source: '网易云' | 'QQ音乐';
}

/** 音频可用性检测（3 秒超时） */
function checkAudioPlayable(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const audio = new Audio();
    const timer = setTimeout(() => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      resolve(false);
    }, 3000);

    audio.addEventListener(
      'loadedmetadata',
      () => {
        clearTimeout(timer);
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        resolve(true);
      },
      { once: true },
    );

    audio.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        resolve(false);
      },
      { once: true },
    );

    audio.src = url;
    audio.load();
  });
}

/**
 * 从单个平台搜索并校验，返回最多 maxValid 条可用结果。
 * @param platform  'netease' | 'tencent'
 * @param keyword   搜索关键词
 * @param maxCheck  从搜索结果中取前 N 条进行校验
 * @param maxValid  最多返回可用结果数
 * @param signal    AbortController signal
 */
async function searchPlatform(
  platform: 'netease' | 'tencent',
  keyword: string,
  maxCheck: number,
  maxValid: number,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const sourceName = platform === 'netease' ? '网易云' : 'QQ音乐';
  const API_BASE = 'https://api.vkeys.cn';

  // 1. 搜索（QQ音乐用 V3 端点，网易云保留 V2）
  let items: any[] = [];
  if (platform === 'tencent') {
    const searchResp = await fetch(
      `${API_BASE}/music/tencent/search/song?keyword=${encodeURIComponent(keyword)}&limit=${maxCheck}`,
      { signal },
    );
    const searchJson = await searchResp.json();
    // V3 成功 code 为 0，数据在 data.list 中
    items =
      searchJson?.code === 0 && Array.isArray(searchJson?.data?.list) ? searchJson.data.list.slice(0, maxCheck) : [];
  } else {
    // 网易云 V2
    const searchResp = await fetch(`${API_BASE}/v2/music/netease?word=${encodeURIComponent(keyword)}`, { signal });
    const searchJson = await searchResp.json();
    items = Array.isArray(searchJson?.data) ? searchJson.data.slice(0, maxCheck) : [];
  }

  // 2. 并行获取播放地址 + 校验可用性（所有候选同时进行）
  const tasks = items
    .filter((item: any) => (platform === 'tencent' ? item.songID : item.id))
    .map(async (item: any): Promise<SearchResult | null> => {
      try {
        if (signal.aborted) return null;

        let audioUrl: string;
        let title: string;
        let artist: string;
        let cover: string;

        if (platform === 'tencent') {
          // V3：播放链接端点，quality=6 标准 128kbps，付费歌曲 fallback quality=0 试听
          const urlResp = await fetch(
            `${API_BASE}/music/tencent/song/link?id=${encodeURIComponent(item.songID)}&quality=6`,
            { signal },
          );
          const urlJson = await urlResp.json();
          audioUrl = urlJson?.code === 0 ? urlJson?.data?.url : '';

          // 如果 quality=6 无 URL（可能是付费歌曲），尝试 quality=0 试听
          if (!audioUrl) {
            const fallbackResp = await fetch(
              `${API_BASE}/music/tencent/song/link?id=${encodeURIComponent(item.songID)}&quality=0`,
              { signal },
            );
            const fallbackJson = await fallbackResp.json();
            audioUrl = fallbackJson?.code === 0 ? fallbackJson?.data?.url : '';
          }

          title = item.title || '未知歌曲';
          artist = item.singer || '未知歌手';
          cover = item.cover || '';
        } else {
          // 网易云 V2
          const urlResp = await fetch(`${API_BASE}/v2/music/netease?id=${encodeURIComponent(item.id)}`, { signal });
          const urlJson = await urlResp.json();
          audioUrl = urlJson?.data?.url || '';
          title = item.song || item.name || item.title || '未知歌曲';
          artist = item.singer || item.artist || '未知歌手';
          cover = item.cover || '';
        }

        if (!audioUrl) return null;

        const ok = await checkAudioPlayable(audioUrl);
        if (!ok) return null;

        return { title, artist, url: audioUrl, cover, source: sourceName };
      } catch {
        return null;
      }
    });

  // 3. 收集结果，取前 maxValid 条可用
  const settled = await Promise.allSettled(tasks);
  const results: SearchResult[] = [];
  for (const s of settled) {
    if (results.length >= maxValid) break;
    if (s.status === 'fulfilled' && s.value) {
      results.push(s.value);
    }
  }
  return results;
}

/**
 * API 可达性检测：向 api.vkeys.cn 发送一个最小搜索请求，5 秒超时。
 * 优先使用 V3 QQ 音乐端点检测，V3 不可用时 fallback 到 V2 网易云。
 * 返回 'ok' | 'fail'。
 */
async function checkApiStatus(): Promise<'ok' | 'fail'> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    // 优先用 V3 QQ 音乐搜索端点检测
    const resp = await fetch('https://api.vkeys.cn/music/tencent/search/song?keyword=test&limit=1', {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return 'fail';
    const json = await resp.json();
    // V3 成功 code 为 0
    return json?.code === 0 ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

/** 悬浮球 + 面板的完整 HTML */
const FLOAT_HTML = /* html */ `
<div id="music-float-root">
  <!-- 折叠态：悬浮球 -->
  <div id="float-ball" class="float-ball">
    <svg class="ball-music-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="white" d="M532 71C539.6 77.1 544 86.3 544 96L544 400C544 444.2 501 480 448 480C395 480 352 444.2 352 400C352 355.8 395 320 448 320C459.2 320 470 321.6 480 324.6L480 207.9L256 257.7L256 464C256 508.2 213 544 160 544C107 544 64 508.2 64 464C64 419.8 107 384 160 384C171.2 384 182 385.6 192 388.6L192 160C192 145 202.4 132 217.1 128.8L505.1 64.8C514.6 62.7 524.5 65 532.1 71.1z"/></svg>
  </div>

  <!-- 展开态：播放器面板 -->
  <div id="float-panel" class="float-panel hidden">
    <!-- 顶部栏 -->
    <div class="panel-header">
      <div class="header-left">
        <button id="btn-settings" class="icon-btn" title="设置">
                     <svg class="settings-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/></svg>
        </button>
        <span class="header-divider"></span>
        <button id="btn-playlist" class="icon-btn" title="歌曲列表">
          <i class="fa-solid fa-bars"></i>
        </button>
        <button id="btn-fav-list" class="icon-btn" title="收藏列表">
          <svg class="heart-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.503 15.625"><path d="M8.752,15.625h0L1.383,8.162a4.824,4.824,0,0,1,0-6.762,4.679,4.679,0,0,1,6.674,0l.694.7.694-.7a4.678,4.678,0,0,1,6.675,0,4.825,4.825,0,0,1,0,6.762L8.752,15.624ZM4.72,1.25A3.442,3.442,0,0,0,2.277,2.275a3.562,3.562,0,0,0,0,5l6.475,6.556,6.475-6.556a3.563,3.563,0,0,0,0-5A3.443,3.443,0,0,0,12.786,1.25h-.01a3.415,3.415,0,0,0-2.443,1.038L8.752,3.9,7.164,2.275A3.442,3.442,0,0,0,4.72,1.25Z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="header-right">
        <button id="btn-search-open" class="icon-btn" title="搜索">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
        <button id="btn-close" class="icon-btn" title="关闭">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- 主页面（始终存在，唱片播放界面） -->
    <div id="main-page" class="panel-body">
      <div class="disc-area">
        <div class="disc">
          <img id="disc-cover" class="disc-cover hidden" alt="" />
        </div>
      </div>
      <div class="song-info">
        <div class="song-title">暂无歌曲</div>
        <div class="song-artist">--</div>
      </div>
      <div class="progress-volume-area">
        <div class="volume-wrap">
          <button id="btn-volume" class="icon-btn volume-btn" title="音量">
            <i class="fa-solid fa-volume-high"></i>
          </button>
          <div id="volume-popup" class="volume-popup hidden">
            <div id="volume-bar" class="volume-bar-v">
              <div id="volume-fill" class="volume-fill-v"></div>
              <div id="volume-thumb" class="volume-thumb-v"></div>
            </div>
          </div>
        </div>
        <div class="progress-area">
          <span id="time-current" class="time-label">0:00</span>
          <div id="progress-bar" class="progress-bar">
            <div id="progress-fill" class="progress-fill"></div>
            <div id="progress-thumb" class="progress-thumb"></div>
          </div>
          <span id="time-total" class="time-label">0:00</span>
        </div>
      </div>
      <div class="controls">
        <button id="btn-repeat" class="icon-btn ctrl-side-btn" title="列表循环"><i class="fa-solid fa-repeat"></i></button>
        <button id="btn-prev" class="icon-btn ctrl-btn"><svg class="ctrl-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M491 100.8C478.1 93.8 462.3 94.5 450 102.6L192 272.1L192 128C192 110.3 177.7 96 160 96C142.3 96 128 110.3 128 128L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 367.9L450 537.5C462.3 545.6 478 546.3 491 539.3C504 532.3 512 518.8 512 504.1L512 136.1C512 121.4 503.9 107.9 491 100.9z"/></svg></button>
        <button id="btn-play" class="icon-btn ctrl-btn play-btn">
          <svg id="icon-play" class="ctrl-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/></svg>
          <svg id="icon-pause" class="ctrl-svg-icon hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="none"><rect x="128" y="96" width="160" height="448" rx="48" stroke="white" stroke-width="48"/><rect x="352" y="96" width="160" height="448" rx="48" stroke="white" stroke-width="48"/></svg>
          <svg id="icon-spinner" class="ctrl-svg-icon icon-spinner hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M304 48a48 48 0 1 0-96 0 48 48 0 1 0 96 0zm0 416a48 48 0 1 0-96 0 48 48 0 1 0 96 0zM48 304a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm464-48a48 48 0 1 0-96 0 48 48 0 1 0 96 0zM142.9 437A48 48 0 1 0 75 369.1 48 48 0 1 0 142.9 437zm0-294.2A48 48 0 1 0 75 75a48 48 0 1 0 67.9 67.9zM369.1 437A48 48 0 1 0 437 369.1a48 48 0 1 0-67.9 67.9z"/></svg>
        </button>
        <button id="btn-next" class="icon-btn ctrl-btn"><svg class="ctrl-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M149 100.8C161.9 93.8 177.7 94.5 190 102.6L448 272.1L448 128C448 110.3 462.3 96 480 96C497.7 96 512 110.3 512 128L512 512C512 529.7 497.7 544 480 544C462.3 544 448 529.7 448 512L448 367.9L190 537.5C177.7 545.6 162 546.3 149 539.3C136 532.3 128 518.7 128 504L128 136C128 121.3 136.1 107.8 149 100.8z"/></svg></button>
        <button id="btn-fav" class="icon-btn ctrl-side-btn" title="收藏">
          <svg id="icon-heart-empty" class="heart-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.503 15.625"><path d="M8.752,15.625h0L1.383,8.162a4.824,4.824,0,0,1,0-6.762,4.679,4.679,0,0,1,6.674,0l.694.7.694-.7a4.678,4.678,0,0,1,6.675,0,4.825,4.825,0,0,1,0,6.762L8.752,15.624ZM4.72,1.25A3.442,3.442,0,0,0,2.277,2.275a3.562,3.562,0,0,0,0,5l6.475,6.556,6.475-6.556a3.563,3.563,0,0,0,0-5A3.443,3.443,0,0,0,12.786,1.25h-.01a3.415,3.415,0,0,0-2.443,1.038L8.752,3.9,7.164,2.275A3.442,3.442,0,0,0,4.72,1.25Z" fill="currentColor"/></svg>
          <svg id="icon-heart-filled" class="heart-svg-icon hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.503 15.625"><path d="M8.752,15.625h0L1.383,8.162a4.824,4.824,0,0,1,0-6.762,4.679,4.679,0,0,1,6.674,0l.694.7.694-.7a4.678,4.678,0,0,1,6.675,0,4.825,4.825,0,0,1,0,6.762Z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>

    <!-- 搜索页（叠加层，隐藏） -->
    <div id="search-page" class="overlay-page hidden">
      <div class="overlay-header">
        <button id="btn-search-back" class="icon-btn" title="返回">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="overlay-title">搜索歌曲</span>
        <span></span>
      </div>
      <div class="search-area">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input id="search-input" type="text" class="search-input" placeholder="搜索歌曲..." />
          <button id="btn-search" class="search-btn" title="搜索">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
          </button>
        </div>
      </div>
      <div id="search-results" class="search-results">
        <div class="search-placeholder">输入关键词搜索歌曲</div>
      </div>
    </div>

    <!-- 歌曲列表页（叠加层，隐藏） -->
    <div id="playlist-page" class="overlay-page hidden">
      <div class="overlay-header">
        <button id="btn-playlist-back" class="icon-btn" title="返回">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="overlay-title">播放列表</span>
        <span></span>
      </div>
      <div id="playlist-select-bar" class="select-all-wrap hidden">
        <input type="checkbox" id="playlist-select-all" class="playlist-item-checkbox" />
        <label for="playlist-select-all">全选</label>
        <button id="playlist-batch-delete" class="batch-delete-btn">删除选中</button>
      </div>
      <div id="playlist-items" class="playlist-items">
        <div class="playlist-placeholder">暂无歌曲</div>
      </div>
    </div>

    <!-- 收藏列表页（叠加层，隐藏） -->
    <div id="fav-page" class="overlay-page hidden">
      <div class="overlay-header">
        <button id="btn-fav-back" class="icon-btn" title="返回">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="overlay-title">收藏列表</span>
        <span></span>
      </div>
      <div id="fav-select-bar" class="select-all-wrap hidden">
        <input type="checkbox" id="fav-select-all" class="playlist-item-checkbox" />
        <label for="fav-select-all">全选</label>
        <button id="fav-batch-delete" class="batch-delete-btn">删除选中</button>
      </div>
      <div id="fav-items" class="playlist-items">
        <div class="playlist-placeholder">暂无收藏</div>
      </div>
    </div>

    <!-- 设置页面（叠加层，隐藏） -->
    <div id="settings-page" class="overlay-page hidden">
      <div class="overlay-header">
        <button id="btn-back" class="icon-btn" title="返回">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="overlay-title">设置</span>
        <span></span>
      </div>
      <div class="settings-body">
        <div class="setting-item">
          <span>播放模式</span>
          <span id="mode-toggle" class="setting-value mode-toggle">离线播放</span>
        </div>
        <div class="setting-item">
          <span>主题</span>
          <span id="theme-toggle" class="setting-value mode-toggle">默认</span>
        </div>
        <div id="api-status-item" class="setting-item hidden">
          <span>数据源状态</span>
          <span id="api-status" class="setting-value api-status">检测中...</span>
        </div>
      </div>
    </div>
    <!-- 胶囊 Toast 提示 -->
    <div id="toast-container" class="toast-container"></div>
  </div>
</div>
`;

/** 悬浮球 + 面板的完整 CSS */
const FLOAT_CSS = /* css */ `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: transparent !important;
}

#music-float-root {
  width: 100%;
  height: 100%;
  position: relative;
}

/* ---- 折叠态悬浮球 ---- */
.float-ball {
  width: ${BALL_SIZE}px;
  height: ${BALL_SIZE}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  user-select: none;
  touch-action: none;
}
.float-ball:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.55);
}
.float-ball:active {
  cursor: grabbing;
}
.ball-music-icon {
  width: 26px;
  height: 26px;
  pointer-events: none;
  display: block;
}

/* ---- 展开态面板 ---- */
.float-panel {
  width: ${PANEL_W}px;
  height: ${PANEL_H}px;
  border-radius: 30px;
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  box-shadow: 15px 15px 30px rgba(0,0,0,0.5), -15px -15px 30px rgba(50,60,90,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: panel-appear 0.25s ease-out;
  position: relative;
}
@keyframes panel-appear {
  from { opacity: 0; transform: scale(0.85) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes panel-disappear {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to   { opacity: 0; transform: scale(0.85) translateY(10px); }
}
.float-panel.collapsing {
  animation: panel-disappear 0.2s ease-in forwards;
}

.hidden {
  display: none !important;
}

/* ---- 面板顶部栏 ---- */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px;
}
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 2px;
}
.header-left {
  gap: 0;
}
/* 设置按钮与列表/收藏按钮之间加竖线分隔 */
.header-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 4px;
  flex-shrink: 0;
}

.icon-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 17px;
  cursor: pointer;
  padding: 5px 7px;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s, transform 0.15s;
}
.icon-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.icon-btn:active {
  transform: scale(0.92);
}
.settings-icon {
  width: 18px;
  height: 18px;
  display: block;
}

/* ---- 面板主体 ---- */
.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px 16px;
}

/* 唱片区 */
.disc-area {
  display: flex;
  align-items: center;
  justify-content: center;
}
.disc {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 22%),
    radial-gradient(circle at 50% 50%, transparent 35%, rgba(255,255,255,0.03) 36%, transparent 37%),
    radial-gradient(circle at 50% 50%, transparent 48%, rgba(255,255,255,0.025) 49%, transparent 50%),
    radial-gradient(circle at 50% 50%, transparent 62%, rgba(255,255,255,0.02) 63%, transparent 64%),
    radial-gradient(circle at 50% 50%, transparent 76%, rgba(255,255,255,0.02) 77%, transparent 78%),
    radial-gradient(circle at 30% 30%, #2d2d44, #1a1a2e);
  border: 3px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 20px rgba(102, 126, 234, 0.15),
    inset 0 0 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative;
}
.disc-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}


/* 唱片旋转动画 */
@keyframes disc-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.disc.spinning {
  animation: disc-spin 4s linear infinite;
}
.disc.paused {
  animation: disc-spin 4s linear infinite;
  animation-play-state: paused;
}

/* 歌曲信息 */
.song-info {
  text-align: center;
  color: #fff;
}
.song-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.song-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 进度条 + 音量按钮 区域 */
.progress-volume-area {
  display: flex;
  align-items: flex-end;
  gap: 0;
  width: 100%;
  padding: 0 4px;
}
.volume-btn {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  padding: 2px 4px;
  margin-bottom: -2px;
  flex-shrink: 0;
}
.volume-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* 进度条区域 */
.progress-area {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.time-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-family: monospace;
  min-width: 32px;
  text-align: center;
  user-select: none;
}
.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  transition: height 0.15s ease;
}
.progress-bar:hover {
  height: 5px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 2px;
  width: 0%;
  pointer-events: none;
}
.progress-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  position: absolute;
  top: 50%;
  left: 0%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}
.progress-bar:hover .progress-thumb,
.progress-bar.seeking .progress-thumb {
  opacity: 1;
}

/* 音量控制（弹出式竖向滑块） */
.volume-wrap {
  position: relative;
  display: flex;
  align-items: flex-end;
}
.volume-popup {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 110px;
  background: rgba(22, 33, 62, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  backdrop-filter: blur(12px);
  animation: vol-pop-in 0.2s ease-out;
  z-index: 5;
}
.volume-popup.hidden {
  display: none !important;
}
@keyframes vol-pop-in {
  from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.9); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
.volume-bar-v {
  width: 4px;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}
.volume-fill-v {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(0deg, #667eea, #764ba2);
  border-radius: 2px;
  height: 100%;
  pointer-events: none;
}
.volume-thumb-v {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px rgba(102, 126, 234, 0.4);
  position: absolute;
  left: 50%;
  top: 0%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: box-shadow 0.15s;
}

/* 控制按钮 */
.controls {
  display: flex;
  align-items: center;
  gap: 24px;
}
.ctrl-btn {
  font-size: 22px;
}
.ctrl-svg-icon {
  width: 22px;
  height: 22px;
  display: block;
  pointer-events: none;
  fill: currentColor;
}
.play-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff !important;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.play-btn:hover {
  background: linear-gradient(135deg, #7b93f5 0%, #8a5cb5 100%);
  box-shadow: 0 0 16px rgba(102, 126, 234, 0.45);
}
.play-btn:active {
  transform: scale(0.93);
}
.play-btn.loading .icon-spinner {
  animation: spin-loading 1s linear infinite;
}
@keyframes spin-loading {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.ctrl-side-btn {
  font-size: 16px;
  opacity: 0.5;
  position: relative;
}
.ctrl-side-btn.active {
  opacity: 1;
  color: #667eea;
}
.ctrl-side-btn .repeat-one-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  font-size: 9px;
  font-weight: bold;
  font-style: normal;
  color: #667eea;
}
.heart-svg-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
  display: block;
  transition: transform 0.2s ease;
}
.ctrl-side-btn.fav-active .heart-svg-icon {
  color: #f87171;
}
.ctrl-side-btn.fav-active .heart-svg-icon:not(.hidden) {
  filter: drop-shadow(0 0 4px rgba(248,113,113,0.5));
}

/* ---- 叠加页面（搜索/歌曲列表/设置共用） ---- */
.overlay-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  flex-direction: column;
  z-index: 1;
  animation: overlay-slide-in 0.25s ease-out;
}
@keyframes overlay-slide-in {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
.overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px;
}
.overlay-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.settings-body {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
.setting-value {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

/* 数据源状态指示 */
.api-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.api-status::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}
.api-status.ok::before {
  background: #4ade80;
}
.api-status.fail::before {
  background: #f87171;
}
.api-status.checking::before {
  background: #facc15;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 播放模式切换按钮 */
.mode-toggle {
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.mode-toggle:hover {
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
}
.mode-toggle.online {
  color: #667eea;
}

/* ---- 月光白转场动画 ---- */
.moon-transition-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
  border-radius: 30px;
  will-change: contents;
}
/* 对角线渐变白色遮罩：从左上到右下随月亮推进"刷白" */
.moon-wash-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(230,230,230,0.8), rgba(200,200,200,0.4));
  opacity: 0;
  /* --wash-pct 控制渐变分界线位置（0% ~ 150%），JS rAF 驱动 */
  -webkit-mask-image: linear-gradient(135deg, black 0%, black var(--wash-pct), transparent calc(var(--wash-pct) + 8%));
  mask-image: linear-gradient(135deg, black 0%, black var(--wash-pct), transparent calc(var(--wash-pct) + 8%));
}
/* 月亮容器（单层弯月 + 拖尾） */
.moon-wrapper {
  width: 70px;
  height: 70px;
  position: absolute;
  top: 0; left: 0;
  z-index: 3;
  filter: drop-shadow(0 0 15px rgba(248,241,235,0.9));
  will-change: transform, opacity;
}
.moon-body {
  position: absolute;
  width: 100%; height: 100%;
  border-radius: 50%;
  background-color: #F8F1EB;
  -webkit-mask-image: radial-gradient(circle at 75% 50%, transparent 40%, black 41%);
  mask-image: radial-gradient(circle at 75% 50%, transparent 40%, black 41%);
}
/* 月亮流星拖尾：对角线方向的光尾 */
.moon-trail {
  position: absolute;
  top: 50%; left: 50%;
  width: 120px;
  height: 4px;
  background: linear-gradient(90deg, transparent 0%, rgba(248,241,235,0.15) 20%, rgba(248,241,235,0.7) 80%, #F8F1EB 100%);
  border-radius: 2px;
  transform-origin: right center;
  transform: translate(-100%, -50%) rotate(-135deg);
  filter: blur(1.5px);
}
.crater {
  position: absolute;
  background-color: #E2D1CA;
  border-radius: 50%;
}
.crater-1 { width: 22%; height: 22%; top: 12%; left: 35%; }
.crater-2 { width: 28%; height: 28%; top: 40%; left: 40%; }
.crater-3 { width: 14%; height: 14%; bottom: 15%; left: 25%; }
.crater-4 { width: 18%; height: 18%; bottom: 8%; left: 50%; }
.crater-5 { width: 8%; height: 8%; top: 35%; left: 65%; }
.crater-6 { width: 6%; height: 6%; top: 52%; left: 18%; }
.crater-7 { width: 5%; height: 5%; bottom: 35%; left: 70%; }
/* 星星：clip-path 四角星 + 流星拖尾 */
.transit-star {
  position: absolute;
  top: 0; left: 0;
  z-index: 3;
  pointer-events: none;
  will-change: transform, opacity;
}
.transit-star .star-icon {
  position: absolute;
  width: 100%; height: 100%;
  background-color: #FFFFFF;
  clip-path: path('M 50 0 C 70 30 70 30 100 50 C 70 70 70 70 50 100 C 30 70 30 70 0 50 C 30 30 30 30 50 0 Z');
  filter: drop-shadow(0 0 6px rgba(255,255,255,0.9));
}
/* 星星拖尾 */
.transit-star .star-trail {
  position: absolute;
  top: 50%; left: 50%;
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.6) 100%);
  border-radius: 1px;
  transform-origin: right center;
  transform: translate(-100%, -50%) rotate(-135deg);
  filter: blur(1px);
}
/* 月亮淡出 — 用 filter+opacity 替代 transform scale，避免覆盖 translate 定位 */
@keyframes moon-fade-out {
  0%   { opacity: 1; filter: drop-shadow(0 0 15px rgba(248,241,235,0.9)) blur(0); }
  100% { opacity: 0; filter: drop-shadow(0 0 30px rgba(248,241,235,0.5)) blur(2px); }
}
/* 星星闪烁淡出 */
@keyframes star-twinkle-out {
  0%   { opacity: 0.9; filter: brightness(1) blur(0); }
  40%  { opacity: 1; filter: brightness(1.5) blur(0); }
  100% { opacity: 0; filter: brightness(0.5) blur(3px); }
}

/* ---- 月光白主题 ---- */
/* 月光白激活时隐藏默认面板内容（保留 overlay-page 和 toast 可显示） */
.float-panel.theme-moonlight .panel-header,
.float-panel.theme-moonlight .panel-body {
  display: none !important;
}
/* 月光白：overlay-page 在 card 之上显示，配色跟随月光白主题 */
.float-panel.theme-moonlight .overlay-page {
  z-index: 20;
  background: linear-gradient(145deg, rgba(240,240,245,0.97) 0%, rgba(225,225,235,0.95) 50%, rgba(210,215,230,0.93) 100%);
}
.float-panel.theme-moonlight .overlay-title {
  color: rgba(40, 40, 50, 0.9);
}
.float-panel.theme-moonlight .overlay-header .icon-btn {
  color: rgba(60, 60, 70, 0.7);
}
.float-panel.theme-moonlight .overlay-header .icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(40, 40, 50, 0.95);
}
.float-panel.theme-moonlight .setting-item {
  color: rgba(40, 40, 50, 0.85);
  background: rgba(0, 0, 0, 0.04);
}
.float-panel.theme-moonlight .setting-value {
  color: rgba(60, 60, 70, 0.55);
}
.float-panel.theme-moonlight .mode-toggle:hover {
  color: rgba(40, 40, 50, 0.9);
  background: rgba(0, 0, 0, 0.06);
}
.float-panel.theme-moonlight .mode-toggle.online {
  color: #5563d4;
}
/* 月光白：搜索页/播放列表/收藏列表文本颜色 */
.float-panel.theme-moonlight .playlist-item {
  color: rgba(40, 40, 50, 0.85);
}
.float-panel.theme-moonlight .playlist-item.active {
  background: rgba(100, 110, 200, 0.1);
}
.float-panel.theme-moonlight .playlist-item:hover {
  background: rgba(0, 0, 0, 0.04);
}
.float-panel.theme-moonlight .playlist-item-title {
  color: rgba(40, 40, 50, 0.9);
}
.float-panel.theme-moonlight .playlist-item-artist {
  color: rgba(80, 80, 90, 0.6);
}
.float-panel.theme-moonlight .playlist-item-remove:hover {
  color: #e54545;
}
.float-panel.theme-moonlight .search-box {
  background: rgba(0, 0, 0, 0.04);
}
.float-panel.theme-moonlight .search-input {
  color: rgba(40, 40, 50, 0.9);
}
.float-panel.theme-moonlight .search-input::placeholder {
  color: rgba(80, 80, 90, 0.4);
}
.float-panel.theme-moonlight .select-all-wrap {
  color: rgba(40, 40, 50, 0.7);
}
.float-panel.theme-moonlight .batch-delete-btn {
  border-color: rgba(220, 60, 60, 0.5);
  color: rgba(220, 60, 60, 0.7);
}
/* 月光白：搜索页元素深色适配 */
.float-panel.theme-moonlight .search-icon {
  color: rgba(60, 60, 70, 0.5);
}
.float-panel.theme-moonlight .search-btn {
  color: rgba(60, 60, 70, 0.5);
}
.float-panel.theme-moonlight .search-btn:hover {
  color: rgba(40, 40, 50, 0.9);
}
.float-panel.theme-moonlight .search-placeholder {
  color: rgba(80, 80, 90, 0.45);
}
.float-panel.theme-moonlight .result-title {
  color: rgba(40, 40, 50, 0.9);
}
.float-panel.theme-moonlight .result-artist {
  color: rgba(80, 80, 90, 0.55);
}
.float-panel.theme-moonlight .search-result-item:hover {
  background: rgba(0, 0, 0, 0.05);
}
.float-panel.theme-moonlight .search-results::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
}
.float-panel.theme-moonlight .search-loading {
  color: rgba(80, 80, 90, 0.5);
}
.float-panel.theme-moonlight .playlist-item-index {
  color: rgba(60, 60, 70, 0.5);
}
.float-panel.theme-moonlight .playlist-item-index:hover {
  color: rgba(40, 40, 50, 0.8);
  background: rgba(0, 0, 0, 0.04);
}
.float-panel.theme-moonlight .playlist-item-remove {
  color: rgba(80, 80, 90, 0.4);
}
.float-panel.theme-moonlight .playlist-item-checkbox {
  accent-color: rgba(85, 99, 212, 0.7);
}
.float-panel.theme-moonlight .result-source {
  color: rgba(85, 99, 212, 0.65);
}
/* 月光白卡片容器（注入到 float-panel 内） */
.card {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(230,230,230,0.8), rgba(200,200,200,0.4));
  border-radius: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: none;
}
.card .one {
  width: 100%;
  height: 100%;
  z-index: 10;
  position: absolute;
  background: rgba(255, 255, 255, 0.45);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8.5px);
  -webkit-backdrop-filter: blur(8.5px);
  border-radius: 30px;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.card .one .ml-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 0;
  flex-shrink: 0;
}
.card .one .ml-header .ml-header-left,
.card .one .ml-header .ml-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.card .one .ml-header .ml-header-icon {
  cursor: pointer;
  transition: fill 0.15s, transform 0.15s;
  fill: rgba(60, 60, 60, 0.8);
}
.card .one .ml-header .ml-header-icon:hover {
  fill: rgba(0, 0, 0, 0.95);
  transform: scale(1.1);
}
.card .one .ml-header .ml-header-icon.hidden {
  display: none;
}
.card .one .ml-repeat-wrap {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.card .one .ml-repeat-wrap .hidden {
  display: none;
}
.card .one .ml-play-wrap {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card .one .ml-play-wrap .hidden {
  display: none;
}
.card .one .title {
  width: 80px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255,255,255,0.3);
  display: block;
  margin: 16px auto;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  border-radius: 16px;
  font-family: Roboto, sans-serif;
  color: rgba(60, 60, 60, 0.9);
  padding: 4px 0;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.card .one .music {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.6);
  margin: 10px auto;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1), inset 0 0 0 2px rgba(255,255,255,0.8);
}
.card .one .music .note {
  fill: rgba(80, 80, 80, 0.6);
  width: 32px;
  height: 32px;
}
.card .one .music .cover-img {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 15px;
}
.card .one .name {
  width: 200px;
  height: 24px;
  font-size: 14px;
  font-weight: 600;
  font-family: Roboto, sans-serif;
  padding: 0 5px;
  margin: 4px auto 0;
  display: block;
  overflow: hidden;
  text-align: center;
  color: rgba(40, 40, 40, 0.9);
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}
.card .one .name1 {
  width: 150px;
  height: 20px;
  font-size: 11px;
  font-weight: 500;
  font-family: Roboto, sans-serif;
  padding: 0 5px;
  margin: 4px auto 0;
  display: block;
  overflow: hidden;
  text-align: center;
  color: rgba(80, 80, 80, 0.8);
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.card .one .bar {
  width: 140px;
  margin: 16px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5px;
  cursor: pointer;
  flex-shrink: 0;
}
.card .one .bar.bar-bottom {
  margin: auto auto 12px;
  width: 100%;
  padding: 4px 30px;
}
.card .one .bar .color {
  fill: rgba(60, 60, 60, 0.8);
  cursor: pointer;
  transition: fill 0.15s, transform 0.15s;
  width: 20px;
  height: 20px;
}
.card .one .bar .color:nth-child(2) {
  width: 24px;
  height: 24px;
}
.card .one .bar .color:hover {
  fill: rgba(0, 0, 0, 0.95);
  transform: scale(1.1);
}
.card .one .bar .color1 {
  fill: rgba(80, 80, 80, 0.7);
  cursor: pointer;
  transition: fill 0.15s, transform 0.15s;
  width: 18px;
  height: 18px;
}
.card .one .bar .color1:hover {
  fill: rgba(0, 0, 0, 0.95);
  transform: scale(1.1);
}
/* 上一首按钮翻转（参考 CSS） */
.card .one .bar .bi:first-child {
  transform: rotate(180deg);
}
.card .one .bar.bar-bottom .color1:first-child {
  transform: rotate(0deg);
}

/* (樱花粉已移除) */

/* ---- 在线模式页面 ---- */
.search-area {
  width: 100%;
  padding: 0 4px;
}
.search-box {
  --timing: 0.3s;
  --height-of-input: 38px;
  --border-height: 2px;
  --input-bg: rgba(255, 255, 255, 0.1);
  --border-color: #667eea;
  --border-radius: 30px;
  --after-border-radius: 1px;
  position: relative;
  width: 100%;
  height: var(--height-of-input);
  display: flex;
  align-items: center;
  padding-inline: 0.8em;
  border-radius: var(--border-radius);
  transition: border-radius 0.5s ease;
  background: var(--input-bg);
}
.search-box:before {
  content: "";
  position: absolute;
  background: var(--border-color);
  transform: scaleX(0);
  transform-origin: center;
  width: 100%;
  height: var(--border-height);
  left: 0;
  bottom: 0;
  border-radius: 1px;
  transition: transform var(--timing) ease;
}
.search-box:focus-within {
  border-radius: var(--after-border-radius);
}
.search-box:focus-within:before {
  transform: scale(1);
}
.search-icon {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  flex-shrink: 0;
}
.search-input {
  font-size: 0.9rem;
  background-color: transparent;
  width: 100%;
  height: 100%;
  padding-inline: 0.5em;
  padding-block: 0.7em;
  border: none;
  outline: none;
  color: #fff;
  min-width: 0;
}
.search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
.search-btn {
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s, color 0.15s;
}
.search-input:not(:placeholder-shown) ~ .search-btn {
  opacity: 1;
  visibility: visible;
}
.search-btn:hover {
  color: #fff;
}

/* 搜索结果列表 */
.search-results {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 0 4px;
}
.search-results::-webkit-scrollbar {
  width: 4px;
}
.search-results::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.search-placeholder {
  color: rgba(255, 255, 255, 0.25);
  font-size: 13px;
  text-align: center;
  padding-top: 40px;
}

/* 搜索结果项 */
.search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 10px;
}
.search-result-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.result-info {
  flex: 1;
  min-width: 0;
}
.result-title {
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.result-artist {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.result-source {
  color: rgba(102, 126, 234, 0.7);
  font-size: 10px;
  flex-shrink: 0;
}

/* ---- 歌曲列表 ---- */
.playlist-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}
.playlist-items::-webkit-scrollbar {
  width: 4px;
}
.playlist-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.playlist-placeholder {
  color: rgba(255, 255, 255, 0.25);
  font-size: 13px;
  text-align: center;
  padding-top: 40px;
}
.playlist-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: grab;
  transition: background 0.15s;
  gap: 10px;
  user-select: none;
  touch-action: none;
}
.playlist-item:active {
  cursor: grabbing;
}
.playlist-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.playlist-item.active {
  background: rgba(102, 126, 234, 0.15);
}
.playlist-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.playlist-item-title {
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.playlist-item.active .playlist-item-title {
  color: #667eea;
}
.playlist-item-artist {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 播放列表删除按钮 */
.playlist-item-remove {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.25);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
  margin-left: 4px;
}
.playlist-item-remove:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

/* 播放列表序号（兼作拖拽手柄） */
.playlist-item-index {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  min-width: 28px;
  padding: 8px 2px;
  text-align: center;
  cursor: grab;
  flex-shrink: 0;
  touch-action: none;
  user-select: none;
  font-variant-numeric: tabular-nums;
}
.playlist-item-index:hover {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.playlist-item-index:active {
  cursor: grabbing;
}
.playlist-item.dragging {
  opacity: 0.95;
  background: rgba(102, 126, 234, 0.25);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.4);
  transform: scale(1.03);
  z-index: 10;
  position: relative;
  border-radius: 8px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.playlist-item.drag-over {
  border-top: 2px solid #667eea;
}

/* 批量选择复选框 */
.select-all-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px 0;
}
.select-all-wrap label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  cursor: pointer;
  user-select: none;
}
.playlist-item-checkbox {
  width: 14px;
  height: 14px;
  accent-color: #667eea;
  cursor: pointer;
  flex-shrink: 0;
  margin: 0;
}
.batch-delete-btn {
  background: none;
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: rgba(248, 113, 113, 0.85);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.15s, color 0.15s;
}
.batch-delete-btn:hover {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

/* 搜索加载状态 */
.search-loading {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  text-align: center;
  padding-top: 30px;
}

/* ---- 胶囊 Toast ---- */
.toast-container {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  z-index: 10;
}
.toast {
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 12px;
  padding: 6px 16px;
  border-radius: 20px;
  white-space: nowrap;
  animation: toast-in 0.25s ease-out, toast-out 0.3s ease-in 2s forwards;
  pointer-events: none;
}
.toast.toast-error {
  background: rgba(248, 113, 113, 0.85);
}
.toast.toast-info {
  background: rgba(102, 126, 234, 0.85);
}
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toast-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
`;

// ============================================================
// 入口
// ============================================================

$(() => {
  const parentDoc = window.parent.document;
  const parentWin = window.parent;

  // ---- 状态 ----
  let playerRef: OfflinePlayer | null = null;
  let onResizeRef: (() => void) | null = null;
  let expanded = false;
  // 从 localStorage 恢复悬浮球位置，否则使用默认右下角
  let posX = parentWin.innerWidth - BALL_SIZE - 20;
  let posY = parentWin.innerHeight - BALL_SIZE - 20;
  try {
    const savedPos = parentWin.localStorage.getItem('alice-music-ball-pos');
    if (savedPos) {
      const p = JSON.parse(savedPos);
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        posX = Math.max(0, Math.min(p.x, parentWin.innerWidth - BALL_SIZE));
        posY = Math.max(0, Math.min(p.y, parentWin.innerHeight - BALL_SIZE));
      }
    }
  } catch {
    /* ignore */
  }

  // 创建 iframe
  const $iframe = createScriptIdIframe()
    .css({
      position: 'fixed',
      top: `${posY}px`,
      left: `${posX}px`,
      width: `${BALL_SIZE}px`,
      height: `${BALL_SIZE}px`,
      border: 'none',
      'z-index': 99999,
      background: 'transparent',
      overflow: 'hidden',
      'border-radius': `${BALL_SIZE / 2}px`,
    })
    .appendTo('body')
    .on('load', () => {
      const iframeEl = $iframe[0] as HTMLIFrameElement;
      const iframeDoc = iframeEl.contentDocument!;

      // 注入 Font Awesome
      const faLink = iframeDoc.createElement('link');
      faLink.rel = 'stylesheet';
      faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
      iframeDoc.head.appendChild(faLink);

      // 注入样式 + HTML
      const style = iframeDoc.createElement('style');
      style.textContent = FLOAT_CSS;
      iframeDoc.head.appendChild(style);
      iframeDoc.body.innerHTML = FLOAT_HTML;

      // iframe 内部 DOM
      const ball = iframeDoc.getElementById('float-ball')!;
      const panel = iframeDoc.getElementById('float-panel')!;
      const btnClose = iframeDoc.getElementById('btn-close')!;
      const btnSettings = iframeDoc.getElementById('btn-settings')!;
      const btnPlaylist = iframeDoc.getElementById('btn-playlist')!;
      const btnSearchOpen = iframeDoc.getElementById('btn-search-open')!;
      const btnFavList = iframeDoc.getElementById('btn-fav-list')!;
      const settingsPage = iframeDoc.getElementById('settings-page')!;
      const searchPage = iframeDoc.getElementById('search-page')!;
      const playlistPage = iframeDoc.getElementById('playlist-page')!;
      const favPage = iframeDoc.getElementById('fav-page')!;
      const btnBack = iframeDoc.getElementById('btn-back')!;
      const btnSearchBack = iframeDoc.getElementById('btn-search-back')!;
      const btnPlaylistBack = iframeDoc.getElementById('btn-playlist-back')!;
      const btnFavBack = iframeDoc.getElementById('btn-fav-back')!;
      const toastContainer = iframeDoc.getElementById('toast-container')!;

      // ---- localStorage 持久化 key（必须在使用前声明，避免 TDZ） ----
      const VOL_STORAGE_KEY = 'alice-music-volume';
      const POS_STORAGE_KEY = 'alice-music-ball-pos';
      const FAV_STORAGE_KEY = 'alice-music-favorites';

      /** 显示胶囊 Toast 提示 */
      function showToast(msg: string, type: 'error' | 'info' = 'info') {
        const el = iframeDoc.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        toastContainer.appendChild(el);
        // 动画结束后移除（toast-out 动画 2s 延迟 + 0.3s 播放 = 2.3s）
        setTimeout(() => el.remove(), 2500);
      }

      // ---- 辅助函数 ----
      function updateIframeGeometry() {
        if (expanded) {
          $iframe.css({
            top: `${posY}px`,
            left: `${posX}px`,
            width: `${PANEL_W}px`,
            height: `${PANEL_H}px`,
            'border-radius': '16px',
          });
        } else {
          $iframe.css({
            top: `${posY}px`,
            left: `${posX}px`,
            width: `${BALL_SIZE}px`,
            height: `${BALL_SIZE}px`,
            'border-radius': `${BALL_SIZE / 2}px`,
          });
        }
      }

      function clampPos(x: number, y: number): [number, number] {
        const vw = parentWin.innerWidth;
        const vh = parentWin.innerHeight;
        const w = expanded ? PANEL_W : BALL_SIZE;
        const h = expanded ? PANEL_H : BALL_SIZE;
        return [Math.max(0, Math.min(x, vw - w)), Math.max(0, Math.min(y, vh - h))];
      }

      // ==============================================================
      // 拖拽逻辑 v4.1 — setPointerCapture 全程方案
      //
      // 核心思路：
      //   - 整条拖拽事件链都在 iframe 内部 ball 上完成
      //   - 利用 setPointerCapture 确保即使鼠标移出 iframe 范围，
      //     pointermove/pointerup 仍然路由到 ball
      //   - 不需要切换 pointer-events，不需要父窗口事件监听
      //   - 坐标转换：ball 上的 clientX/Y 是 iframe 内坐标，
      //     通过 iframe 的 getBoundingClientRect() 转换为父页面坐标
      //
      // 流程：
      //   1. pointerdown → setPointerCapture + 注册 move/up
      //   2. pointermove：未超过 3px → 忽略；超过 3px → 拖拽移动 iframe
      //   3. pointerup：未超过阈值 → 单击展开；超过阈值 → 停留在释放位置
      // ==============================================================
      let isDragging = false;
      let hasMoved = false;
      let dragStartX = 0; // 父页面坐标系
      let dragStartY = 0;
      let dragBaseX = 0;
      let dragBaseY = 0;
      // 在 iframe 内部的悬浮球上监听 pointerdown
      ball.addEventListener('pointerdown', (e: PointerEvent) => {
        if (expanded || e.button !== 0) return;
        e.preventDefault();

        // 将 iframe 内的坐标转换为父页面坐标
        const iframeRect = iframeEl.getBoundingClientRect();
        dragStartX = iframeRect.left + e.clientX;
        dragStartY = iframeRect.top + e.clientY;
        dragBaseX = posX;
        dragBaseY = posY;

        isDragging = true;
        hasMoved = false;
        // setPointerCapture 确保后续事件即使鼠标移出 iframe 也路由到 ball
        ball.setPointerCapture(e.pointerId);
      });

      // pointermove：判定 + 拖拽移动（全在 ball 上）
      ball.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isDragging) return;

        // 坐标转换：ball capture 后 clientX/Y 仍是 iframe 内坐标
        const iframeRect = iframeEl.getBoundingClientRect();
        const parentX = iframeRect.left + e.clientX;
        const parentY = iframeRect.top + e.clientY;
        const dx = parentX - dragStartX;
        const dy = parentY - dragStartY;

        // 阈值判定
        if (!hasMoved) {
          if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) {
            return; // 还在阈值内，不做任何事
          }
          hasMoved = true; // 超过阈值，标记为拖拽
        }

        // 拖拽移动 iframe
        [posX, posY] = clampPos(dragBaseX + dx, dragBaseY + dy);
        updateIframeGeometry();
      });

      // pointerup：结束拖拽或触发单击（全在 ball 上）
      ball.addEventListener('pointerup', (e: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;

        // 释放 pointer capture
        ball.releasePointerCapture(e.pointerId);

        if (!hasMoved) {
          // 未超过阈值 → 单击 → 展开面板
          expand();
        } else {
          // 拖拽结束 → 持久化位置
          try {
            parentWin.localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ x: posX, y: posY }));
          } catch {
            /* ignore */
          }
        }
      });

      // ---- 展开 / 折叠 ----
      function expand() {
        expanded = true;
        ball.classList.add('hidden');
        panel.classList.remove('hidden');

        [posX, posY] = clampPos(posX, posY);
        updateIframeGeometry();

        // 延迟注册外部点击监听
        requestAnimationFrame(() => {
          parentDoc.addEventListener('pointerdown', onOutsideClick, true);
        });
      }

      /** 关闭所有叠加页 */
      function closeAllOverlays() {
        settingsPage.classList.add('hidden');
        searchPage.classList.add('hidden');
        playlistPage.classList.add('hidden');
        favPage.classList.add('hidden');
      }

      function collapse() {
        if (!expanded) return;
        expanded = false;
        parentDoc.removeEventListener('pointerdown', onOutsideClick, true);

        // 播放关闭动画，结束后隐藏面板 + 缩小 iframe
        panel.classList.add('collapsing');
        panel.addEventListener(
          'animationend',
          function onEnd() {
            panel.removeEventListener('animationend', onEnd);
            panel.classList.remove('collapsing');
            panel.classList.add('hidden');
            closeAllOverlays();
            ball.classList.remove('hidden');

            [posX, posY] = clampPos(posX, posY);
            updateIframeGeometry();
          },
          { once: true },
        );
      }

      function onOutsideClick(e: Event) {
        if (!expanded) return;
        if (e.target === iframeEl || iframeEl.contains(e.target as Node)) {
          return;
        }
        collapse();
      }

      // ---- iframe 内部按钮事件 ----
      btnClose.addEventListener('click', () => collapse());

      // 顶部栏按钮 → 打开叠加页（互斥：打开一个时关闭其他）
      btnSettings.addEventListener('click', () => {
        closeAllOverlays();
        updateModeUI();
        settingsPage.classList.remove('hidden');
        if (playMode === 'online') {
          runApiCheck();
        }
      });
      btnPlaylist.addEventListener('click', () => {
        closeAllOverlays();
        // 根据模式渲染不同的歌曲列表
        if (playMode === 'online') {
          renderPlaylist();
        } else {
          renderOfflinePlaylist();
        }
        playlistPage.classList.remove('hidden');
      });
      btnSearchOpen.addEventListener('click', () => {
        closeAllOverlays();
        searchPage.classList.remove('hidden');
        // 自动聚焦输入框
        const input = iframeDoc.getElementById('search-input') as HTMLInputElement;
        input?.focus();
      });

      // 收藏列表按钮
      btnFavList.addEventListener('click', () => {
        closeAllOverlays();
        renderFavList();
        favPage.classList.remove('hidden');
      });

      // 叠加页返回按钮
      btnBack.addEventListener('click', () => settingsPage.classList.add('hidden'));
      btnSearchBack.addEventListener('click', () => searchPage.classList.add('hidden'));
      btnPlaylistBack.addEventListener('click', () => playlistPage.classList.add('hidden'));
      btnFavBack.addEventListener('click', () => favPage.classList.add('hidden'));

      // ---- 播放模式切换（仅影响状态，不切换主界面） ----
      const modeToggle = iframeDoc.getElementById('mode-toggle')!;
      const apiStatusItem = iframeDoc.getElementById('api-status-item')!;
      const apiStatusEl = iframeDoc.getElementById('api-status')!;
      let playMode: 'offline' | 'online' = 'offline';

      // ---- 月光白卡片状态（提前声明，避免 TDZ） ----
      let mlCard: HTMLElement | null = null;
      let mlObserver: MutationObserver | null = null;

      /** 更新模式相关 UI 的显隐（搜索按钮 + 数据源状态） */
      function updateModeUI() {
        apiStatusItem.classList.toggle('hidden', playMode !== 'online');
        btnSearchOpen.classList.toggle('hidden', playMode !== 'online');
        syncMlSearchVisibility();
      }

      // 初始化模式 UI（默认离线：隐藏搜索按钮）
      updateModeUI();

      /** 执行 API 可达性检测并更新 UI */
      async function runApiCheck() {
        apiStatusEl.textContent = '检测中...';
        apiStatusEl.className = 'setting-value api-status checking';
        const result = await checkApiStatus();
        apiStatusEl.textContent = result === 'ok' ? '已连接' : '不可用';
        apiStatusEl.className = `setting-value api-status ${result}`;
      }

      modeToggle.addEventListener('click', () => {
        playMode = playMode === 'offline' ? 'online' : 'offline';
        modeToggle.textContent = playMode === 'offline' ? '离线播放' : '在线播放';
        modeToggle.classList.toggle('online', playMode === 'online');
        updateModeUI();
        // 切到在线模式且设置页可见时触发检测
        if (playMode === 'online' && !settingsPage.classList.contains('hidden')) {
          runApiCheck();
        }
      });

      // ---- 主题切换 ----
      const themeToggle = iframeDoc.getElementById('theme-toggle')!;
      const THEMES = ['默认', '月光白'] as const;
      type ThemeName = (typeof THEMES)[number];
      let currentThemeIndex = 0;
      const THEME_STORAGE_KEY = 'alice-music-theme';

      /** 应用主题 CSS 类到面板根元素，月光白注入完整参考 HTML */
      const floatPanel = iframeDoc.getElementById('float-panel')!;

      // 月光白卡片 HTML（完全照搬参考，去掉 .two/.three 光球）
      const ML_CARD_HTML = `
<div class="one">
  <div class="ml-header">
    <div class="ml-header-left">
      <svg id="ml-btn-settings" viewBox="0 0 16 16" class="color1 ml-header-icon bi bi-gear" fill="currentColor" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"></path>
        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"></path>
      </svg>
      <svg id="ml-btn-fav-list" viewBox="0 0 17.503 15.625" class="color1 ml-header-icon" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.752,15.625h0L1.293,8.461A4.023,4.023,0,0,1,0,5.574,4.642,4.642,0,0,1,4.678.941a4.728,4.728,0,0,1,4.074,2.46A4.728,4.728,0,0,1,12.826.941a4.642,4.642,0,0,1,4.678,4.633,4.023,4.023,0,0,1-1.293,2.887L8.752,15.625Z"></path>
      </svg>
    </div>
    <div class="ml-header-right">
      <svg id="ml-btn-search" viewBox="0 0 16 16" class="color1 ml-header-icon bi bi-search hidden" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"></path>
      </svg>
      <svg id="ml-btn-close" viewBox="0 0 16 16" class="color1 ml-header-icon bi bi-x-lg" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"></path>
      </svg>
    </div>
  </div>
  <span class="title">Music</span>
  <div class="music">
    <svg viewBox="0 0 16 16" class="note bi bi-music-note" fill="currentColor" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2z"></path>
      <path d="M9 3v10H8V3h1z" fill-rule="evenodd"></path>
      <path d="M8 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 13 2.22V4L8 5V2.82z"></path>
    </svg>
    <img class="cover-img hidden" alt="" />
  </div>
  <span class="name" id="ml-song-title">暂无歌曲</span>
  <span class="name1" id="ml-song-artist">--</span>
  <div class="bar" id="ml-bar-controls">
    <svg id="ml-btn-prev" viewBox="0 0 16 16" class="color bi bi-fast-forward-fill" fill="currentColor" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C.713 12.69 0 12.345 0 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z"></path>
      <path d="M15.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C8.713 12.69 8 12.345 8 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z"></path>
    </svg>
    <div id="ml-btn-play-wrap" class="ml-play-wrap">
      <svg id="ml-icon-play" viewBox="0 0 16 16" class="color bi bi-caret-right-fill" fill="currentColor" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"></path>
      </svg>
      <svg id="ml-icon-pause" viewBox="0 0 16 16" class="color bi bi-pause-fill hidden" fill="currentColor" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="2" width="3" height="12" rx="0.5"></rect>
        <rect x="9" y="2" width="3" height="12" rx="0.5"></rect>
      </svg>
    </div>
    <svg id="ml-btn-next" viewBox="0 0 16 16" class="color bi bi-fast-forward-fill" fill="currentColor" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C.713 12.69 0 12.345 0 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z"></path>
      <path d="M15.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C8.713 12.69 8 12.345 8 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z"></path>
    </svg>
  </div>
  <div class="bar bar-bottom" id="ml-bar-bottom">
    <div id="ml-btn-repeat-wrap" class="ml-repeat-wrap" title="列表循环">
      <svg id="ml-icon-repeat-all" viewBox="0 0 16 16" class="color1" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zM5 10.534V12h6a4 4 0 0 0 3.584-5.777.5.5 0 0 1 .896-.446A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192z"></path>
      </svg>
      <svg id="ml-icon-repeat-one" viewBox="0 0 16 16" class="color1 hidden" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zM5 10.534V12h6a4 4 0 0 0 3.584-5.777.5.5 0 0 1 .896-.446A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192z"></path>
        <text x="8" y="9.5" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor" font-family="sans-serif">1</text>
      </svg>
      <svg id="ml-icon-sequential" viewBox="0 0 16 16" class="color1 hidden" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" fill-rule="evenodd"></path>
      </svg>
    </div>
    <svg id="ml-btn-playlist" viewBox="0 0 16 16" class="color1 bi bi-music-note-list" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2z"></path>
      <path d="M12 3v10h-1V3h1z" fill-rule="evenodd"></path>
      <path d="M11 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 16 2.22V4l-5 1V2.82z"></path>
      <path d="M0 11.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5zm0-4A.5.5 0 0 1 .5 7H8a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5zm0-4A.5.5 0 0 1 .5 3H8a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5z" fill-rule="evenodd"></path>
    </svg>
    <div id="ml-btn-heart" style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <svg id="ml-icon-heart-empty" viewBox="0 0 16 16" class="color1 bi bi-suit-heart" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="m8 6.236-.894-1.789c-.222-.443-.607-1.08-1.152-1.595C5.418 2.345 4.776 2 4 2 2.324 2 1 3.326 1 4.92c0 1.211.554 2.066 1.868 3.37.337.334.721.695 1.146 1.093C5.122 10.423 6.5 11.717 8 13.447c1.5-1.73 2.878-3.024 3.986-4.064.425-.398.81-.76 1.146-1.093C14.446 6.986 15 6.131 15 4.92 15 3.326 13.676 2 12 2c-.777 0-1.418.345-1.954.852-.545.515-.93 1.152-1.152 1.595L8 6.236zm.392 8.292a.513.513 0 0 1-.784 0c-1.601-1.902-3.05-3.262-4.243-4.381C1.3 8.208 0 6.989 0 4.92 0 2.755 1.79 1 4 1c1.6 0 2.719 1.05 3.404 2.008.26.365.458.716.596.992a7.55 7.55 0 0 1 .596-.992C9.281 2.049 10.4 1 12 1c2.21 0 4 1.755 4 3.92 0 2.069-1.3 3.288-3.365 5.227-1.193 1.12-2.642 2.48-4.243 4.38z"></path>
      </svg>
      <svg id="ml-icon-heart-filled" viewBox="0 0 16 16" class="color1 bi bi-suit-heart-fill hidden" fill="currentColor" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 1c2.21 0 4 1.755 4 3.92C8 2.755 9.79 1 12 1s4 1.755 4 3.92c0 3.263-3.234 4.414-7.608 9.608a.513.513 0 0 1-.784 0C3.234 9.334 0 8.183 0 4.92 0 2.755 1.79 1 4 1z"></path>
      </svg>
    </div>
  </div>
</div>`;

      /** 进入月光白：注入参考卡片，绑定按钮事件 */
      function enterMoonlightLayout() {
        mlCard = iframeDoc.createElement('div');
        mlCard.className = 'card';
        mlCard.innerHTML = ML_CARD_HTML;
        floatPanel.appendChild(mlCard);

        // 绑定按钮事件到现有播放器
        const mlBtnPrev = mlCard.querySelector('#ml-btn-prev') as SVGElement;
        const mlBtnNext = mlCard.querySelector('#ml-btn-next') as SVGElement;
        const mlBtnPlaylist = mlCard.querySelector('#ml-btn-playlist') as SVGElement;
        const mlBtnHeart = mlCard.querySelector('#ml-btn-heart') as HTMLElement;
        const mlBtnGear = mlCard.querySelector('#ml-btn-settings') as SVGElement;
        const mlBtnFavList = mlCard.querySelector('#ml-btn-fav-list') as SVGElement;
        const mlBtnSearch = mlCard.querySelector('#ml-btn-search') as SVGElement;
        const mlBtnClose = mlCard.querySelector('#ml-btn-close') as SVGElement;
        const mlRepeatWrap = mlCard.querySelector('#ml-btn-repeat-wrap') as HTMLElement;

        // 播放/暂停按钮（双 SVG 互斥，点击 wrap 容器）
        const mlPlayWrap = mlCard.querySelector('#ml-btn-play-wrap') as HTMLElement;
        mlPlayWrap?.addEventListener('click', () => iframeDoc.getElementById('btn-play')!.click());

        mlBtnPrev?.addEventListener('click', () => iframeDoc.getElementById('btn-prev')!.click());
        mlBtnNext?.addEventListener('click', () => iframeDoc.getElementById('btn-next')!.click());
        mlBtnPlaylist?.addEventListener('click', () => iframeDoc.getElementById('btn-playlist')!.click());
        mlBtnHeart?.addEventListener('click', () => iframeDoc.getElementById('btn-fav')!.click());
        mlBtnGear?.addEventListener('click', () => iframeDoc.getElementById('btn-settings')!.click());
        mlBtnFavList?.addEventListener('click', () => iframeDoc.getElementById('btn-fav-list')!.click());
        mlBtnSearch?.addEventListener('click', () => iframeDoc.getElementById('btn-search-open')!.click());
        mlBtnClose?.addEventListener('click', () => iframeDoc.getElementById('btn-close')!.click());

        // 循环模式按钮：点击时代理到默认主题 btn-repeat，然后同步图标
        mlRepeatWrap?.addEventListener('click', () => {
          iframeDoc.getElementById('btn-repeat')!.click();
          syncMlRepeatIcon();
        });

        // 初始同步搜索按钮显隐
        syncMlSearchVisibility();
        // 初始同步播放/暂停图标
        syncMlPlayIcon();
        // 初始同步循环模式图标
        syncMlRepeatIcon();
        // 初始同步收藏爱心图标
        syncMlFavIcon();

        // 同步当前歌曲信息 + 监听后续变化
        syncMoonlightInfo();
        const songInfo = iframeDoc.querySelector('.song-info') as HTMLElement;
        if (songInfo) {
          mlObserver = new MutationObserver(() => syncMoonlightInfo());
          mlObserver.observe(songInfo, { childList: true, subtree: true, characterData: true });
        }
        // 监听封面图变化
        const discCover = iframeDoc.getElementById('disc-cover') as HTMLElement;
        if (discCover) {
          const coverObs = new MutationObserver(() => syncMoonlightInfo());
          coverObs.observe(discCover, { attributes: true, attributeFilter: ['src', 'class'] });
          // 存到 mlObserver 上方便统一清理
          (mlObserver as any)._coverObs = coverObs;
        }
      }

      /** 离开月光白：移除卡片 */
      function exitMoonlightLayout() {
        if (mlObserver) {
          mlObserver.disconnect();
          if ((mlObserver as any)._coverObs) (mlObserver as any)._coverObs.disconnect();
          mlObserver = null;
        }
        if (mlCard) {
          mlCard.remove();
          mlCard = null;
        }
      }

      /** 同步歌曲信息到月光白卡片 */
      function syncMoonlightInfo() {
        if (!mlCard) return;
        const songTitle = iframeDoc.querySelector('.song-title') as HTMLElement;
        const songArtist = iframeDoc.querySelector('.song-artist') as HTMLElement;
        const mlName = mlCard.querySelector('#ml-song-title') as HTMLElement;
        const mlName1 = mlCard.querySelector('#ml-song-artist') as HTMLElement;
        if (mlName && songTitle) mlName.textContent = songTitle.textContent;
        if (mlName1 && songArtist) mlName1.textContent = songArtist.textContent;
        // 同步封面图
        const discCover = iframeDoc.getElementById('disc-cover') as HTMLImageElement;
        const mlCover = mlCard.querySelector('.cover-img') as HTMLImageElement;
        const mlNote = mlCard.querySelector('.note') as SVGElement;
        if (discCover && mlCover && mlNote) {
          if (discCover.src && !discCover.classList.contains('hidden')) {
            mlCover.src = discCover.src;
            mlCover.classList.remove('hidden');
            mlNote.style.display = 'none';
          } else {
            mlCover.classList.add('hidden');
            mlNote.style.display = '';
          }
        }
      }

      /** 同步月光白播放/暂停图标（根据 audio 状态） */
      function syncMlPlayIcon() {
        if (!mlCard) return;
        const mlPlay = mlCard.querySelector('#ml-icon-play') as HTMLElement;
        const mlPause = mlCard.querySelector('#ml-icon-pause') as HTMLElement;
        if (!mlPlay || !mlPause) return;
        // 检查默认主题的 icon-pause 是否可见（即正在播放）
        const defPause = iframeDoc.querySelector('#icon-pause') as HTMLElement;
        const isPlaying = defPause && !defPause.classList.contains('hidden');
        if (isPlaying) {
          mlPlay.classList.add('hidden');
          mlPause.classList.remove('hidden');
        } else {
          mlPlay.classList.remove('hidden');
          mlPause.classList.add('hidden');
        }
      }

      /** 同步月光白收藏爱心图标 */
      function syncMlFavIcon() {
        if (!mlCard) return;
        const mlHeartEmpty = mlCard.querySelector('#ml-icon-heart-empty') as HTMLElement;
        const mlHeartFilled = mlCard.querySelector('#ml-icon-heart-filled') as HTMLElement;
        if (!mlHeartEmpty || !mlHeartFilled) return;
        // 检查默认主题 btn-fav 是否处于收藏态
        const defBtnFav = iframeDoc.getElementById('btn-fav');
        const isFav = defBtnFav?.classList.contains('fav-active');
        if (isFav) {
          mlHeartEmpty.classList.add('hidden');
          mlHeartFilled.classList.remove('hidden');
          mlHeartFilled.style.fill = '#f87171';
        } else {
          mlHeartEmpty.classList.remove('hidden');
          mlHeartFilled.classList.add('hidden');
          mlHeartFilled.style.fill = '';
        }
      }

      /** 同步月光白循环模式图标（根据 repeatMode） */
      function syncMlRepeatIcon() {
        if (!mlCard) return;
        const wrap = mlCard.querySelector('#ml-btn-repeat-wrap') as HTMLElement;
        const iconAll = mlCard.querySelector('#ml-icon-repeat-all') as HTMLElement;
        const iconOne = mlCard.querySelector('#ml-icon-repeat-one') as HTMLElement;
        const iconSeq = mlCard.querySelector('#ml-icon-sequential') as HTMLElement;
        if (!wrap || !iconAll || !iconOne || !iconSeq) return;
        iconAll.classList.add('hidden');
        iconOne.classList.add('hidden');
        iconSeq.classList.add('hidden');
        if (repeatMode === 'repeat-all') {
          iconAll.classList.remove('hidden');
          wrap.title = '列表循环';
        } else if (repeatMode === 'repeat-one') {
          iconOne.classList.remove('hidden');
          wrap.title = '单曲循环';
        } else {
          iconSeq.classList.remove('hidden');
          wrap.title = '顺序播放';
        }
      }

      /** 同步月光白搜索按钮显隐（根据 playMode） */
      function syncMlSearchVisibility() {
        if (!mlCard) return;
        const mlSearch = mlCard.querySelector('#ml-btn-search') as HTMLElement;
        if (mlSearch) {
          mlSearch.classList.toggle('hidden', playMode !== 'online');
        }
      }

      let currentMoonlight = false;
      let moonTransitionRunning = false;

      /** 月光白转场动画：月亮+星星从左上对角线滑到右下，白色遮罩跟随"刷白"面板 */
      function playMoonTransition(onComplete: () => void) {
        if (moonTransitionRunning) {
          onComplete();
          return;
        }
        moonTransitionRunning = true;

        const overlay = iframeDoc.createElement('div');
        overlay.className = 'moon-transition-overlay';

        const panelW = floatPanel.offsetWidth || 280;
        const panelH = floatPanel.offsetHeight || 380;

        // 月亮起点（左上角外侧）和终点（右下角内侧，不滑出界面）
        const startX = -80,
          startY = -80;
        const moonSize = 70; // .moon-wrapper width/height
        const endX = panelW - moonSize - 15,
          endY = panelH - moonSize - 15;
        const ANIM_DUR = 1.8; // 秒 — 慢速，让用户看清整个转场
        const totalMs = ANIM_DUR * 1000;

        // 预计算对角线长度（避免每帧重算）
        const diag = Math.sqrt(panelW * panelW + panelH * panelH);
        const sqrt2 = Math.SQRT2;

        // —— 对角线白色遮罩层 ——
        const washLayer = iframeDoc.createElement('div');
        washLayer.className = 'moon-wash-layer';
        washLayer.style.setProperty('--wash-pct', '0%');
        overlay.appendChild(washLayer);

        // —— 月亮（单层弯月 + 流星拖尾）——
        const moonEl = iframeDoc.createElement('div');
        moonEl.className = 'moon-wrapper';
        moonEl.innerHTML = `
          <div class="moon-trail"></div>
          <div class="moon-body">
            <div class="crater crater-1"></div>
            <div class="crater crater-2"></div>
            <div class="crater crater-3"></div>
            <div class="crater crater-4"></div>
            <div class="crater crater-5"></div>
            <div class="crater crater-6"></div>
            <div class="crater crater-7"></div>
          </div>`;
        // 使用 transform 替代 left/top，走 GPU 合成（Firefox 移动端友好）
        moonEl.style.transform = `translate(${startX}px, ${startY}px)`;
        overlay.appendChild(moonEl);

        // —— 星星（clip-path 四角星 + 拖尾，6-8颗）——
        const starCount = 6 + Math.floor(Math.random() * 3);
        interface StarInfo {
          el: HTMLElement;
          progress: number;
          delay: number;
          offX: number;
          offY: number;
        }
        const starInfos: StarInfo[] = [];
        for (let i = 0; i < starCount; i++) {
          const star = iframeDoc.createElement('div');
          star.className = 'transit-star';
          const size = 16 + Math.random() * 24;
          star.style.width = size + 'px';
          star.style.height = size + 'px';
          star.style.opacity = '0';
          star.innerHTML = '<div class="star-icon"></div><div class="star-trail"></div>';
          overlay.appendChild(star);
          starInfos.push({
            el: star,
            progress: 0.15 + Math.random() * 0.75,
            delay: 0.05 + Math.random() * 0.3,
            offX: (Math.random() - 0.5) * 90,
            offY: (Math.random() - 0.5) * 90,
          });
        }

        floatPanel.appendChild(overlay);

        // —— cubic-bezier(0.34, 1.56, 0.64, 1) 近似函数 ——
        function easeBounce(t: number): number {
          if (t <= 0) return 0;
          if (t >= 1) return 1;
          const p = 1 - t;
          return 1 - p * p * (2.56 * p - 1.56);
        }

        // —— rAF 驱动所有元素位置 + 白色遮罩 ——
        // 使用 Date.now() 作为时间源：Firefox 移动端 srcdoc iframe 中
        // performance.now() 精度被 Fingerprinting Protection 降至 ~100ms，
        // 导致动画每帧 elapsed 变化为 0 → 动画卡死不前进。
        let rafId = 0;
        let themeApplied = false;
        const startTime = Date.now();

        function tick() {
          const elapsed = Date.now() - startTime;
          const rawT = Math.min(elapsed / totalMs, 1);
          const t = easeBounce(rawT);

          // 月亮位置 — 使用 transform: translate() 走 GPU 合成层
          const mx = startX + (endX - startX) * t;
          const my = startY + (endY - startY) * t;
          moonEl.style.transform = `translate(${mx}px, ${my}px)`;
          moonEl.style.opacity = rawT < 0.08 ? String(rawT / 0.08) : '1';

          // 白色遮罩：对角线渐变分界线跟随月亮对角线进度
          const projectedDist = (mx + my) / sqrt2;
          const washPct = Math.max(0, (projectedDist / (diag * 0.7)) * 100);
          washLayer.style.setProperty('--wash-pct', washPct + '%');
          if (rawT > 0.03) washLayer.style.opacity = '1';

          // 星星：每颗有不同 delay，到达自己的终点后停住
          for (const si of starInfos) {
            const starRawT = Math.max(0, (elapsed - si.delay * 1000) / (totalMs * 0.7));
            const starT = easeBounce(Math.min(starRawT, 1));
            const targetX = startX + (endX - startX) * si.progress + si.offX;
            const targetY = startY + (endY - startY) * si.progress + si.offY;
            const sx = startX + (targetX - startX) * starT;
            const sy = startY + (targetY - startY) * starT;
            si.el.style.transform = `translate(${sx}px, ${sy}px)`;
            si.el.style.opacity = starRawT <= 0 ? '0' : starRawT < 0.1 ? String(starRawT / 0.1) : '0.9';
          }

          // 月亮滑过约 85% 时切换主题（遮罩已覆盖大部分面板）
          if (!themeApplied && rawT >= 0.85) {
            themeApplied = true;
            onComplete();
          }

          if (rawT < 1) {
            rafId = requestAnimationFrame(tick);
          } else {
            // 动画主体结束 → 确保主题切换
            if (!themeApplied) {
              themeApplied = true;
              onComplete();
            }
            // 月亮淡出
            moonEl.style.animation = 'moon-fade-out 0.5s ease forwards';
            // 星星闪烁淡出
            starInfos.forEach(si => {
              si.el.style.animation = 'star-twinkle-out 0.6s ease forwards';
            });
            // 遮罩淡出（月光白卡片已接管显示）
            washLayer.style.transition = 'opacity 0.5s ease';
            washLayer.style.opacity = '0';
            // 清理 DOM
            setTimeout(() => {
              overlay.remove();
              moonTransitionRunning = false;
            }, 700);
          }
        }
        rafId = requestAnimationFrame(tick);
      }

      let skipMoonTransition = false; // 初始化恢复时跳过动画

      function applyTheme(name: ThemeName) {
        const wasMoonlight = currentMoonlight;
        if (name === '月光白' && !wasMoonlight && !skipMoonTransition) {
          // 用户点击切换：触发转场动画，锁定防止重复点击
          themeSwitching = true;
          themeToggle.textContent = name;
          playMoonTransition(() => {
            floatPanel.classList.remove('theme-moonlight');
            floatPanel.classList.add('theme-moonlight');
            enterMoonlightLayout();
            currentMoonlight = true;
            themeSwitching = false;
          });
        } else {
          floatPanel.classList.remove('theme-moonlight');
          if (name === '月光白') {
            floatPanel.classList.add('theme-moonlight');
            if (!wasMoonlight) enterMoonlightLayout();
            currentMoonlight = true;
          } else {
            if (wasMoonlight) exitMoonlightLayout();
            currentMoonlight = false;
          }
          themeToggle.textContent = name;
        }
      }

      // 初始化：从 localStorage 读取上次主题（跳过转场动画）
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved) {
          const idx = THEMES.indexOf(saved as ThemeName);
          if (idx >= 0) {
            currentThemeIndex = idx;
            skipMoonTransition = true;
            applyTheme(THEMES[idx]);
            skipMoonTransition = false;
          }
        }
      } catch {}

      let themeSwitching = false; // 防止快速点击叠加
      themeToggle.addEventListener('click', () => {
        if (themeSwitching || moonTransitionRunning) return;
        themeSwitching = true;
        currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
        const name = THEMES[currentThemeIndex];
        applyTheme(name);
        // 非动画切换（默认→默认 或 月光白→默认）延迟解锁，防止快速连点
        if (!moonTransitionRunning) {
          setTimeout(() => {
            themeSwitching = false;
          }, 350);
        }
        try {
          localStorage.setItem(THEME_STORAGE_KEY, name);
        } catch {}
      });

      // ---- 在线播放列表状态（提前声明，供后续函数引用） ----
      const onlinePlaylist: SearchResult[] = [];
      let onlineCurrentIndex = -1;

      // ---- 循环模式状态 ----
      let repeatMode: RepeatMode = 'repeat-all'; // 默认列表循环
      const btnRepeat = iframeDoc.getElementById('btn-repeat')!;
      btnRepeat.classList.add('active'); // 默认列表循环为激活态

      /** 更新循环模式按钮的图标和提示 */
      function updateRepeatBtn() {
        const icon = btnRepeat.querySelector('i')!;
        // 移除可能存在的角标
        const oldBadge = btnRepeat.querySelector('.repeat-one-badge');
        if (oldBadge) oldBadge.remove();

        if (repeatMode === 'repeat-all') {
          icon.className = 'fa-solid fa-repeat';
          btnRepeat.title = '列表循环';
          btnRepeat.classList.add('active');
        } else if (repeatMode === 'repeat-one') {
          icon.className = 'fa-solid fa-repeat';
          const badge = iframeDoc.createElement('span');
          badge.className = 'repeat-one-badge';
          badge.textContent = '1';
          btnRepeat.appendChild(badge);
          btnRepeat.title = '单曲循环';
          btnRepeat.classList.add('active');
        } else {
          icon.className = 'fa-solid fa-right-long';
          btnRepeat.title = '顺序播放';
          btnRepeat.classList.remove('active');
        }
        syncMlRepeatIcon();
      }

      btnRepeat.addEventListener('click', () => {
        if (repeatMode === 'repeat-all') repeatMode = 'repeat-one';
        else if (repeatMode === 'repeat-one') repeatMode = 'sequential';
        else repeatMode = 'repeat-all';
        updateRepeatBtn();
      });

      // ---- 离线播放引擎 ----
      const btnPlay = iframeDoc.getElementById('btn-play')!;
      const btnPrev = iframeDoc.getElementById('btn-prev')!;
      const btnNext = iframeDoc.getElementById('btn-next')!;
      const songTitle = iframeDoc.querySelector('.song-title') as HTMLElement;
      const songArtist = iframeDoc.querySelector('.song-artist') as HTMLElement;

      const disc = iframeDoc.querySelector('.disc') as HTMLElement;
      const discCover = iframeDoc.getElementById('disc-cover') as HTMLImageElement;

      /** 更新唱片封面（传空字符串恢复默认） */
      function updateDiscCover(coverUrl: string) {
        if (coverUrl) {
          discCover.src = coverUrl;
          discCover.classList.remove('hidden');
        } else {
          discCover.classList.add('hidden');
          discCover.removeAttribute('src');
        }
      }

      const player = new OfflinePlayer(OFFLINE_TRACKS);
      playerRef = player;

      // 切回离线模式时重置在线播放状态
      player.onResumeOffline = () => {
        onlineCurrentIndex = -1;
      };

      // 初始加载第一首（不播放），显示曲目信息
      player.loadTrack(0);

      // 状态回调：切换播放/暂停图标 + 唱片旋转动画
      const iconPlay = btnPlay.querySelector('#icon-play') as HTMLElement;
      const iconPause = btnPlay.querySelector('#icon-pause') as HTMLElement;
      const setPlayIcon = (playing: boolean) => {
        if (playing) {
          iconPlay.classList.add('hidden');
          iconPause.classList.remove('hidden');
        } else {
          iconPlay.classList.remove('hidden');
          iconPause.classList.add('hidden');
        }
      };

      player.onStateChange = playing => {
        setPlayIcon(playing);
        syncMlPlayIcon();
        if (playing) {
          disc.classList.remove('paused');
          disc.classList.add('spinning');
        } else {
          disc.classList.remove('spinning');
          disc.classList.add('paused');
        }
      };

      /** 格式化离线歌曲 artist 行：歌手 · 阶段名 */
      function formatOfflineArtist(track: OfflineTrack): string {
        return track.artist ? `${track.artist} · ${track.stage}` : track.stage;
      }

      // 曲目回调：更新歌曲信息显示 + 恢复默认唱片封面
      player.onTrackChange = track => {
        songTitle.textContent = track.title;
        songArtist.textContent = formatOfflineArtist(track);
        updateDiscCover(''); // 离线模式：恢复默认唱片背景
        updateMediaSession(track.title, formatOfflineArtist(track));
      };

      // 播放出错回调：显示 toast 提示
      player.onError = track => {
        if (onlineCurrentIndex >= 0 && onlinePlaylist.length > 0) {
          // 在线模式下出错（URL 可能过期）
          const onlineTrack = onlinePlaylist[onlineCurrentIndex];
          showToast(`链接已过期: ${onlineTrack?.title ?? track.title}`, 'error');
        } else {
          showToast(`播放失败: ${track.title}`, 'error');
        }
      };

      // 手动触发一次曲目回调以初始化显示
      player.onTrackChange(player.currentTrack, player.currentIndex);

      // 离线模式播放结束：始终停止，不自动切歌（由 MVU 阶段变化触发切歌）
      player.onEnded = () => {
        player.onStateChange?.(false);
        return true; // 阻止默认 next()
      };

      // 绑定按钮（切回离线模式时重置在线状态）
      function resumeOfflineMode() {
        player._skipEndedHandler = false;
        onlineCurrentIndex = -1;
        updateFavBtn();
      }
      btnPlay.addEventListener('click', () => {
        // 如果当前在播放在线歌曲且按了播放/暂停，直接控制 audio
        if (onlineCurrentIndex >= 0) {
          if (audio.paused) {
            audio
              .play()
              .then(() => player.onStateChange?.(true))
              .catch(() => {});
          } else {
            audio.pause();
            player.onStateChange?.(false);
          }
          return;
        }
        player.togglePlay();
      });
      btnPrev.addEventListener('click', () => {
        if (onlineCurrentIndex >= 0 && onlinePlaylist.length > 0) {
          // 在线列表上一首（循环回绕）
          const prevIdx = (onlineCurrentIndex - 1 + onlinePlaylist.length) % onlinePlaylist.length;
          playOnlineTrack(prevIdx);
          return;
        }
        resumeOfflineMode();
        player.prev();
      });
      btnNext.addEventListener('click', () => {
        if (onlineCurrentIndex >= 0 && onlinePlaylist.length > 0) {
          // 在线列表下一首（循环回绕）
          const nextIdx = (onlineCurrentIndex + 1) % onlinePlaylist.length;
          playOnlineTrack(nextIdx);
          return;
        }
        resumeOfflineMode();
        player.next();
      });

      // ---- 进度条 ----
      const progressBar = iframeDoc.getElementById('progress-bar')!;
      const progressFill = iframeDoc.getElementById('progress-fill')!;
      const progressThumb = iframeDoc.getElementById('progress-thumb')!;
      const timeCurrent = iframeDoc.getElementById('time-current')!;
      const timeTotal = iframeDoc.getElementById('time-total')!;
      const audio = player.audioElement;
      let isSeeking = false;

      /** 格式化秒数为 m:ss */
      function formatTime(sec: number): string {
        if (!isFinite(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      }

      /** 更新进度条 UI */
      function updateProgressUI(pct: number) {
        const clamped = Math.max(0, Math.min(100, pct));
        progressFill.style.width = `${clamped}%`;
        progressThumb.style.left = `${clamped}%`;
      }

      // 播放时间更新
      audio.addEventListener('timeupdate', () => {
        if (isSeeking) return;
        const dur = audio.duration;
        if (!dur || !isFinite(dur)) return;
        const pct = (audio.currentTime / dur) * 100;
        updateProgressUI(pct);
        timeCurrent.textContent = formatTime(audio.currentTime);
      });

      // 总时长就绪
      audio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audio.duration);
        timeCurrent.textContent = formatTime(0);
        updateProgressUI(0);
      });

      // ---- 缓冲/加载状态 ----
      let isBuffering = false;
      const iconSpinner = btnPlay.querySelector('#icon-spinner') as HTMLElement;
      audio.addEventListener('waiting', () => {
        isBuffering = true;
        iconPlay.classList.add('hidden');
        iconPause.classList.add('hidden');
        iconSpinner.classList.remove('hidden');
        btnPlay.classList.add('loading');
      });
      audio.addEventListener('canplay', () => {
        if (!isBuffering) return;
        isBuffering = false;
        iconSpinner.classList.add('hidden');
        btnPlay.classList.remove('loading');
        setPlayIcon(!audio.paused);
      });

      // 切歌时重置进度条
      const origOnTrackChange = player.onTrackChange;
      player.onTrackChange = (track, index) => {
        origOnTrackChange?.(track, index);
        timeTotal.textContent = '0:00';
        timeCurrent.textContent = '0:00';
        updateProgressUI(0);
      };

      // 点击/拖拽进度条 seek
      function seekFromEvent(e: PointerEvent) {
        const rect = progressBar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateProgressUI(pct * 100);
        timeCurrent.textContent = formatTime(pct * (audio.duration || 0));
        return pct;
      }

      progressBar.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        isSeeking = true;
        progressBar.classList.add('seeking');
        progressBar.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      });

      progressBar.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isSeeking) return;
        seekFromEvent(e);
      });

      progressBar.addEventListener('pointerup', (e: PointerEvent) => {
        if (!isSeeking) return;
        isSeeking = false;
        progressBar.classList.remove('seeking');
        progressBar.releasePointerCapture(e.pointerId);
        const pct = seekFromEvent(e);
        if (audio.duration && isFinite(audio.duration)) {
          audio.currentTime = pct * audio.duration;
        }
      });

      // ---- 音量控制（弹出式竖向滑块） ----
      const volumePopup = iframeDoc.getElementById('volume-popup')!;
      const volumeBar = iframeDoc.getElementById('volume-bar')!;
      const volumeFill = iframeDoc.getElementById('volume-fill')!;
      const volumeThumb = iframeDoc.getElementById('volume-thumb')!;
      const btnVolume = iframeDoc.getElementById('btn-volume')!;
      let lastVolume = 1; // 静音前的音量记忆
      let volumePopupOpen = false;

      // 从 localStorage 恢复音量
      try {
        const savedVol = parentWin.localStorage.getItem(VOL_STORAGE_KEY);
        if (savedVol !== null) {
          const vol = Math.max(0, Math.min(1, parseFloat(savedVol)));
          if (isFinite(vol)) {
            audio.volume = vol;
            lastVolume = vol > 0 ? vol : lastVolume;
          }
        }
      } catch {
        /* ignore */
      }

      /** 持久化音量值 */
      function saveVolume(vol: number) {
        try {
          parentWin.localStorage.setItem(VOL_STORAGE_KEY, String(vol));
        } catch {
          /* ignore */
        }
      }

      /** 更新音量 UI（竖向滑块 + 图标） */
      function updateVolumeUI(vol: number) {
        const pct = Math.max(0, Math.min(100, vol * 100));
        // 竖向：fill 从底部向上（height%），thumb 从顶部往下（top = 100-pct）
        volumeFill.style.height = `${pct}%`;
        volumeThumb.style.top = `${100 - pct}%`;
        const icon = btnVolume.querySelector('i')!;
        if (vol === 0) {
          icon.className = 'fa-solid fa-volume-xmark';
        } else if (vol < 0.5) {
          icon.className = 'fa-solid fa-volume-low';
        } else {
          icon.className = 'fa-solid fa-volume-high';
        }
      }

      // 初始化音量 UI
      updateVolumeUI(audio.volume);

      function toggleVolumePopup() {
        volumePopupOpen = !volumePopupOpen;
        volumePopup.classList.toggle('hidden', !volumePopupOpen);
      }

      function closeVolumePopup() {
        volumePopupOpen = false;
        volumePopup.classList.add('hidden');
      }

      // 点击音量按钮：弹出/关闭滑块 或 静音切换
      btnVolume.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        if (volumePopupOpen) {
          // 弹窗已打开 → 静音切换
          if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
          } else {
            audio.volume = lastVolume || 1;
          }
          updateVolumeUI(audio.volume);
          saveVolume(audio.volume);
        } else {
          // 弹窗关闭 → 打开弹窗
          toggleVolumePopup();
        }
      });

      // 点击面板其他区域关闭音量弹窗
      iframeDoc.addEventListener('click', (e: Event) => {
        if (!volumePopupOpen) return;
        const target = e.target as HTMLElement;
        if (!target.closest('.volume-wrap')) {
          closeVolumePopup();
        }
      });

      // 竖向音量滑块拖拽（从底到顶 = 0→1）
      function volumeFromEvent(e: PointerEvent): number {
        const rect = volumeBar.getBoundingClientRect();
        // 竖向：底部=0，顶部=1
        return Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
      }

      let isVolumeDragging = false;
      volumeBar.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        isVolumeDragging = true;
        volumeBar.setPointerCapture(e.pointerId);
        const vol = volumeFromEvent(e);
        audio.volume = vol;
        updateVolumeUI(vol);
      });
      volumeBar.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isVolumeDragging) return;
        const vol = volumeFromEvent(e);
        audio.volume = vol;
        updateVolumeUI(vol);
      });
      volumeBar.addEventListener('pointerup', (e: PointerEvent) => {
        if (!isVolumeDragging) return;
        isVolumeDragging = false;
        volumeBar.releasePointerCapture(e.pointerId);
        const vol = volumeFromEvent(e);
        audio.volume = vol;
        updateVolumeUI(vol);
        saveVolume(vol);
      });

      // ---- 在线搜索 + 播放列表 ----
      const searchInput = iframeDoc.getElementById('search-input') as HTMLInputElement;
      const btnSearch = iframeDoc.getElementById('btn-search')!;
      const searchResults = iframeDoc.getElementById('search-results')!;
      const playlistItemsEl = iframeDoc.getElementById('playlist-items')!;

      let searchAbort: AbortController | null = null;

      /** HTML 转义 */
      function escapeHtml(str: string): string {
        const d = iframeDoc.createElement('div');
        d.textContent = str;
        return d.innerHTML;
      }

      /** 播放在线列表中指定索引的歌曲 */
      function playOnlineTrack(index: number) {
        if (index < 0 || index >= onlinePlaylist.length) return;
        onlineCurrentIndex = index;
        const track = onlinePlaylist[index];

        // 停止离线播放引擎的内部状态，标记跳过离线 ended 处理
        player.pause();
        player._skipEndedHandler = true;

        // 直接使用同一个 Audio 元素播放在线歌曲
        audio.src = track.url;
        audio.load();
        audio
          .play()
          .then(() => {
            player.onStateChange?.(true);
          })
          .catch(() => {
            showToast(`播放失败: ${track.title}`, 'error');
          });

        // 更新主界面歌曲信息
        songTitle.textContent = track.title;
        songArtist.textContent = `${track.artist} · ${track.source}`;

        // 更新唱片封面
        updateDiscCover(track.cover || '');

        // 更新系统媒体信息
        updateMediaSession(track.title, track.artist, track.cover || undefined);

        renderPlaylist();
        updateFavBtn();
      }

      /** 从在线播放列表中移除指定索引的歌曲 */
      function removeFromPlaylist(index: number) {
        if (index < 0 || index >= onlinePlaylist.length) return;
        onlinePlaylist.splice(index, 1);

        // 更新当前播放索引
        if (onlinePlaylist.length === 0) {
          // 列表清空，停止播放并切回离线
          audio.pause();
          onlineCurrentIndex = -1;
          player._skipEndedHandler = false;
          player.onStateChange?.(false);
          updateFavBtn();
          updateDiscCover('');
          songTitle.textContent = player.currentTrack.title;
          songArtist.textContent = formatOfflineArtist(player.currentTrack);
        } else if (index === onlineCurrentIndex) {
          // 删除的是当前播放的歌，播放下一首（或最后一首）
          if (onlineCurrentIndex >= onlinePlaylist.length) {
            onlineCurrentIndex = onlinePlaylist.length - 1;
          }
          playOnlineTrack(onlineCurrentIndex);
          return; // playOnlineTrack 内部会调用 renderPlaylist
        } else if (index < onlineCurrentIndex) {
          // 删除的在当前播放之前，索引前移
          onlineCurrentIndex--;
        }

        renderPlaylist();
      }

      // ---- 批量选择状态 ----
      const playlistSelectBar = iframeDoc.getElementById('playlist-select-bar')!;
      const playlistSelectAll = iframeDoc.getElementById('playlist-select-all') as HTMLInputElement;
      const playlistBatchDelete = iframeDoc.getElementById('playlist-batch-delete')!;
      const favSelectBar = iframeDoc.getElementById('fav-select-bar')!;
      const favSelectAll = iframeDoc.getElementById('fav-select-all') as HTMLInputElement;
      const favBatchDelete = iframeDoc.getElementById('fav-batch-delete')!;

      /** 更新全选复选框状态（根据子项） */
      function syncSelectAll(container: HTMLElement, selectAllCb: HTMLInputElement) {
        const cbs = container.querySelectorAll<HTMLInputElement>('.playlist-item-checkbox');
        if (cbs.length === 0) {
          selectAllCb.checked = false;
          return;
        }
        const allChecked = Array.from(cbs).every(c => c.checked);
        const someChecked = Array.from(cbs).some(c => c.checked);
        selectAllCb.checked = allChecked;
        selectAllCb.indeterminate = !allChecked && someChecked;
      }

      // 播放列表全选
      playlistSelectAll.addEventListener('change', () => {
        const cbs = playlistItemsEl.querySelectorAll<HTMLInputElement>('.playlist-item-checkbox');
        cbs.forEach(c => {
          c.checked = playlistSelectAll.checked;
        });
      });
      // 播放列表批量删除
      playlistBatchDelete.addEventListener('click', () => {
        const cbs = playlistItemsEl.querySelectorAll<HTMLInputElement>('.playlist-item-checkbox');
        const toRemove: number[] = [];
        cbs.forEach((c, i) => {
          if (c.checked) toRemove.push(i);
        });
        if (toRemove.length === 0) return;
        // 从后往前删，避免索引偏移
        for (let k = toRemove.length - 1; k >= 0; k--) {
          const idx = toRemove[k];
          onlinePlaylist.splice(idx, 1);
          if (idx === onlineCurrentIndex) {
            // 删除当前播放的歌
            onlineCurrentIndex = -1;
          } else if (idx < onlineCurrentIndex) {
            onlineCurrentIndex--;
          }
        }
        if (onlinePlaylist.length === 0 || onlineCurrentIndex === -1) {
          audio.pause();
          onlineCurrentIndex = -1;
          player._skipEndedHandler = false;
          player.onStateChange?.(false);
          updateFavBtn();
          updateDiscCover('');
          songTitle.textContent = player.currentTrack.title;
          songArtist.textContent = formatOfflineArtist(player.currentTrack);
        }
        playlistSelectAll.checked = false;
        renderPlaylist();
      });

      // 收藏列表全选
      favSelectAll.addEventListener('change', () => {
        const container = iframeDoc.getElementById('fav-items')!;
        const cbs = container.querySelectorAll<HTMLInputElement>('.playlist-item-checkbox');
        cbs.forEach(c => {
          c.checked = favSelectAll.checked;
        });
      });
      // 收藏列表批量删除
      favBatchDelete.addEventListener('click', () => {
        const container = iframeDoc.getElementById('fav-items')!;
        const cbs = container.querySelectorAll<HTMLInputElement>('.playlist-item-checkbox');
        const toRemove: number[] = [];
        cbs.forEach((c, i) => {
          if (c.checked) toRemove.push(i);
        });
        if (toRemove.length === 0) return;
        for (let k = toRemove.length - 1; k >= 0; k--) {
          favorites.splice(toRemove[k], 1);
        }
        saveFavorites();
        updateFavBtn();
        favSelectAll.checked = false;
        renderFavList();
      });

      /** 整个列表项可拖拽排序（5px 阈值区分点击与拖拽） */
      function setupPointerDragReorder(
        itemEl: HTMLElement,
        container: HTMLElement,
        srcIndex: number,
        onReorder: (from: number, to: number) => void,
      ) {
        let pressed = false;
        let dragging = false;
        let startY = 0;
        let suppressClick = false;

        itemEl.addEventListener('pointerdown', (e: PointerEvent) => {
          // 不拦截复选框和删除按钮的 pointerdown
          const target = e.target as HTMLElement;
          if (target.closest('.playlist-item-checkbox') || target.closest('.playlist-item-remove')) return;
          if (e.button !== 0) return;
          e.preventDefault(); // 阻止文本选择（"复制"效果）
          pressed = true;
          dragging = false;
          startY = e.clientY;
          itemEl.setPointerCapture(e.pointerId);
        });

        itemEl.addEventListener('pointermove', (e: PointerEvent) => {
          if (!pressed) return;
          if (!dragging) {
            if (Math.abs(e.clientY - startY) < 5) return;
            dragging = true;
            suppressClick = true;
            itemEl.classList.add('dragging');
          }
          const items = container.querySelectorAll<HTMLElement>('.playlist-item');
          items.forEach(it => it.classList.remove('drag-over'));
          for (const it of items) {
            const rect = it.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
              if (it !== itemEl) it.classList.add('drag-over');
              break;
            }
          }
        });

        itemEl.addEventListener('pointerup', (e: PointerEvent) => {
          if (!pressed) return;
          pressed = false;
          itemEl.releasePointerCapture(e.pointerId);
          itemEl.classList.remove('dragging');

          const items = container.querySelectorAll<HTMLElement>('.playlist-item');
          items.forEach(it => it.classList.remove('drag-over'));

          if (!dragging) return;

          dragging = false;
          let dropIndex = -1;
          for (let k = 0; k < items.length; k++) {
            const rect = items[k].getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
              dropIndex = k;
              break;
            }
          }
          if (dropIndex >= 0 && dropIndex !== srcIndex) {
            onReorder(srcIndex, dropIndex);
          }
        });

        itemEl.addEventListener('pointercancel', () => {
          if (!pressed) return;
          pressed = false;
          dragging = false;
          itemEl.classList.remove('dragging');
          const items = container.querySelectorAll<HTMLElement>('.playlist-item');
          items.forEach(it => it.classList.remove('drag-over'));
        });

        // 拖拽结束后拦截紧随的 click，防止触发播放
        itemEl.addEventListener(
          'click',
          (e: MouseEvent) => {
            if (suppressClick) {
              suppressClick = false;
              e.stopImmediatePropagation();
            }
          },
          true,
        ); // capture 阶段拦截
      }

      /** 渲染在线歌曲列表页（含拖拽排序 + 删除按钮 + 复选框） */
      function renderPlaylist() {
        // 显隐批量选择栏
        playlistSelectBar.classList.toggle('hidden', onlinePlaylist.length === 0);
        playlistSelectAll.checked = false;

        if (onlinePlaylist.length === 0) {
          playlistItemsEl.innerHTML = '<div class="playlist-placeholder">暂无歌曲</div>';
          return;
        }
        playlistItemsEl.innerHTML = '';

        onlinePlaylist.forEach((r, i) => {
          const el = iframeDoc.createElement('div');
          el.className = `playlist-item${i === onlineCurrentIndex ? ' active' : ''}`;
          el.dataset.index = String(i);

          // 复选框
          const cb = iframeDoc.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'playlist-item-checkbox';
          cb.addEventListener('click', e => e.stopPropagation());
          cb.addEventListener('change', () => syncSelectAll(playlistItemsEl, playlistSelectAll));
          el.appendChild(cb);

          const indexSpan = iframeDoc.createElement('span');
          indexSpan.className = 'playlist-item-index';
          indexSpan.textContent = String(i + 1);
          el.appendChild(indexSpan);

          const infoDiv = iframeDoc.createElement('div');
          infoDiv.className = 'playlist-item-info';
          infoDiv.innerHTML = `
            <div class="playlist-item-title">${escapeHtml(r.title)}</div>
            <div class="playlist-item-artist">${escapeHtml(r.artist)} · ${r.source}</div>
          `;
          el.appendChild(infoDiv);

          // 删除按钮
          const removeBtn = iframeDoc.createElement('button');
          removeBtn.className = 'playlist-item-remove';
          removeBtn.title = '移除';
          removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
          removeBtn.addEventListener('click', e => {
            e.stopPropagation();
            removeFromPlaylist(i);
          });
          el.appendChild(removeBtn);

          // 点击播放（排除删除按钮和复选框）
          el.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            if (target.closest('.playlist-item-remove') || target.closest('.playlist-item-checkbox')) return;
            playOnlineTrack(i);
          });

          // ---- 整行拖拽排序（Pointer 事件，5px 阈值区分点击与拖拽） ----
          setupPointerDragReorder(el, playlistItemsEl, i, (from, to) => {
            const [moved] = onlinePlaylist.splice(from, 1);
            onlinePlaylist.splice(to, 0, moved);
            // 更新当前播放索引
            if (onlineCurrentIndex === from) {
              onlineCurrentIndex = to;
            } else if (from < onlineCurrentIndex && to >= onlineCurrentIndex) {
              onlineCurrentIndex--;
            } else if (from > onlineCurrentIndex && to <= onlineCurrentIndex) {
              onlineCurrentIndex++;
            }
            renderPlaylist();
          });

          playlistItemsEl.appendChild(el);
        });
      }

      /** 渲染离线曲库列表页 */
      function renderOfflinePlaylist() {
        playlistItemsEl.innerHTML = '';
        OFFLINE_TRACKS.forEach((t, i) => {
          const el = iframeDoc.createElement('div');
          const isActive = onlineCurrentIndex < 0 && i === player.currentIndex;
          el.className = `playlist-item${isActive ? ' active' : ''}`;
          el.innerHTML = `
            <span class="playlist-item-index" style="cursor:default">${i + 1}</span>
            <div class="playlist-item-info">
              <div class="playlist-item-title">${escapeHtml(t.title)}</div>
              <div class="playlist-item-artist">${escapeHtml(t.artist ? `${t.artist} · ${t.stage}` : t.stage)}</div>
            </div>
          `;
          el.addEventListener('click', () => {
            resumeOfflineMode();
            player.pause();
            player.loadTrack(i);
            player.play();
            renderOfflinePlaylist();
          });
          playlistItemsEl.appendChild(el);
        });
      }

      /** 将搜索结果加入播放列表并播放 */
      function addToPlaylistAndPlay(result: SearchResult) {
        const existing = onlinePlaylist.findIndex(r => r.url === result.url);
        if (existing !== -1) {
          playOnlineTrack(existing);
        } else {
          onlinePlaylist.push(result);
          playOnlineTrack(onlinePlaylist.length - 1);
        }
        // 关闭搜索页，回到主界面
        searchPage.classList.add('hidden');
      }

      // ---- 收藏功能（localStorage 持久化） ----
      let favorites: FavoriteItem[] = [];

      /** 从 localStorage 加载收藏列表 */
      function loadFavorites() {
        try {
          const raw = parentWin.localStorage.getItem(FAV_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              favorites = parsed
                .filter(
                  (f: any) =>
                    f && typeof f.title === 'string' && typeof f.artist === 'string' && typeof f.source === 'string',
                )
                .map((f: any) => ({ title: f.title, artist: f.artist, source: f.source }));
            }
          }
        } catch {
          console.warn('[alice-music-float] 收藏数据解析失败');
          showToast('收藏数据读取失败', 'error');
          favorites = [];
        }
      }

      /** 保存收藏列表到 localStorage */
      function saveFavorites() {
        try {
          parentWin.localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favorites));
        } catch {
          showToast('收藏保存失败（存储已满？）', 'error');
        }
      }

      /** 判断当前播放歌曲是否已收藏（按 title+artist+source 匹配） */
      function isCurrentFavorited(): boolean {
        if (onlineCurrentIndex < 0 || onlinePlaylist.length === 0) return false;
        const cur = onlinePlaylist[onlineCurrentIndex];
        return favorites.some(f => f.title === cur.title && f.artist === cur.artist && f.source === cur.source);
      }

      /** 更新主界面爱心按钮状态 */
      function updateFavBtn() {
        const btnFav = iframeDoc.getElementById('btn-fav')!;
        const heartEmpty = iframeDoc.getElementById('icon-heart-empty')!;
        const heartFilled = iframeDoc.getElementById('icon-heart-filled')!;
        if (onlineCurrentIndex >= 0 && isCurrentFavorited()) {
          heartEmpty.classList.add('hidden');
          heartFilled.classList.remove('hidden');
          btnFav.classList.add('fav-active');
        } else {
          heartEmpty.classList.remove('hidden');
          heartFilled.classList.add('hidden');
          btnFav.classList.remove('fav-active');
        }
        syncMlFavIcon();
      }

      // 初始化收藏列表
      loadFavorites();

      // 主界面爱心按钮点击 → 切换收藏
      const btnFav = iframeDoc.getElementById('btn-fav')!;
      btnFav.addEventListener('click', () => {
        if (onlineCurrentIndex < 0 || onlinePlaylist.length === 0) return; // 离线模式或无歌曲时不响应
        const cur = onlinePlaylist[onlineCurrentIndex];
        const idx = favorites.findIndex(
          f => f.title === cur.title && f.artist === cur.artist && f.source === cur.source,
        );
        if (idx !== -1) {
          favorites.splice(idx, 1); // 取消收藏
        } else {
          favorites.push({ title: cur.title, artist: cur.artist, source: cur.source }); // 添加收藏（仅元数据）
        }
        saveFavorites();
        updateFavBtn();
      });

      /** 从收藏元数据重新获取播放链接并播放 */
      async function resolveAndPlayFavorite(fav: FavoriteItem) {
        const platform = fav.source === '网易云' ? 'netease' : 'tencent';
        const keyword = `${fav.title} ${fav.artist}`;
        showToast('正在获取播放链接...', 'info');

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000); // 15 秒超时
        try {
          const results = await searchPlatform(platform, keyword, 3, 1, ctrl.signal);
          clearTimeout(timer);
          if (results.length > 0) {
            addToPlaylistAndPlay(results[0]);
          } else {
            showToast('链接获取失败，请手动搜索', 'error');
          }
        } catch {
          clearTimeout(timer);
          showToast('链接获取失败，请手动搜索', 'error');
        }
      }

      /** 渲染收藏列表页 */
      function renderFavList() {
        const container = iframeDoc.getElementById('fav-items')!;
        // 显隐批量选择栏
        favSelectBar.classList.toggle('hidden', favorites.length === 0);
        favSelectAll.checked = false;

        if (favorites.length === 0) {
          container.innerHTML = '<div class="playlist-placeholder">暂无收藏</div>';
          return;
        }
        container.innerHTML = '';

        favorites.forEach((r, i) => {
          const el = iframeDoc.createElement('div');
          el.className = 'playlist-item';
          el.dataset.index = String(i);

          // 复选框
          const cb = iframeDoc.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'playlist-item-checkbox';
          cb.addEventListener('click', e => e.stopPropagation());
          cb.addEventListener('change', () => syncSelectAll(container, favSelectAll));
          el.appendChild(cb);

          const indexSpan = iframeDoc.createElement('span');
          indexSpan.className = 'playlist-item-index';
          indexSpan.textContent = String(i + 1);
          el.appendChild(indexSpan);

          const infoDiv = iframeDoc.createElement('div');
          infoDiv.className = 'playlist-item-info';
          infoDiv.innerHTML = `
            <div class="playlist-item-title">${escapeHtml(r.title)}</div>
            <div class="playlist-item-artist">${escapeHtml(r.artist)} · ${r.source}</div>
          `;
          el.appendChild(infoDiv);

          // 取消收藏按钮
          const removeBtn = iframeDoc.createElement('button');
          removeBtn.className = 'playlist-item-remove';
          removeBtn.title = '取消收藏';
          removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
          removeBtn.addEventListener('click', e => {
            e.stopPropagation();
            favorites.splice(i, 1);
            saveFavorites();
            updateFavBtn();
            renderFavList();
          });
          el.appendChild(removeBtn);

          // 点击播放（排除取消收藏按钮和复选框） — 重新获取 URL
          el.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            if (target.closest('.playlist-item-remove') || target.closest('.playlist-item-checkbox')) return;
            favPage.classList.add('hidden');
            resolveAndPlayFavorite(r);
          });

          // ---- 整行拖拽排序（Pointer 事件，5px 阈值区分点击与拖拽） ----
          setupPointerDragReorder(el, container, i, (from, to) => {
            const [moved] = favorites.splice(from, 1);
            favorites.splice(to, 0, moved);
            saveFavorites();
            renderFavList();
          });

          container.appendChild(el);
        });
      }

      /** 渲染搜索结果列表 */
      function renderSearchResults(results: SearchResult[]) {
        if (results.length === 0) {
          searchResults.innerHTML = '<div class="search-placeholder">未找到可播放的歌曲，换个关键词试试</div>';
          return;
        }
        searchResults.innerHTML = '';
        results.forEach(r => {
          const el = iframeDoc.createElement('div');
          el.className = 'search-result-item';
          el.innerHTML = `
            <div class="result-info">
              <div class="result-title">${escapeHtml(r.title)}</div>
              <div class="result-artist">${escapeHtml(r.artist)}</div>
            </div>
            <span class="result-source">${r.source}</span>
          `;
          el.addEventListener('click', () => addToPlaylistAndPlay(r));
          searchResults.appendChild(el);
        });
      }

      /** 执行搜索 */
      async function doSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) return;

        // 取消上次未完成的搜索
        if (searchAbort) {
          searchAbort.abort();
        }
        searchAbort = new AbortController();
        const signal = searchAbort.signal;
        // 30 秒总超时（两平台搜索合计）
        const searchTimeout = setTimeout(() => searchAbort?.abort(), 30000);

        console.info(`[alice-music-float] 搜索关键词: ${keyword}`);
        searchResults.innerHTML = '<div class="search-loading">搜索中...</div>';

        const allResults: SearchResult[] = [];

        try {
          // 两个平台并行搜索（各自内部也并行校验），大幅缩短总耗时
          const [neteaseResults, tencentResults] = await Promise.all([
            searchPlatform('netease', keyword, 5, 3, signal),
            searchPlatform('tencent', keyword, 5, 3, signal),
          ]);
          allResults.push(...neteaseResults, ...tencentResults);

          if (!signal.aborted) {
            if (allResults.length > 0) {
              renderSearchResults(allResults);
            } else {
              searchResults.innerHTML = '<div class="search-placeholder">未找到可播放的歌曲，换个关键词试试</div>';
            }
          }
          clearTimeout(searchTimeout);
        } catch (err: any) {
          clearTimeout(searchTimeout);
          if (err?.name === 'AbortError') return;
          console.warn('[alice-music-float] 搜索出错:', err);
          if (!signal.aborted) {
            searchResults.innerHTML = '<div class="search-placeholder">搜索出错，请重试</div>';
          }
        }
      }

      btnSearch.addEventListener('click', () => doSearch());
      searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearch();
        }
      });

      // 在线播放结束自动切下一首（受 repeatMode 控制）
      audio.addEventListener('ended', () => {
        if (onlineCurrentIndex < 0 || onlinePlaylist.length === 0) return;
        if (repeatMode === 'repeat-one') {
          // 单曲循环：重新播放当前歌曲
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return;
        }
        if (repeatMode === 'sequential') {
          // 顺序播放：到末尾停止
          const nextIdx = onlineCurrentIndex + 1;
          if (nextIdx < onlinePlaylist.length) {
            playOnlineTrack(nextIdx);
          } else {
            // 顺序播放结束：停止并恢复离线曲目信息
            player.onStateChange?.(false);
            onlineCurrentIndex = -1;
            player._skipEndedHandler = false;
            updateFavBtn();
            updateDiscCover('');
            songTitle.textContent = player.currentTrack.title;
            songArtist.textContent = formatOfflineArtist(player.currentTrack);
          }
          return;
        }
        // repeat-all：列表循环
        const nextIdx = (onlineCurrentIndex + 1) % onlinePlaylist.length;
        playOnlineTrack(nextIdx);
      });

      // ---- MediaSession API（系统级媒体控制） ----
      function updateMediaSession(title: string, artist: string, coverUrl?: string) {
        if (!('mediaSession' in navigator)) return;
        const artwork: MediaImage[] = coverUrl ? [{ src: coverUrl, sizes: '256x256', type: 'image/jpeg' }] : [];
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist, artwork });
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => btnPlay.click());
        navigator.mediaSession.setActionHandler('pause', () => btnPlay.click());
        navigator.mediaSession.setActionHandler('previoustrack', () => btnPrev.click());
        navigator.mediaSession.setActionHandler('nexttrack', () => btnNext.click());
      }

      // ---- 窗口 resize 钳制 ----
      function onResize() {
        [posX, posY] = clampPos(posX, posY);
        updateIframeGeometry();
      }
      onResizeRef = onResize;
      parentWin.addEventListener('resize', onResize);

      console.info('[alice-music-float] 悬浮球已加载（v4.1 setPointerCapture 全程方案）');
    });

  // ---- MVU 变量监测：监听 世界.当前剧情阶段 变化并自动切歌 ----
  let mvuEventStop: EventOnReturn | null = null;
  (async () => {
    try {
      await waitGlobalInitialized('Mvu');
      mvuEventStop = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (newVars, oldVars) => {
        if (!playerRef) return;
        const newStage = _.get(newVars, 'stat_data.世界.当前剧情阶段') as string | undefined;
        const oldStage = _.get(oldVars, 'stat_data.世界.当前剧情阶段') as string | undefined;
        if (newStage && VALID_STAGES.includes(newStage) && newStage !== oldStage) {
          console.info(`[alice-music-float] 剧情阶段变化: ${oldStage} → ${newStage}，自动切歌`);
          playerRef.playByStage(newStage as StageKey);
        }
      });
      console.info('[alice-music-float] MVU 变量监测已启动');

      // 初始加载：读取当前阶段并自动播放对应离线音乐
      if (playerRef) {
        const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        const currentStage = _.get(mvuData, 'stat_data.世界.当前剧情阶段') as string | undefined;
        if (currentStage && VALID_STAGES.includes(currentStage)) {
          console.info(`[alice-music-float] 初始加载：当前阶段=${currentStage}，自动播放`);
          playerRef.playByStage(currentStage as StageKey);
        }
      }
    } catch (err) {
      console.warn('[alice-music-float] MVU 初始化失败，自动切歌不可用:', err);
    }
  })();

  // 卸载时清理
  $(window).on('pagehide', () => {
    mvuEventStop?.stop();
    playerRef?.destroy();
    if (onResizeRef) parentWin.removeEventListener('resize', onResizeRef);
    $iframe.remove();
  });
});
