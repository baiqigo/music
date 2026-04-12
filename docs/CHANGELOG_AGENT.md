# CHANGELOG_AGENT

## 2026-04-13T02:30:00+08:00

### 移动端适配：樱花粉移除 + Firefox 转场动画修复 + 快速点击分屏修复 + GPU 合成优化

- **删除樱花粉主题入口**：
  - `THEMES` 从 `['默认', '月光白', '樱花粉']` 改为 `['默认', '月光白']`。
  - 删除 `.float-panel.theme-sakura` CSS 占位规则。
  - 删除 `applyTheme` 中 `theme-sakura` class 添加逻辑。
  - 旧 localStorage `'樱花粉'` 值自动回退默认（`indexOf` 返回 -1，不执行恢复）。
- **修复快速点击分屏 bug（P0/移动端）**：
  - `themeSwitching` 标志位原本声明为 `false` 但**从未设为 `true`**，完全不起作用。
  - 月光白转场动画路径：`themeSwitching = true`，`onComplete` 回调中 `= false`。
  - 非动画切换路径（月光白→默认）：`themeSwitching = true`，`setTimeout(350ms)` 后 `= false`。
  - `themeToggle.click` 入口 `if (themeSwitching || moonTransitionRunning) return` 双重拦截。
- **修复 Firefox 移动端转场动画不触发/卡死（P0）**：
  - **根因**：Firefox 移动端 srcdoc iframe 中 `performance.now()` 受 Fingerprinting
    Protection 影响，精度降至 ~100ms（返回值以 100ms 为步长取整），导致连续 rAF 帧间 `elapsed` 增量为 0， `rawT`
    始终不变 → 动画视觉上静止不动。
  - **修复**：时间源从 `performance.now()` 改为 `Date.now()`（不受 FPP 影响，1ms 精度）。
- **GPU 合成优化（Firefox 移动端性能）**：
  - 月亮和星星定位从 `style.left/top`（触发 layout reflow）改为 `style.transform = translate()`（GPU 合成层）。
  - `.moon-wrapper` 和 `.transit-star` 添加 `will-change: transform, opacity`。
  - `.moon-transition-overlay` 添加 `will-change: contents`。
  - 预计算 `diag`（对角线长度）和 `sqrt2`，避免每帧 `Math.sqrt()` 调用。
- **淡出动画兼容修复**：
  - `@keyframes moon-fade-out`：从 `transform: scale(1.15)` 改为 `filter: blur(2px)` + `opacity: 0`，避免 CSS
    animation 的 `transform` 覆盖 JS 设置的 `translate()` 定位导致月亮跳回 (0,0)。
  - `@keyframes star-twinkle-out`：同理，从 `transform: scale()` 改为 `filter: brightness() blur()`。
- **发布路径更新**：import 地址从 `http://127.0.0.1:5500/dist/...` 更新为
  `https://testingcf.jsdelivr.net/gh/baiqigo/music@main/index.js`。
- **代码备份**：`backup_20260413_0230/`（源码 index.ts + 构建产物 index.js）。
- **改动范围**：仅 `src/alice-music-float/index.ts`（CSS 5 行修改，JS ~60 行重写/修复）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-12T00:08:00+08:00

### 月光白搜索页/列表页配色修复 + 收藏按钮修复 + 搜索并行加速

- **月光白搜索页配色修复**（CSS 新增 8 条规则）：
  - `.search-icon`：白色 → `rgba(60,60,70,0.5)` 深灰。
  - `.search-btn` / `.search-btn:hover`：白色 → 深灰。
  - `.search-placeholder`：白色 → `rgba(80,80,90,0.45)`。
  - `.search-loading`（"搜索中..."）：白色 → `rgba(80,80,90,0.5)`。
  - `.result-title`：白色 → `rgba(40,40,50,0.9)`。
  - `.result-artist`：白色 → `rgba(80,80,90,0.55)`。
  - `.search-result-item:hover`：白色高亮 → `rgba(0,0,0,0.05)`。
  - `.search-results::-webkit-scrollbar-thumb`：白色 → `rgba(0,0,0,0.12)`。
- **月光白歌曲列表配色修复**（CSS 新增 4 条规则）：
  - `.playlist-item-index`：白色序号 → `rgba(60,60,70,0.5)` 深灰。
  - `.playlist-item-index:hover`：加深 + 浅灰背景。
  - `.playlist-item-remove`：深灰。
  - `.playlist-item-checkbox`：accent-color 紫色。
- **月光白卡片收藏按钮修复**：
  - `#ml-btn-heart` 从单个空心 SVG 改为双 SVG 互斥方案（`#ml-icon-heart-empty` / `#ml-icon-heart-filled`），用 `<div>`
    容器包裹。
  - 新增 `syncMlFavIcon()` 函数：检查默认主题 `btn-fav` 的 `fav-active` 类，同步月光白卡片心形图标（空心/实心红色）。
  - `updateFavBtn()` 末尾新增 `syncMlFavIcon()` 调用，确保每次收藏状态变化都同步。
  - `enterMoonlightLayout()` 初始化时调用 `syncMlFavIcon()`。
- **搜索速度优化**：
  - `searchPlatform()` 内部：5 首候选歌曲的 URL 获取 + 音频可用性校验从**顺序执行**改为 `Promise.allSettled`
    **全部并行**，取前 `maxValid` 条可用结果。
  - `doSearch()` 双平台搜索：从顺序（先网易云→再 QQ 音乐）改为 `Promise.all`
    **两平台并行**，移除中间态"继续搜索QQ音乐..."提示。
  - 预计搜索总耗时从 ~10 秒降至 ~3-5 秒（取决于 API 响应和音频校验速度）。
- **改动范围**：仅 `src/alice-music-float/index.ts`（CSS +22 行，HTML +6 行，JS +25 行 -12 行）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-11T13:55:00+08:00

### 月光白转场动画 + 设置页月光白配色 + 月亮不超出界面

- **月光白转场动画（流星坠落式）**：
  - 点击切换到月光白时触发 1.8 秒转场动画。
  - 月亮（单层弯月 `moon-body` + 陨石坑 + `moon-trail` 流星拖尾）从左上角对角线滑到右下角内侧。
  - 6-8 颗四角星（用户提供的 `clip-path` + `star-trail` 拖尾）跟随月亮轨迹散布，各自独立延迟产生拖尾效果。
  - 白色遮罩层（`moon-wash-layer`）使用 `linear-gradient(135deg)` + `mask-image`
    对角线渐变，随月亮推进从左上到右下逐渐"刷白"面板。
  - 全程 rAF 驱动（非 CSS keyframes），弹性缓动曲线（快冲+轻微回弹）。
  - 月亮滑过 85% 时切换主题样式，动画结束后月亮/星星淡出（CSS `moon-fade-out` /
    `star-twinkle-out`）、遮罩淡出、700ms 后清理 DOM。
  - `moonTransitionRunning` 防止重复触发。
  - `skipMoonTransition` 标志位：localStorage 恢复月光白时跳过动画。
- **月亮不超出界面**：
  - 终点从 `panelW + 30, panelH + 30`（滑出界面外）改为 `panelW - moonSize - 15, panelH - moonSize - 15`（右下角内侧）。
- **设置页/叠加页月光白配色**：
  - `.float-panel.theme-moonlight .overlay-page`：背景从深蓝渐变改为浅灰白渐变。
  - `.overlay-title` / `.icon-btn`：深色文字。
  - `.setting-item`：浅灰背景 + 深色文字。
  - `.setting-value` / `.mode-toggle`：适配暗色文字。
  - `.playlist-item` / `.playlist-item-title` / `.playlist-item-artist`：深色文字 + 浅色 hover/active。
  - `.search-box` / `.search-input`：浅灰背景 + 深色输入文字。
  - `.select-all-wrap` / `.batch-delete-btn`：适配配色。
- **改动范围**：仅 `src/alice-music-float/index.ts`（CSS ~60 行新增，JS ~5 行修改）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-11T11:35:00+08:00

### 收藏按钮 SVG 替换（两个爱心按钮）

- **顶部栏收藏列表入口按钮**（`btn-fav-list`）：Font Awesome `<i class="fa-regular fa-heart">`
  替换为用户提供的 Uiverse.io SVG 爱心路径（`viewBox="0 0 17.503 15.625"`，空心描边爱心，`fill="currentColor"`
  继承按钮颜色）。
- **控制栏收藏按钮**（`btn-fav`）：Font Awesome `<i>` 替换为双 SVG 互斥显示方案：
  - `#icon-heart-empty`：空心爱心（未收藏态），使用用户提供的完整 path（含外框+内缩线条）。
  - `#icon-heart-filled`：实心爱心（已收藏态），仅保留外框 path（无内缩线条，形成实心填充效果）。
  - 通过 `hidden` CSS 类互斥切换，与播放/暂停按钮方案一致。
- **CSS 新增**：
  - `.heart-svg-icon`：`width: 16px; height: 16px; fill: currentColor; display: block; transition: transform 0.2s`。
  - `.ctrl-side-btn.fav-active .heart-svg-icon`：`color: #f87171`（红色）。
  - `.ctrl-side-btn.fav-active .heart-svg-icon:not(.hidden)`：`filter: drop-shadow(0 0 4px rgba(248,113,113,0.5))`（红色发光）。
- **JS `updateFavBtn()` 重写**：从 `icon.className = 'fa-solid/fa-regular fa-heart'` 改为操作 `heartEmpty`/`heartFilled`
  两个 SVG 的 `hidden` 类。
- **旧 CSS `.ctrl-side-btn.fav-active i` 已删除**，替换为 `.ctrl-side-btn.fav-active .heart-svg-icon`。
- **配色适配**：SVG 使用 `fill="currentColor"` 自动继承各主题的 `.icon-btn` 颜色，无需额外主题 CSS。
- **改动范围**：仅 `src/alice-music-float/index.ts`（HTML 2 处替换 + CSS +10 行 -2 行 + JS 8 行重写）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **chrome-devtools 浏览器端验证通过**（4 项）：
  1. `btn-fav-list` SVG 存在，16x16px，viewBox 正确，path 存在，无旧 `<i>`。**通过。**
  2. `btn-fav` 双 SVG 存在：`icon-heart-empty` 显示 + `icon-heart-filled` hidden，无旧 `<i>`。**通过。**
  3. SVG fill 颜色为 `rgba(255, 255, 255, 0.55)`（继承 `currentColor`）。**通过。**
  4. transition `transform 0.2s` 生效。**通过。**

## 2026-04-11T03:45:00+08:00

### 面板边角圆润化 + 月光白虚影修复 + 搜索框美化

- **面板边角圆润化**：`.float-panel` 的 `border-radius` 从 `16px` 改为 `30px`，`box-shadow` 改为双向新拟态阴影
  `15px 15px 30px rgba(0,0,0,0.5), -15px -15px 30px rgba(50,60,90,0.3)`，背景色保持原深色渐变不变。
- **月光白边角虚影修复**：
  - `.card` 的 `border-radius` 从 `16px` 同步为 `30px`，`box-shadow` 从 `inset 0 0 10px rgba(255,255,255,0.5)` 改为
    `none`（去除白色内阴影光晕）。
  - `.card .one` 的 `border-radius` 从 `16px` 同步为 `30px`，`border` 从 `1px solid rgba(255,255,255,0.5)` 改为
    `none`（去除白色半透明边框虚影）。
- **搜索框美化**：从矩形 8px 圆角改为 Uiverse.io 风格新拟态搜索框：
  - 30px 大圆角胶囊形，`position: relative` + `::before` 伪元素底部动画线。
  - 聚焦时底部蓝紫色线从中心展开（`scaleX(0) → scale(1)`），圆角过渡为直角（`border-radius: 1px`）。
  - 搜索按钮默认隐藏（`opacity:0`），仅在有输入内容时显示（`:not(:placeholder-shown) ~ .search-btn`）。
  - CSS 变量：`--timing: 0.3s`、`--border-color: #667eea`（蓝紫色，匹配主题）、`--input-bg: rgba(255,255,255,0.1)`。
- **改动范围**：仅 `src/alice-music-float/index.ts`（CSS 样式修改，无 JS/HTML 结构变动）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-11T02:40:00+08:00

### 月光白主题美化

- **卡片容器重构**：将 `.ml-card` 改为 `.card` 及其子元素的类名映射（如 `.ml-one` 改为 `.one`、`.ml-music` 改为
  `.music`）。
- **去除非必要动效**：根据要求去除了原设计中的青色、紫色球的发光动画，保留卡片本身的高级发光感。
- **保留设置按钮**：依旧保留了现有的自定义SVG设置按钮以备后续主题切换功能的使用。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部编译通过。

### 月光白主题设置按钮修复 + UI 美化前代码备份

- **Bug 修复：月光白主题隐藏 overlay-page**：
  - 月光白 CSS 规则 `.float-panel.theme-moonlight .overlay-page, .toast-container { display: none !important }`
    导致设置页/播放列表/搜索页/toast 在月光白主题下完全不可用。
  - 修复：仅隐藏 `.panel-header` 和 `.panel-body`，保留 overlay-page 和 toast-container 可见。
  - 新增 `.float-panel.theme-moonlight .overlay-page { z-index: 20 }` 确保叠加页显示在 ml-card（z-index: 10）之上。
- **月光白设置按钮移到左上角**：
  - 设置齿轮 SVG 从底部栏 `ml-bar-bottom` 移到新增的 `ml-header` 区域（`padding: 8px 10px 0`，左对齐）。
  - 新增 `.ml-header` / `.ml-header-icon` CSS（cursor:pointer, hover 变深色）。
  - 底部栏 `ml-bar-bottom` 仅剩 shuffle/playlist/heart 三个按钮。
- **localStorage 主题重置**：清除 `alice-music-theme`，用户打开后显示默认主题界面。
- **代码备份**：完整源码备份至 `backup_20260411_0205/index.ts`，供 UI 美化期间回滚参考。
- **改动范围**：仅 `src/alice-music-float/index.ts`（CSS ~15 行修改，HTML ~15 行调整）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-10T23:15:00+08:00

### 唱片图标移除 + 离线不自动切歌 + 主题切换占位

- **移除唱片中间 `.disc-icon`**：
  - 删除 HTML `<i class="fa-regular fa-music disc-icon"></i>`（离线模式下 FA 加载失败显示方块X）。
  - 删除 CSS `.disc-icon` 样式块。
  - 删除 JS `discIcon` 变量及 `updateDiscCover` 中的 `discIcon.style.display` 操作。
  - 在线模式封面图（`<img id="disc-cover">`）不受影响。
- **离线模式播放结束不自动切歌**：
  - `player.onEnded` 回调从 `repeatMode` 三态控制改为始终返回 `true`（阻止默认 `next()`）。
  - 离线歌曲播放完后停止，仅手动点击上/下一首或 MVU 阶段变化触发切歌。
  - 在线模式 `ended` 逻辑不受影响（仍受 `repeatMode` 控制）。
- **设置页主题切换**：
  - HTML：`主题` 行的静态文本改为 `#theme-toggle`（`.mode-toggle` 类，可点击）。
  - CSS：新增 `.float-panel.theme-moonlight` / `.float-panel.theme-sakura` 占位规则。
  - JS：三选项数组 `['默认', '月光白', '樱花粉']`，点击循环切换，`applyTheme()` 添加/移除对应 CSS 类到 `#float-panel`。
  - `localStorage`（key: `alice-music-theme`）持久化，刷新后恢复上次主题。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **chrome-devtools 浏览器端验证通过（5 项）**：
  - `.disc-icon` 不存在，唱片区干净。
  - 主题三态循环正确：默认→月光白（`theme-moonlight`）→樱花粉（`theme-sakura`）→默认。
  - localStorage `alice-music-theme` 持久化正确。
  - 控制台无播放器相关错误。

## 2026-04-10T22:20:00+08:00

### 离线歌曲数据填充 + 设置图标替换 + 歌曲信息显示优化

- **四阶段离线歌曲 URL 和元数据全部填入**：
  - 初识期：17 (椎名林檎) → `17.flac`
  - 软化期：春风吹 (方大同) → `cunfc.flac`
  - 失去期：I Really Want to Stay at Your House → `sbpk.mp3`
  - 热恋期：打上花火 (DAOKO × 米津玄师) → `biaobai.mp3`
  - `OFFLINE_TRACKS` 的 `title` 从阶段名改为实际歌名，`artist` 从 `'离线曲库'` 改为实际歌手名。
- **设置按钮 SVG 替换**：从旧版自定义 SVG（viewBox `0 0 24 24`）替换为 FA v7 官方 gear SVG（viewBox
  `0 0 640 640`），与悬浮球/上一首/下一首图标风格统一。
- **离线播放歌曲信息显示格式统一**：
  - 新增 `formatOfflineArtist(track)` 辅助函数：有歌手时返回 `歌手 · 阶段名`，无歌手时返回 `阶段名`。
  - `onTrackChange` 回调：`songArtist` 从 `track.stage` 改为 `formatOfflineArtist(track)`。
  - 5 处恢复离线信息的代码（`removeFromPlaylist` 清空、批量删除重置、sequential 末尾停止等）均同步更新。
  - `renderOfflinePlaylist()` 列表项 artist 行从 `t.stage` 改为 `t.artist ? artist · stage : stage`。
  - `updateMediaSession` 调用同步使用 `formatOfflineArtist`。
- **改动范围**：`src/alice-music-float/index.ts`（数据+显示逻辑）、`docs/DECISIONS.md`（映射+新决策）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **浏览器脚本验证通过**：设置按钮 SVG
  viewBox=`0 0 640 640`，歌曲标题=`春风吹`，副标题=`方大同 · 失去期`，离线列表 4 首歌正确显示歌名+歌手·阶段名。

## 2026-04-10T19:17:00+08:00

### UI 美化批次二修正：音量按钮位置 + 控制栏对称 + 去掉唱片中心孔

- **音量按钮位置调整**：从 `.controls` 控制栏移到进度条左侧时间上方。新增 `.progress-volume-area`
  容器（flex，align-items: flex-end），包裹 `.volume-wrap`（音量按钮 + 弹窗）和
  `.progress-area`（进度条）。音量按钮样式改为 `.volume-btn` （13px 字号，低透明度），不再使用 `.ctrl-side-btn`。
- **控制栏恢复 5 按钮对称**：`[循环] [上一首] [播放] [下一首] [收藏]`，播放键居中。gap 从 16px 恢复为 24px。
- **去掉唱片中心孔**：删除 `.disc::after` 伪元素（用户反馈不明显且破坏构图）。
- **`.progress-area` 改为 `flex:1`**：不再使用 `width:100%`，由 `.progress-volume-area` 容器控制宽度。
- **改动范围**：仅 `src/alice-music-float/index.ts`（HTML 结构调整 + CSS 修改）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **chrome-devtools 浏览器端验证通过（14 项）**（2026-04-10T20:30）：
  - 进入角色卡爱丽丝后脚本加载成功，悬浮球显示，展开面板正常。
  - 音量在 `.progress-volume-area` 内（非 controls），controls 5 个按钮对称，gap=24px，播放键居中。
  - 唱片 140px，无 `::after`，顶部栏分隔符存在。
  - 音量弹窗交互：点击开→再点静音→再点取消静音→点外部关闭，全部正常。
  - CSS 微交互：active scale、play hover glow、overlay-slide-in、progress transition 全部生效。
  - 控制台无播放器相关错误。

## 2026-04-10T18:35:00+08:00

### UI 美化批次二：音量弹出式重构 + 唱片黑胶纹理 + 顶部栏分隔 + 过渡动画

- **音量控制重构（HTML + CSS + JS）**：
  - 移除 `.volume-area` 水平布局（进度条与控制按钮之间），腾出面板垂直空间。
  - 音量按钮移入 `.controls` 最右侧（收藏按钮后），新增 `.volume-wrap` 容器。
  - 新增 `.volume-popup` 竖向弹出滑块（110px 高，32px 宽，`backdrop-filter: blur(12px)`，圆角胶囊），向上弹出。
  - 竖向滑块：`.volume-bar-v` / `.volume-fill-v`（从底到顶渐变）/ `.volume-thumb-v`（12px 白色圆点）。
  - 弹出动画 `@keyframes vol-pop-in`（opacity + translateY + scale）。
  - JS 交互：第一次点击打开弹窗 → 再次点击静音切换 → 点击面板其他区域关闭弹窗。
  - `updateVolumeUI()` 从水平（width/left）改为竖向（height/top）。
  - `volumeFromEvent()` 从水平（clientX/width）改为竖向（clientY 反转 / height）。
- **唱片区美化**：
  - 尺寸从 120px 增大到 140px。
  - 背景从单层 `radial-gradient` 改为 6 层叠加：中心高光 + 4 条环槽细线 + 底色渐变，模拟黑胶唱片纹理。
  - `box-shadow` 增加 `inset 0 0 30px rgba(0,0,0,0.3)` 内阴影。
  - 新增 `::after` 伪元素中心孔（18px 圆，`radial-gradient` 从深色到微光边缘，z-index:3）。
  - `.disc-icon` 字号从 36px 调为 38px，透明度降低（0.3→0.2），更低调。
- **顶部栏优化**：
  - 设置按钮与列表/收藏按钮之间新增竖线分隔符（`.header-divider`，1px 宽 14px 高）。
  - `.header-left` gap 从 4px 改为 0（分隔符自带 margin）。
  - `.icon-btn` 颜色从 `rgba(255,255,255,0.7)` 降为 `0.55`，字号从 18px 调为 17px，padding 从 `4px 6px` 调为
    `5px 7px`，圆角从 6px 调为 8px。
- **过渡动画**：
  - `.icon-btn` 添加 `:active { transform: scale(0.92) }` 按下反馈。
  - `.play-btn:hover` 添加 `box-shadow: 0 0 16px rgba(102,126,234,0.45)` 光晕。
  - `.play-btn:active` 添加 `scale(0.93)` 按下反馈。
  - `.overlay-page` 添加 `@keyframes overlay-slide-in`（从下方 30px 滑入 + 淡入，0.25s）。
  - `.progress-bar` 添加 `transition: height 0.15s ease`。
- **布局微调**：
  - `.panel-body` gap 从 16px 收紧为 12px，padding-bottom 从 20px 调为 16px。
  - `.controls` gap 从 24px 收紧为 16px（因新增音量按钮）。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **待用户测试**：音量弹窗交互 + 唱片纹理视觉 + 顶部栏分隔 + 动画效果。

## 2026-04-10T17:09:00+08:00

### UI 美化批次一补充：缓冲 spinner bug 修复 + 拖拽悬浮效果 + 浏览器验证

- **Bug 修复（P1/运行时错误）**：`waiting` 缓冲事件处理器中 `btnPlay.querySelector('i')!` 返回 `null`（按钮内 `<i>`
  已替换为 `<svg>`），导致 `TypeError: Cannot set properties of null (setting 'className')`。修复：新增 `#icon-spinner`
  SVG（FA spinner 图案），`waiting` 时隐藏 play/pause SVG 并显示 spinner，`canplay` 时恢复。CSS `.play-btn.loading i`
  改为 `.play-btn.loading .icon-spinner`。
- **拖拽悬浮效果**：`.playlist-item.dragging` 从 `opacity: 0.5` 改为 `scale(1.03)` +
  `box-shadow: 0 4px 16px` + 紫色高亮背景 + `z-index: 10`，拖拽时条目明显"浮起来"。
- **chrome-devtools 浏览器端验证通过（12 项）**：
  1. 悬浮球 SVG 音符图标（viewBox 640x640）。**通过。**
  2. 上一首/下一首 SVG（ctrl-svg-icon + path）。**通过。**
  3. 播放/暂停双 SVG 互斥切换（play 显示/pause hidden）。**通过。**
  4. 暂停镂空（fill=none, 2 rect）。**通过。**
  5. Spinner SVG 存在且默认隐藏。**通过。**
  6. 设置按钮自定义 SVG。**通过。**
  7. `.playlist-item` CSS：cursor:grab + touch-action:none + user-select:none。**通过。**
  8. `.dragging` CSS：scale(1.03) + box-shadow。**通过。**
  9. 离线曲库列表 4 首正确显示。**通过。**
  10. 收藏列表 2 首（checkbox + 序号 + 删除按钮）。**通过。**
  11. `className` null 错误已消失。**通过。**
  12. 控制台无播放器相关错误。**通过。**
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-10T15:26:00+08:00

### UI 美化批次一：图标替换为 FA v7 官方 SVG + 拖拽排序改为整行

- **悬浮球图标替换**：`<i class="fa-regular fa-music">` 替换为 FA v7 官方 music SVG
  path（`viewBox="0 0 640 640"`，`fill="white"`），新增 `.ball-music-icon` CSS（26x26px）。
- **上一首/下一首图标替换**：`fa-backward-step` / `fa-forward-step` 替换为 FA v7 官方 SVG path，新增 `.ctrl-svg-icon`
  CSS（22x22px，`fill: currentColor`）。
- **播放/暂停图标重构**：
  - 原 `<i>` 标签替换为两个互斥 `<svg>`：`#icon-play`（播放三角）和 `#icon-pause`（镂空双竖条）。
  - 暂停图标使用 `fill="none" stroke="white" stroke-width="48"` + `<rect rx="48">` 实现镂空方框效果。
  - JS 从 `icon.className` 赋值改为 `setPlayIcon(playing)` 切换 `hidden` class。
  - 三处切换逻辑（`onStateChange`、`canplay`、`waiting`）统一使用 `setPlayIcon()`。
- **拖拽排序改为整行拖拽**：
  - `setupPointerDragReorder` 绑定目标从 `indexSpan`（序号数字 18px）改为 `el`（整个列表项）。
  - 5px 位移阈值区分点击（触发播放）和拖拽（触发排序）。
  - `pointerdown` 添加 `e.preventDefault()` 阻止文本选择"复制"效果。
  - `suppressClick` + capture 阶段 click 拦截：拖拽结束后不触发播放。
  - `.playlist-item` CSS 添加 `cursor: grab`、`user-select: none`、`touch-action: none`。
  - 复选框和删除按钮的 `pointerdown` 被排除，不影响勾选/删除操作。
  - 播放列表和收藏列表均已更新。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **待用户测试**：整行拖拽排序 + 图标显示效果。

## 2026-04-10T00:43:00+08:00

### 关闭按钮修复确认 + 设置图标替换为自定义 SVG

- **关闭按钮问题确认已修复**：用户报告关闭按钮（X）不响应，经 chrome-devtools 浏览器端实测，关闭按钮点击正常触发
  `collapse()` 函数，`panel-disappear` 动画正常播放，`animationend`
  事件正常触发，面板折叠恢复悬浮球。开关动画均正常运行。
- **设置按钮图标替换**：将 `#btn-settings` 内的 Font Awesome `<i class="fa-regular fa-gear">`
  替换为用户提供的自定义 SVG 齿轮图标（24x24 viewBox，`fill="currentColor"` 继承按钮颜色）。新增 CSS
  `.settings-icon`（`width:18px; height:18px; display:block`）匹配原图标尺寸。
- **用户确认**：已看到齿轮图标被成功替换为自定义 SVG 设置图标。
- **改动范围**：仅 `src/alice-music-float/index.ts`（HTML 1 行替换 + CSS +4 行）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **chrome-devtools 浏览器端全量验证通过（7 项测试）**：
  1. 悬浮球展开：pointer 事件 → expand，`panel-appear` 动画，iframe 280x380。**通过。**
  2. 设置按钮 SVG：18x18px，`fill="currentColor"`，点击打开设置页。**通过。**
  3. 设置页返回按钮：正常关闭设置页。**通过。**
  4. 歌曲列表按钮：打开播放列表页。**通过。**
  5. 收藏列表按钮：打开收藏列表页（互斥关闭播放列表）。**通过。**
  6. 关闭按钮（X）：`collapsing` → `panel-disappear` → `animationend` → 隐藏面板 + 恢复悬浮球 + iframe 50x50。**通过。**
  7. 全量控件检查：play/prev/next/repeat/fav/volume 全部存在，歌曲信息正常。**通过。**

## 2026-04-09T19:47:00+08:00

### 新会话启动审查（第三轮）+ 2 Bug 修复

- **审查范围**：全量 2601 行源码逐段静态审查，重点检查功能补全批次二的 10 项改动。
- **8 项审查要点结果**：
  1. P0 修复 #1/#2（列表清空 + sequential 末尾 UI 重置）：完整，无问题。
  2. 音量/位置持久化：发现 P0 级 TDZ bug（见下方修复 #1）。
  3. 缓冲状态（waiting/canplay）：与 onStateChange 无竞态，无问题。
  4. 批量选择删除：从后往前 splice 逻辑正确，onlineCurrentIndex 更新正确，全选同步正确。
  5. MediaSession：srcdoc iframe 同源，`navigator.mediaSession` 上下文正确。
  6. Pointer 拖拽排序：setPointerCapture 在滚动容器内行为符合预期（拖拽中阻止滚动），已知限制为仅能在可见区域排序。
  7. 搜索超时：doSearch 的 clearTimeout 在正常/异常/AbortError 三条路径均已执行。
  8. resolveAndPlayFavorite 超时：catch 路径缺 clearTimeout（见下方修复 #2）。
- **修复 #1（P0/运行时错误）**：`VOL_STORAGE_KEY`、`POS_STORAGE_KEY`、`FAV_STORAGE_KEY` 三个 `const`
  常量在行 2252-2254 声明，但在行 1399（位置保存）、1812（音量读取）、1827（音量保存）处已被引用。由于 `const`
  存在TDZ（Temporal Dead Zone），运行时抛出 `ReferenceError`，被外层 `try/catch`
  静默吞掉。**后果**：音量和悬浮球位置的 localStorage 持久化完全不工作（保存和读取均静默失败），页面刷新后音量回默认、悬浮球回右下角。**修复**：将三个常量声明移到
  `on('load')` 回调开头（行 1282 之前），确保在所有使用点之前声明。
- **修复 #2（低风险/防御性）**：`resolveAndPlayFavorite()` 中 `ctrl` 和 `timer` 在 `try` 块内用 `const` 声明，`catch`
  块中无法访问 `timer` 执行 `clearTimeout`。15 秒后 `ctrl.abort()`
  会在已完成/已失败的请求上执行（无功能副作用，但不干净）。**修复**：将 `ctrl`/`timer` 声明提升到 `try` 外，`catch` 中补
  `clearTimeout(timer)`。
- **改动范围**：仅 `src/alice-music-float/index.ts`（+6 行，-4 行）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **chrome-devtools 浏览器端验证通过**（2026-04-09T20:05）：
  - 位置持久化：localStorage 值与 iframe 位置一致，拖拽后同步更新。
  - 音量持久化：0.27 正确恢复（滑块 27%、图标 `fa-volume-low`），静音/取消静音记忆正常。
  - 收藏数据：3 首歌曲正确加载显示。
  - 设置页模式切换、API 检测"已连接"、搜索按钮显隐均正常。

## 2026-04-09T18:00:00+08:00

### 功能补全批次二：2 Bug 修复 + 8 项功能增强

- **P0 修复 #1（删除列表最后一首歌音频未停止）**：`removeFromPlaylist` 列表清空分支新增 `audio.pause()` +
  `player.onStateChange?.(false)` + `updateFavBtn()` + `updateDiscCover('')` + 恢复离线曲目信息。
- **P0 修复 #2（在线顺序播放到末尾 UI 悬空）**：`sequential` 模式到末尾停止时，新增
  `songTitle.textContent = player.currentTrack.title` + `songArtist.textContent = player.currentTrack.stage`
  恢复离线信息。
- **音量持久化**：新增 `VOL_STORAGE_KEY`，`updateVolumeUI` 后调 `saveVolume()` 存 localStorage，初始化时读取恢复。
- **悬浮球位置持久化**：新增 `POS_STORAGE_KEY`，拖拽结束存 `{x, y}` 到 localStorage，启动时读取恢复（含视口边界钳制）。
- **缓冲/加载状态**：监听 audio `waiting` 事件显示 `fa-spinner` + CSS `spin-loading` 旋转动画，`canplay` 恢复正常图标。
- **播放列表/收藏列表批量选择删除**：
  - HTML：两个列表页各新增全选栏（`select-all-wrap`：复选框 + "全选" label + "删除选中" 按钮）。
  - CSS：`.playlist-item-checkbox`（14px accent-color 紫色）、`.batch-delete-btn`（红色边框按钮）。
  - JS：每个列表项前加复选框，`syncSelectAll()` 同步全选状态（含 indeterminate），批量删除从后往前 splice 避免索引偏移。
- **MediaSession API**：`updateMediaSession(title, artist, coverUrl)` 设置 metadata + artwork，`setActionHandler`
  绑定 play/pause/previoustrack/nexttrack 到按钮 click。在 `playOnlineTrack` 和 `onTrackChange` 中调用。
- **搜索超时控制**：`doSearch` 新增 30 秒总超时（`setTimeout → searchAbort.abort()`），`resolveAndPlayFavorite`
  新增 15 秒超时。
- **收藏数据解析失败反馈**：`loadFavorites` catch 改为 `showToast('收藏数据读取失败', 'error')` + 重置
  `favorites = []`。`saveFavorites` catch 改为 `showToast('收藏保存失败（存储已满？）', 'error')`。
- **拖拽排序改用 Pointer 事件**：新增 `setupPointerDragReorder()` 通用函数，序号区域 pointerdown → setPointerCapture →
  pointermove 高亮目标 → pointerup 执行 splice 排序。播放列表和收藏列表均使用此函数替代 HTML5 Drag and
  Drop，移动端触摸兼容。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-09T15:20:00+08:00

### 全量代码审查（第二轮）+ 3 Bug 修复 + 浏览器实测验证

- **审查范围**：全部 2305 行源码逐段静态审查。
- **修复 #1（中风险）**：在线顺序播放（`sequential`）到列表末尾停止时（行 2246-2248），`onlineCurrentIndex = -1` 后缺少
  `updateFavBtn()` 和 `updateDiscCover('')` 调用，导致爱心按钮和封面图停留在最后一首歌的状态。已添加两个同步调用。
- **修复 #2（低风险/防御性）**：`checkAudioPlayable()` 中临时 Audio 在 `loadedmetadata`/`error`/超时回调中
  `removeAttribute('src')` 前未 `pause()`。某些浏览器在 `loadedmetadata` 后可能已开始缓冲。已在三个清理路径前添加
  `audio.pause()`。
- **修复 #3（低风险/性能）**：`addToPlaylistAndPlay()` 末尾多余的 `renderPlaylist()` 调用。`playOnlineTrack()`
  内部已调用 `renderPlaylist()`，重复调用导致列表渲染两次。已删除冗余调用。
- **改动范围**：仅 `src/alice-music-float/index.ts`（+5 行，-1 行）。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。
- **chrome-devtools 浏览器端验证**（2026-04-09T16:00）：
  - 悬浮球加载、展开/折叠正常。
  - 在线搜索"春风吹"：网易云 3 条 + QQ音乐 3 条，API 全部 200，`checkAudioPlayable` 校验正常（duration=35s）。
  - 点击搜索结果"春风吹 - 方大同 · QQ音乐"：歌曲信息正确，封面图显示（QQ 音乐 CDN），唱片旋转，暂停图标。
  - **修复 #1 端到端验证**：收藏歌曲 → 切 sequential → seek 到 3:18/3:20 → 自然 ended
    → 爱心重置空心、封面隐藏、唱片暂停、play 图标。**通过。**
  - **修复 #3 端到端验证**：播放列表正确显示 1 项且 active 高亮，无重复渲染。**通过。**
  - 收藏 localStorage 数据格式正确（`[{title,artist,source}]`）。
  - 循环模式三态切换正常。

## 2026-04-09T15:01:00+08:00

### 封面图修复：CSS background → img 标签 + 全功能用户测试通过

- **问题**：封面图使用 CSS `background-image: url(...)` 设置在 `.disc` 上，但在 `srcdoc`
  iframe 中 QQ 音乐封面 CDN 请求间歇性失败（`ERR_HTTP2_PROTOCOL_ERROR` /
  `ERR_FAILED`），导致唱片区域显示为空（背景消失、图标被隐藏）。
- **根因**：chrome-devtools 网络请求日志确认，同一封面 URL 在 iframe 外 `new Image()` 加载成功，但 CSS background 在
  `about:srcdoc` iframe 中请求不稳定。`<img>` 标签的网络请求处理比 CSS background 更可靠。
- **修复**：
  - HTML：`.disc` 内新增 `<img id="disc-cover" class="disc-cover hidden" />`。
  - CSS：`.disc` 加 `position: relative`；`.disc-cover` 为
    `position: absolute; width:100%; height:100%; object-fit:cover; border-radius:50%`。
  - JS：`updateDiscCover(url)` 改为设置 `<img>` 的 `src` + 显隐控制，不再操作 CSS `background`。
  - 移除 `.disc` 上的 `background-size` / `background-position` 属性（不再需要）。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **浏览器自动验证通过**（chrome-devtools）：
  - 音量按钮静音切换：图标 `fa-volume-high` ↔ `fa-volume-xmark`，滑块 100% ↔ 0%，双向切换正常。
  - Toast 容器 DOM 存在，动态创建 toast 渲染正常。
  - 唱片封面 `<img>` src 正确指向 QQ 音乐封面 URL，`disc spinning` 旋转状态正确。
- **用户实际测试全部通过**（2026-04-09T15:06）：
  - 封面图：在线播放"春风吹"时唱片显示封面并正常旋转。
  - 音量控制：滑块拖拽调节音量正常（在系统音量 27% 基础上增减），静音切换正常。
  - 搜索无结果提示：输入无效关键词，显示"未找到可播放的歌曲，换个关键词试试"。
  - 收藏重新获取 URL：点击收藏歌曲后自动搜索获取新链接并播放，用户反馈"速度比直接搜索快了很多"。
  - 所有新增功能均无 bug。

## 2026-04-09T14:00:00+08:00

### 功能补全批次：防御性修复 + 音量控制 + 封面图 + Toast + 收藏优化

- **防御性修复（5 项，改动最小）**：
  - 删除死代码 `capturedPointerId`（3 处，赋值后从未读取）。
  - `audio.src === ''` 改为 `audio.hasAttribute('src')`（浏览器移除 src 后 getter 可能返回页面 URL）。
  - MVU `currentStage` 加 `VALID_STAGES` 白名单校验（新增常量 `const VALID_STAGES`，初始加载和事件监听两处均加
    `includes` 校验）。
  - `resize` handler 存为 `onResize` 命名函数，`pagehide` 时 `removeEventListener` 清理。
  - `loadFavorites()` 加 `Array.isArray` + 字段类型校验 + `.map()` 只保留 `{title, artist, source}`
    三个字段，防止脏数据注入。
- **搜索无结果提示**：
  - 搜索完两个平台仍无可用结果时显示"未找到可播放的歌曲，换个关键词试试"。
  - 网易云搜索完后无论是否有结果均显示"继续搜索QQ音乐..."中间状态提示。
- **胶囊 Toast 提示系统**：
  - 新增 HTML `#toast-container`（面板底部绝对定位）。
  - 新增 CSS `.toast`（圆角胶囊，入场/淡出动画，`.toast-error` 红色、`.toast-info` 蓝色）。
  - 新增 `showToast(msg, type)` 函数，2.5s 自动移除。
  - `OfflinePlayer` 新增 `onError` 回调，离线出错显示"播放失败: {title}"，在线出错显示"链接已过期: {title}"。
  - `playOnlineTrack()` 的 `.catch` 改用 `showToast` 替代 `console.warn`。
- **音量控制**：
  - HTML：进度条与控制按钮之间新增 `.volume-area`，含音量图标按钮（`#btn-volume`）+ 音量滑块（`#volume-bar` /
    `#volume-fill` / `#volume-thumb`）。
  - CSS：`.volume-btn`（14px 图标）、`.volume-bar`（4px 轨道）、`.volume-fill`（渐变填充）、`.volume-thumb`（10px 白色圆点，hover 显示）。
  - JS：点击音量图标切换静音（`volume-high ↔ volume-xmark`，记忆上次音量）；滑块 `pointerdown/move/up` +
    `setPointerCapture` 拖拽调节音量；三态图标自动切换（`volume-high/low/xmark`）。
- **在线歌曲封面图**：
  - CSS：`.disc` 新增 `background-size: cover; background-position: center; overflow: hidden`。
  - JS：新增 `updateDiscCover(coverUrl)` 函数 — 传入封面 URL 时设为唱片背景并隐藏默认音乐图标，传空恢复默认。
  - `playOnlineTrack()` 中调用 `updateDiscCover(track.cover)`；`player.onTrackChange`（离线切歌）中调用
    `updateDiscCover('')` 恢复默认。
- **收藏功能优化（最大改动）**：
  - 新增 `FavoriteItem` 接口：仅 `{title, artist, source}`，不存 URL/cover（URL 有时效性，过期无法播放）。
  - `favorites` 数组类型从 `SearchResult[]` 改为 `FavoriteItem[]`。
  - `isCurrentFavorited()` 匹配逻辑从 `f.url === cur.url` 改为
    `f.title === cur.title && f.artist === cur.artist && f.source === cur.source`。
  - 收藏按钮 `click` handler：`favorites.push({ ...cur })` 改为 `favorites.push({ title, artist, source })`。
  - 新增 `resolveAndPlayFavorite(fav)` 函数：用 `title + artist`
    搜索对应平台（`searchPlatform(platform, keyword, 3, 1, signal)`），搜到自动播放，失败 toast 提示"链接获取失败，请手动搜索"。
  - `renderFavList()` 点击事件改为调用 `resolveAndPlayFavorite(r)` 替代原 `addToPlaylistAndPlay(r)`。
  - 向后兼容：`loadFavorites()` 的 `.map()` 会自动从旧格式 `SearchResult` 数据中提取 3 个字段，丢弃过时的 url/cover。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 所有入口 `compiled successfully`。

## 2026-04-09T13:10:00+08:00

### 初始加载自动播放离线音乐

- **需求**：脚本加载后自动根据当前 `世界.当前剧情阶段` 播放对应离线音乐，不需要等待阶段变化事件。
- **实现**：在 MVU 初始化成功、事件监听注册完成后，通过 `Mvu.getMvuData({ type: 'message', message_id: 'latest' })`
  读取最新楼层的 `stat_data.世界.当前剧情阶段`，调用 `playerRef.playByStage(currentStage)` 自动播放。
- **作用域**：仅在离线模式下生效（`playByStage` 内部调用 `onResumeOffline` 回调处理模式状态）。
- **改动范围**：仅 `src/alice-music-float/index.ts`（新增 7 行，第 2025-2033 行）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **浏览器验证**（chrome-devtools，2026-04-09T13:20）：
  - 控制台成功输出 `[alice-music-float] 初始加载：当前阶段=初识期，自动播放`。
  - `Mvu.getMvuData({ type: 'message', message_id: 'latest' })` 正确读取到 `世界.当前剧情阶段=初识期`。
  - 代码回审确认新增 7 行逻辑无误，不影响已有功能。
- **用户实际测试通过**（2026-04-09T13:25）：
  - 临时将初识期 URL 替换为失去期音乐（`17.flac`）进行端到端测试。
  - 新开对话 → MVU 初始化 → 初识期变量就位 → 音乐自动播放，用户确认成功。
  - 测试后已恢复初识期 URL 为 `URL_初识期_待填`，`npm run build:dev` 编译通过。

## 2026-04-09T12:20:00+08:00

### 全量代码审查 + Bug 修复 + 浏览器验证

- **静态审查**（2035 行源码全量检查）：
  - **发现并修复 Bug**：`renderPlaylist()` 函数中 `removeBtn` 被 `appendChild` 两次（行1653+1661），`click`
    事件监听器也重复注册两次（行1656-1660+1664-1668），导致点击列表项会触发两次 `playOnlineTrack(i)`。
  - **修复**：删除重复的 `el.appendChild(removeBtn)` 和重复的 `el.addEventListener('click', ...)` 块。
  - **低风险项确认**：`audio` 变量在 `onEnded` 回调中的引用、双 `ended` 监听器竞争等均不影响实际运行。
- **构建验证**：`npm run build:dev` 全部 `compiled successfully`。
- **浏览器验证**（chrome-devtools 端到端测试）：
  - 悬浮球 iframe 存在且定位正确（position:fixed, z-index:99999）。
  - 单击展开：ball 隐藏、panel 显示、iframe 尺寸切换为 280x380。
  - 主界面信息正确：歌曲标题"初识期"，播放图标 `fa-play`，唱片 `paused` 状态。
  - 离线模式：搜索按钮隐藏，歌曲列表显示 4 首离线曲库，第 1 首高亮。
  - 设置页：模式切换正常（离线↔在线），API 检测返回"已连接"（绿色）。
  - 收藏列表：显示已收藏歌曲（"春风吹" by 方大同），布局正确。
  - 循环模式：三态切换正常（列表循环→单曲循环→顺序播放→列表循环）。
  - 关闭按钮：面板正确折叠，iframe 恢复 50x50。
- **改动范围**：仅 `src/alice-music-float/index.ts`（删除 8 行重复代码）。

## 2026-04-09T12:06:00+08:00

### 列表项两行布局修复歌名截断

- **问题**：歌手·来源后缀过长（如 "Daoko/米津玄師 · 网易云"）时，歌名被 `flex-shrink` 挤压为"打…"，无法辨识。
- **CSS 修复**：
  - 新增 `.playlist-item-info`：`flex:1; min-width:0; flex-direction:column; gap:2px`，包裹 title 和 artist 两行。
  - `.playlist-item-title`：移除 `flex:1`，仍保留 `text-overflow:ellipsis` 独立截断。
  - `.playlist-item-artist`：移除 `flex-shrink:0`，新增 `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`
    独立截断。
- **HTML 修复**（三个渲染函数）：
  - `renderPlaylist()`：`<span>` 平级 → `<div class="playlist-item-info">` 包裹 title+artist（追加 `· ${r.source}`）。
  - `renderFavList()`：同上。
  - `renderOfflinePlaylist()`：同上（artist 行显示 `t.stage`）。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

### 用户测试确认（2026-04-09T12:00）

- 在线播放列表循环回绕（上一首/下一首）：正常。
- 循环模式按钮三态切换：正常。
- 收藏功能（爱心按钮、localStorage 持久化）：正常。
- 收藏列表拖拽排序（上下拉移动位置）：正常。
- 三列表数字序号（播放/收藏/离线）：正确显示。
- **发现歌名截断问题**：已在上方修复。

## 2026-04-09T11:30:00+08:00

### 收藏列表拖拽排序 + 三列表数字序号

- **收藏列表拖拽排序**：
  - `renderFavList()` 重写：添加 `el.draggable = true`、`dragstart`/`dragend`/`dragover`/`dragleave`/`drop` 事件链。
  - 拖拽后 `splice` 交换 `favorites` 数组元素，`saveFavorites()` 持久化新顺序。
  - HTML 结构对齐播放列表（`span` + 程序化创建删除按钮），取消原 `playlist-item-info` 包装。
- **三列表数字序号**：
  - CSS：`.playlist-item-drag` 重命名为 `.playlist-item-index`，移除 `fa-grip-vertical`
    图标样式，改为数字文本样式（`font-variant-numeric: tabular-nums`，`min-width: 18px`，居中）。
  - `renderPlaylist()`：`<span class="playlist-item-drag"><i class="fa-solid fa-grip-vertical"></i></span>` →
    `<span class="playlist-item-index">${i + 1}</span>`。
  - `renderFavList()`：新增 `<span class="playlist-item-index">${i + 1}</span>`。
  - `renderOfflinePlaylist()`：新增
    `<span class="playlist-item-index" style="cursor:default">${i + 1}</span>`（不可拖拽）。
  - 点击过滤：`.playlist-item-drag` → `.playlist-item-index`。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-09T10:40:00+08:00

### 修复在线列表不循环 bug + 循环模式按钮 + 收藏功能

- **Bug 修复：在线播放列表不循环**：
  - `btnPrev` 点击：`(onlineCurrentIndex - 1 + len) % len` 取模循环。
  - `btnNext` 点击：`(onlineCurrentIndex + 1) % len` 取模循环。
  - `ended` 事件：同样取模循环（受 repeatMode 控制）。
- **新增循环模式按钮（`#btn-repeat`）**：
  - HTML：控制按钮区左侧新增循环按钮。
  - CSS：`.ctrl-side-btn` 侧按钮样式（16px，半透明，激活态高亮）、`.repeat-one-badge` 角标（绝对定位数字"1"）。
  - JS：`repeatMode` 三态变量（`repeat-all` → `repeat-one` → `sequential`），`updateRepeatBtn()` 更新图标和提示。
  - 离线 ended 受控：`OfflinePlayer` 新增 `onEnded` 回调，外部可拦截默认 `next()` 行为。
  - 在线 ended 受控：`repeat-one` 时 `audio.currentTime=0` 重播，`sequential` 时到末尾停止。
  - 手动 next/prev 不受 repeatMode 影响（始终循环）。
- **新增收藏功能**：
  - HTML：控制按钮区右侧新增爱心按钮（`#btn-fav`）；顶部栏左侧新增收藏列表入口（`#btn-fav-list`）；新增收藏列表叠加页（`#fav-page`）。
  - CSS：`.ctrl-side-btn.fav-active i` 红色心形。
  - JS：`favorites` 数组 + `localStorage` 持久化（key `alice-music-favorites`）。
  - `loadFavorites()` / `saveFavorites()` 读写 localStorage。
  - `isCurrentFavorited()` / `updateFavBtn()` 判断和更新爱心状态。
  - `renderFavList()` 渲染收藏列表页（点击播放 + X 取消收藏）。
  - `playOnlineTrack()` 和 `resumeOfflineMode()` 中调用 `updateFavBtn()` 同步心形状态。
  - `closeAllOverlays()` 包含 `favPage`。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-09T09:50:00+08:00

### 在线播放列表管理：删除按钮 + 拖拽排序

- **新增 CSS**：
  - `.playlist-item-remove`：X 删除按钮样式，hover 变红（`#f87171`），`flex-shrink: 0`。
  - `.playlist-item-drag`：拖拽手柄样式，`cursor: grab`，`touch-action: none`。
  - `.playlist-item.dragging`：拖拽中半透明。
  - `.playlist-item.drag-over`：拖拽经过时顶部蓝色指示线。
- **新增 `removeFromPlaylist(index)` 函数**：
  - 从 `onlinePlaylist` 数组中移除指定歌曲。
  - 智能更新 `onlineCurrentIndex`：删除当前播放→播下一首；删除前面→索引前移；列表清空→重置在线状态。
- **`renderPlaylist()` 重写**：
  - 每个列表项新增左侧拖拽手柄（`fa-solid fa-grip-vertical`）和右侧 X 删除按钮。
  - X 按钮 `click` 绑定 `removeFromPlaylist(i)`，`stopPropagation` 防止触发播放。
  - 列表项 `click` 排除手柄和删除按钮区域，仅点击标题/歌手区域触发播放。
  - HTML5 Drag and Drop 实现拖拽排序：`dragstart`/`dragend`/`dragover`/`dragleave`/`drop` 事件链。
  - `drop` 时 `splice` 交换数组元素，同步更新 `onlineCurrentIndex`。
- **改动范围**：仅 `src/alice-music-float/index.ts`（CSS +38 行，JS +85 行）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-09T09:21:00+08:00

### 离线/在线模式 UI 隔离（搜索按钮 + 歌曲列表分离）

- **搜索按钮模式联动**：
  - `updateApiStatusVisibility()` 重命名为 `updateModeUI()`，同时控制搜索按钮和数据源状态行的显隐。
  - 离线模式（默认）：搜索按钮（放大镜 `#btn-search-open`）隐藏。
  - 在线模式：搜索按钮显示。
  - 初始化时调用 `updateModeUI()` 确保默认状态正确。
- **歌曲列表模式分离**：
  - `btnPlaylist` 点击时根据 `playMode` 调用不同渲染函数。
  - 离线模式 → `renderOfflinePlaylist()`：渲染 `OFFLINE_TRACKS` 4首剧情BGM，当前播放曲目高亮（`.active`），点击可切歌。
  - 在线模式 → `renderPlaylist()`：渲染 `onlinePlaylist` 在线歌曲列表（行为不变）。
- **新增 `renderOfflinePlaylist()` 函数**：遍历 `OFFLINE_TRACKS`，通过 `player.currentIndex` 和 `onlineCurrentIndex`
  判定当前播放高亮，点击时调用 `resumeOfflineMode()` + `player.loadTrack(i)` + `player.play()` 切歌。
- **改动范围**：仅 `src/alice-music-float/index.ts`（约 +25 行新增，~5 行修改）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-09T08:51:00+08:00

### 新会话启动检查 + 全量 Bug 审查

- **webpack build:dev**：所有入口编译通过，无报错。
- **源码审查**（`src/alice-music-float/index.ts`，1578行）：未发现影响功能的严重 bug。
- **低风险改进点**（均不影响实际使用）：
  1. `audio.src` 检查（行117）：`removeAttribute('src')` 后 getter 返回值可能非空，但 `loadTrack()`
     总会先设置 src，不影响。
  2. `pointercancel` 未监听（拖拽逻辑）：极端场景下 `isDragging` 可能不重置，但下次 `pointerdown` 会重新初始化。
  3. `ended` 事件双监听器（行77+行1530）：`_skipEndedHandler`
     标志位正确控制，addEventListener 同步按注册顺序执行，无竞态。
- **开发进度确认**：功能实现第1-5步全部完成，剩余 UI 美化（第6步，待用户指导）和两个离线歌曲 URL（初识期/软化期）待填。
- **本次未修改代码，仅更新文档。**

## 2026-04-08T23:20:00+08:00

### 设置页在线数据源状态显示（第5步设置页功能完成）

- **新增 `checkApiStatus()` 函数**：向 `api.vkeys.cn/v2/music/netease?word=test`
  发送最小搜索请求，5 秒超时（AbortController），根据响应判定 `'ok'` | `'fail'`。
- **HTML 新增**：设置页"主题"行下方新增 `#api-status-item`（默认 `hidden`），含 `#api-status` 状态文字元素。
- **CSS 新增**：
  - `.api-status` 基础样式（inline-flex + 圆点伪元素）。
  - `.api-status.checking` 黄色闪烁圆点（`@keyframes blink`）。
  - `.api-status.ok` 绿色圆点。
  - `.api-status.fail` 红色圆点。
- **JS 逻辑**：
  - `updateApiStatusVisibility()` — 根据 `playMode` 显隐数据源状态行。
  - `runApiCheck()` — 执行检测并更新 UI（文字 + CSS 类）。
  - 打开设置页时（`btnSettings click`）：先更新显隐，在线模式则触发检测。
  - 模式切换时（`modeToggle click`）：联动显隐，切到在线且设置页可见时触发检测。
- **改动范围**：仅 `src/alice-music-float/index.ts`（HTML +3 行、CSS +22 行、JS +20 行）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **用户实际测试通过**（2026-04-08T23:28）：在线模式显示"已连接"（绿色圆点），离线模式正确隐藏，模式切换联动正常，无 bug。

## 2026-04-08T23:13:00+08:00

### API 来源调查 + 版权评估 + 文档回写

- **api.vkeys.cn 服务调查完成**：
  - 全称"落月API"（API-V3），由"落月"（GitHub: luoyue712）和"小杰"联合维护，2024年6月起合作开发。
  - 官方文档：`doc.vkeys.cn`，文档仓库：`github.com/lvluoyue/api-doc`。
  - 后端：PHP 8.5 + webman（workerman 协程）+ Swoole + Redis 缓存。
  - 当前完全免费、无认证机制、无 QPS 限制、无使用条款/ToS。
  - 备用域名：`api.epdd.cn`。
  - 性质：个人开发者维护的免费非官方聚合 API。
- **版权风险评估**：
  - 本项目代码层面：无版权问题（原创代码）。
  - 音乐内容层面：通过非官方 API 获取音频 URL 属灰色地带，个人使用不商用风险极低。
  - API 服务本身可能随时下线/限流/收费，无保障。
- **DECISIONS.md 更新**：在"在线音乐数据源"章节追加"服务来源与维护者"和"版权与法律风险评估"两个子节。
- **SESSION_STATE.md 更新**：Done 追加 API 调查记录，NextStep 更新为设置页功能续和 UI 美化，Verification 追加用户测试确认。
- **本次未修改代码，仅更新文档。**

## 2026-04-08T22:47:00+08:00

### 在线搜索播放功能实现（功能实现第4步完成）

- **新增模块级函数**：
  - `checkAudioPlayable(url)` — 音频可用性检测，创建临时 Audio，3 秒超时，`loadedmetadata` 可播 / `error` 不可播。
  - `searchPlatform(platform, keyword, maxCheck, maxValid, signal)`
    — 单平台搜索封装（搜索→逐条取播放地址→校验可用性→返回标准化结果）。
- **新增 `SearchResult` 接口**：`{title, artist, url, cover, source}` 标准化搜索结果格式。
- **`OfflinePlayer` 扩展**：
  - `_skipEndedHandler` 标志位 — 在线播放时跳过离线 `ended` 自动切歌。
  - `onResumeOffline` 回调 — `playByStage()` 切回离线模式时重置在线播放状态。
- **新增 iframe 内逻辑**：
  - `onlinePlaylist` 数组 + `onlineCurrentIndex` — 在线播放列表状态管理。
  - `doSearch()` — 完整搜索流程：AbortController 取消管理 + 网易云前5取3 + QQ音乐前5取3 + 阶段性渲染。
  - `addToPlaylistAndPlay(result)` — 按 URL 去重加入列表并播放，关闭搜索页。
  - `playOnlineTrack(index)` — 直接使用 OfflinePlayer 的 Audio 元素播放在线歌曲，更新主界面歌曲信息。
  - `renderPlaylist()` — 歌曲列表页渲染，当前播放高亮 `.active`，点击切歌。
  - `renderSearchResults(results)` — 搜索结果列表渲染，点击触发加入播放。
  - `escapeHtml()` — HTML 转义防 XSS。
- **按钮行为智能切换**：播放/暂停/上一首/下一首按钮根据 `onlineCurrentIndex` 判断控制在线列表还是离线引擎。
- **在线 `ended` 处理**：在线列表播完自动切下一首，列表结束后停止并重置状态。
- **改动范围**：仅 `src/alice-music-float/index.ts`（新增约 200 行）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **浏览器 API 端到端测试**（2026-04-08T23:02）：
  - 网易云搜索+取播放地址+音频校验：通过（`loadedmetadata` 正常触发）。
  - QQ音乐搜索+取播放地址+音频校验：通过。
  - 完整搜索流程（"告白气球"）：网易云3条+QQ音乐3条可用，总耗时约10.7秒。
- **api.vkeys.cn 服务调查**：
  - 全称"落月API"，由开发者"落月"（GitHub: luoyue712）和"小杰"联合维护。
  - 官方文档：`doc.vkeys.cn`，GitHub 仓库：`github.com/lvluoyue/api-doc`。
  - 后端基于 PHP webman 框架（workerman），支持协程、Redis 缓存、连接池。
  - 备用域名：`api.epdd.cn`（用于测试/故障转移）。
  - 无 QPS 限制，数据缓存5分钟~1天。
  - 已有 MCP 服务器、被 Koishi 机器人插件等项目采用。

## 2026-04-08T22:45:00+08:00

### UI 架构重构：主界面不变 + 搜索/列表/设置为叠加页

- **用户反馈**：主界面（唱片播放界面）应始终不变，搜索应像音乐软件一样弹出独立页面，搜索后回到主界面播放。需要歌曲列表功能（汉堡按钮打开）。
- **架构调整**：
  - 废弃 `#online-page` 和 `playMode` 页面切换逻辑（主界面不再因模式切换而变化）。
  - 搜索页（`#search-page`）、歌曲列表页（`#playlist-page`）、设置页（`#settings-page`）统一为 `.overlay-page` 叠加层。
  - 三个叠加页互斥显示，通过 `closeAllOverlays()` 管理。
- **顶部栏重构**：
  - 左侧 `.header-left`：齿轮设置（`fa-regular fa-gear`）+ 汉堡歌曲列表（`fa-solid fa-bars`）。
  - 右侧 `.header-right`：放大镜搜索（`fa-solid fa-magnifying-glass`）+ X 关闭（`fa-solid fa-xmark`）。
- **新增歌曲列表页**（`#playlist-page`）：返回按钮 + "播放列表" 标题 + 滚动列表容器（`.playlist-items`），含
  `.playlist-item` / `.active` 样式。
- **搜索页独立化**：从原 `#online-page` 内容提取为独立叠加页，打开时自动聚焦输入框。
- **设置页**：CSS 类从 `.settings-page` 改为通用 `.overlay-page`，header 从 `.panel-header` 改为 `.overlay-header`。
- **移除内容**：`#online-page` HTML、`online-controls` CSS/JS、`btnPlayOnline`/`btnPrevOnline`/`btnNextOnline`
  绑定、`origOnStateChange` 包装。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-08T22:22:00+08:00

### 播放模式切换 UI + 在线搜索框 UI（第4步 UI 部分 + 第5步模式切换）

- **设置页播放模式切换**：
  - "播放模式"行右侧 `#mode-toggle` 文字可点击，在"离线播放"/"在线播放"之间切换。
  - `playMode` 状态变量（`'offline' | 'online'`）控制主页面显示。
  - 在线模式时文字变蓝色（`.mode-toggle.online`）。
- **在线模式主页面新增**：
  - `#online-page`：独立于 `#main-page` 的在线模式面板，模式切换时互斥显示。
  - 搜索框（`.search-box`）：左侧放大镜图标 `fa-solid fa-magnifying-glass` + 中间输入框 `#search-input` + 右侧回车按钮
    `#btn-search`（`fa-solid fa-arrow-right-to-bracket`）。
  - 搜索结果容器 `#search-results`：带滚动条，含占位文字"输入关键词搜索歌曲"。
  - 结果项样式（`.search-result-item`）已定义：标题/歌手/来源，hover 高亮。
  - 底部控制按钮（`btn-prev-online`/`btn-play-online`/`btn-next-online`）绑定同一播放引擎，图标与离线模式同步。
- **搜索触发**：点击回车按钮或 Enter 键均可触发 `doSearch()`，当前输出日志占位，API 逻辑待后续接入。
- **改动范围**：仅 `src/alice-music-float/index.ts`（HTML 约 +18 行、CSS 约 +130 行、JS 约 +40 行）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **用户确认继续**，未报告问题。

## 2026-04-08T21:41:00+08:00

### 新会话启动检查（全部通过）

- **检查项 1 — 唱片旋转动画 CSS**：`@keyframes disc-spin`、`.disc.spinning`、`.disc.paused` 定义正确。
- **检查项 2 — 唱片旋转动画 JS**：`onStateChange` 中 `disc.classList` 切换逻辑（播放→spinning/暂停→paused）正确。
- **检查项 3 — MVU 变量监测**：`waitGlobalInitialized('Mvu')` + `eventOn(VARIABLE_UPDATE_ENDED)` + `_.get` 路径 +
  `playByStage` 调用 + `pagehide` 清理均正确。
- **检查项 4 — 热恋期 URL 一致性**：代码（行46）、DECISIONS.md（行183）、SESSION_STATE.md（行69）三处均为
  `biaobai.mp3`，一致。
- **构建验证**：`npm run build:dev` 全部 `compiled successfully`。
- **结论**：无问题，可继续第4步开发。
- **本次未修改代码，仅更新文档。**

## 2026-04-08T18:47:00+08:00

### 会话收尾：文档回写 + 新会话启动检查指令

- **SESSION_STATE.md 更新**：
  - InProgress 标记本次会话完成内容（唱片旋转动画 + MVU 监测 + 热恋期 URL）。
  - NextStep 新增"新会话启动检查"步骤：下次会话必须先检查本次新增代码（唱片动画 CSS/JS、MVU 监听逻辑、热恋期 URL 一致性），确认无误后再继续第4步。
- **本次会话总计完成**：
  1. 唱片旋转动画（CSS `@keyframes disc-spin` + `.spinning`/`.paused` 类 + `onStateChange` 联动）。
  2. MVU 变量监测与自动切歌（`waitGlobalInitialized('Mvu')` + `eventOn(VARIABLE_UPDATE_ENDED)` + `playByStage`）。
  3. 热恋期歌曲 URL 填入（`biaobai.mp3`）。
  4. 浏览器实际验证（两次阶段变化模拟均成功切歌）。
- **本次仅更新文档，未修改代码。**

## 2026-04-08T17:55:00+08:00

### 热恋期歌曲 URL 填入 + MVU 自动切歌完整浏览器验证

- **热恋期 URL 更新**：`OFFLINE_TRACKS` 中热恋期条目 URL 从 `URL_热恋期_待填` 改为
  `https://cdn.jsdelivr.net/gh/baiqigo/music/biaobai.mp3`。
- **DECISIONS.md 同步**：阶段与歌曲映射中热恋期 URL 同步更新。
- **浏览器完整测试**：在 SillyTavern 页面通过 `eventEmit('mag_variable_update_ended', ...)` 模拟两次阶段变化：
  - 初识期→失去期：控制台输出 `剧情阶段变化: 初识期 → 失去期，自动切歌`，无播放错误。
  - 失去期→热恋期：控制台输出 `剧情阶段变化: 失去期 → 热恋期，自动切歌`，无播放错误。
- **改动范围**：`src/alice-music-float/index.ts`（1 行 URL 替换）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-08T17:25:24+08:00

### MVU 变量监测与自动切歌（功能实现第3步完成）

- **实现方案**：在 `$(() => { ... })` 入口内启动异步 IIFE，`await waitGlobalInitialized('Mvu')` 等待 MVU 框架就绪，然后
  `eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, ...)` 注册变量更新结束事件监听。
- **监听逻辑**：回调中通过 `_.get(newVars, 'stat_data.世界.当前剧情阶段')` 和 `_.get(oldVars, ...)`
  比较新旧阶段值，变化时调用 `playerRef.playByStage(newStage)`。
- **容错设计**：MVU 初始化失败时 `catch` 错误并 `console.warn`，不影响其他功能运行。
- **资源清理**：`pagehide` 卸载时调用 `mvuEventStop.stop()` 取消事件监听。
- **改动范围**：仅 `src/alice-music-float/index.ts`，新增约 20 行。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **浏览器测试**：在 SillyTavern 页面通过 `eventEmit('mag_variable_update_ended', newVars, oldVars)`
  模拟阶段变化（初识期→失去期），控制台成功输出
  `[alice-music-float] 剧情阶段变化: 初识期 → 失去期，自动切歌`，确认监听链路完整。

## 2026-04-08T17:13:10+08:00

### 唱片旋转动画（播放器 UI 联动 — 第2步完成）

- **新增 CSS 动画**：`@keyframes disc-spin`（`0deg → 360deg`），`.disc.spinning`（4s 匀速无限旋转），`.disc.paused`（保留动画但
  `animation-play-state: paused`，暂停时保持当前角度）。
- **JS 联动**：`onStateChange` 回调中，播放时为 `.disc` 添加 `spinning` 类并移除 `paused`；暂停时反之。
- **改动范围**：仅 `src/alice-music-float/index.ts`，2 处改动（CSS 约 10 行 + JS 约 4 行）。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **待验证**：需用户实际测试确认旋转/暂停效果正常。

## 2026-04-08T17:10:00+08:00

### 用户全量测试通过确认

- **用户测试范围**：悬浮球拖拽、单击展开/折叠、外部点击折叠、设置页进入/返回、播放/暂停、上一首/下一首、进度条实时更新、进度条拖拽 seek、歌曲信息显示、所有按钮交互。
- **测试结果**：全部正常，无 bug。
- **当前已完成功能**：悬浮球 UI（v4.1）+ 离线播放核心（第1步）+ 进度条/时长/图标联动（第2步部分）。
- **剩余第2步**：唱片旋转动画（播放时旋转、暂停时停止）。
- **本次仅更新文档，未修改代码。**

## 2026-04-08T17:00:00+08:00

### 进度条 + 时长显示（播放器 UI 联动 — 部分）

- **新增进度条 HTML**：`progress-area` 区域，含
  `progress-bar`（可拖拽轨道）、`progress-fill`（填充条）、`progress-thumb`（拖拽圆点）、`time-current`/`time-total`（时间标签）。
- **新增进度条 CSS**：4px 轨道（hover 时 6px），渐变填充色，白色圆点（hover/seeking 时显示），monospace 时间标签。
- **`OfflinePlayer` 新增 `audioElement` getter**：暴露内部 Audio 元素供外部绑定 `timeupdate`/`loadedmetadata` 事件。
- **进度条交互逻辑**：`pointerdown` → `setPointerCapture` → `pointermove` 实时预览 → `pointerup` 执行
  `audio.currentTime` seek。
- **时间格式**：`m:ss` 格式（`formatTime` 辅助函数）。
- **切歌重置**：包装 `onTrackChange` 回调，切歌时自动重置进度条和时间标签。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **用户确认**：离线播放功能已通过实际测试（失去期歌曲可播放）。

## 2026-04-08T16:10:00+08:00

### 离线播放核心实现（功能实现第1步完成）

- **新增 `OfflinePlayer` 类**：封装 HTML5 Audio 播放引擎，管理曲目索引、播放状态、状态/曲目回调。
- **四阶段离线歌曲映射**：`OFFLINE_TRACKS` 数组定义 4 首离线歌曲（初识期/软化期/失去期/热恋期 →
  URL），失去期 URL 已填入。
- **播放控制逻辑**：`play()`、`pause()`、`togglePlay()`、`next()`、`prev()`、`playByStage(stage)` 方法。
- **面板按钮绑定**：为 HTML 中的上一首/播放/下一首按钮添加 `id`（`btn-prev`/`btn-play`/`btn-next`），在 iframe
  load 中绑定到 `OfflinePlayer` 实例。
- **UI 联动**：播放/暂停图标自动切换（`fa-play` ↔ `fa-pause`）；歌曲标题/阶段名显示跟随曲目变化更新。
- **自动切歌**：播放结束后自动 `next()`。
- **资源清理**：`pagehide` 时调用 `player.destroy()` 释放 Audio 资源。
- **改动范围**：仅 `src/alice-music-float/index.ts`。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-08T12:43:00+08:00

### 悬浮球交互确认完成 + 功能实现计划制定

- **用户确认**：v4.1 悬浮球交互完美，单击打开、拖拽跟随、松开停留均正常。悬浮球 UI 交互开发阶段正式完成。
- **制定功能实现计划**（6 步，按依赖顺序）：
  1. 离线播放核心（Audio 引擎 + 四阶段歌曲映射 + 播放控制）
  2. 播放器 UI 联动（图标切换 + 歌曲信息 + 进度条 + 唱片旋转）
  3. MVU 变量监测与自动切歌（监听 `世界.当前剧情阶段`）
  4. 在线搜索播放（搜索 UI + API 调用 + 可用性校验 + 结果列表）
  5. 设置页功能（模式切换 + 数据源状态 + 主题占位）
  6. UI 美化（最终阶段，用户亲自指导）
- **本次仅更新文档，未修改任何代码**。
- 已将计划写入 `docs/SESSION_STATE.md`，InProgress 设为第1步。

## 2026-04-08T12:34:00+08:00

### v4.1：修复拖拽不跟随 + 松开后粘手问题（setPointerCapture 全程方案）

- **用户测试反馈**（v4 两阶段策略）：
  1. 单击打开面板：已正常工作。
  2. 拖拽不跟随：按住移动鼠标，悬浮球停在原位，松开后瞬移到目标位置。
  3. 松开后粘手：瞬移后悬浮球变为粘手状态（粘在鼠标上），需再点击一下才松开。
- **根因分析**：v4 的 `enterDragMode` 中 `ball.releasePointerCapture()`
  导致事件链断裂。释放 capture 后浏览器不再向 ball 分发 pointer 事件，而 `pointer-events: none`
  还未生效到下一帧，父窗口也无法接收。导致 `onParentPointerMove` 不工作（不跟随），`onParentPointerUp`
  不触发（`isDragging` 不重置→粘手）。
- **v4.1 修复方案**（setPointerCapture 全程方案）：
  - 废弃 `enterDragMode`、`onParentPointerMove`、`onParentPointerUp` 函数。
  - 废弃所有 `pointer-events` 切换和父窗口事件监听。
  - 全程在 ball 上使用 `setPointerCapture` 保持 capture：
    - `pointerdown`：`setPointerCapture` + 记录起始坐标。
    - `pointermove`：阈值判定 + 拖拽移动（坐标转换为父页面坐标系）。
    - `pointerup`：`releasePointerCapture` + 判定单击/拖拽结束。
  - `setPointerCapture` 保证鼠标移出 iframe 范围后事件仍路由到 ball，不需要穿透。
- **改动范围**：仅 `src/alice-music-float/index.ts`，拖拽逻辑部分重写。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **待验证**：需用户实际测试确认拖拽实时跟随 + 松开停留 + 单击展开均正常。

## 2026-04-08T12:27:00+08:00

### v4 两阶段策略：修复悬浮球交互行为反转 bug

- **问题**：v3 在 pointerdown 时立即设置
  `pointer-events: none`，导致 iframe 内部无法接收 pointerup，单击被误判为拖拽（单击后球粘在鼠标上，需双击才能打开面板）。
- **修复方案（v4 两阶段策略）**：
  1. pointerdown 在 iframe 内部 ball 上触发，**不立即**设置 pointer-events:none。
  2. 使用 `ball.setPointerCapture(e.pointerId)` 确保后续事件在 iframe 内部 ball 上接收。
  3. 在 ball 上监听 pointermove/pointerup（阶段一判定）。
  4. 移动 > 3px → 进入拖拽模式：`releasePointerCapture` + 设置
     `pointer-events: none` + 父窗口 pointermove/pointerup（阶段二-A）。
  5. 移动 <= 3px + pointerup → 单击 → `releasePointerCapture` + 展开面板（阶段二-B）。
  6. 拖拽结束 pointerup 时恢复 `pointer-events: auto`。
- **改动范围**：仅 `src/alice-music-float/index.ts`，拖拽逻辑部分重写（约 60 行替换），注释更新为 v4。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。
- **待验证**：需用户实际测试确认单击/拖拽/关闭行为正确。

## 2026-04-08T12:23:00+08:00

### 用户测试反馈 + 记录 v3 交互行为反转 bug + 制定 v4 修复计划

- **用户实际测试反馈**（v3 架构）：
  1. **拖动不流畅**：单击一下悬浮球后它就粘在鼠标上跟随移动，不是"按住拖动"。
  2. **无法单击打开面板**：需要双击才能打开面板，用户期望单击直接打开。
  3. **粘手问题未解决**：核心交互逻辑错误导致依然有粘手感。
- **期望行为**（用户明确描述）：
  - 按住悬浮球 → 可以随意拖动 → 松开鼠标 → 悬浮球停留在松开的位置。
  - 单击悬浮球 → 直接打开面板。
- **根因分析**：v3 在 pointerdown 时**立即**设置 `pointer-events: none`，导致：
  1. iframe 内部 ball 无法接收 pointerup 来判断"这是一次点击还是拖拽"。
  2. pointerup 到达父页面时坐标偏差导致 3px 阈值判断始终失效，被误判为"已移动"。
  3. 因此单击触发了拖拽模式而非展开。
- **v4 修复计划（两阶段策略）**：
  1. pointerdown 时先在 iframe 内部监听 pointermove + pointerup，**不立即**设置 pointer-events:none。
  2. 移动超过 3px 阈值后，才进入拖拽模式（设置 pointer-events:none + 父窗口事件监听）。
  3. 未超过阈值 + pointerup → 在 iframe 内部直接判定为单击 → 展开面板。
- 已将完整修复计划写入 `docs/SESSION_STATE.md`。
- **本次仅更新文档，未修改任何代码**，交由下一次会话执行修复。

## 2026-04-08T12:15:00+08:00

### v3 架构：彻底修复悬浮球拖拽"粘手" bug

- **问题**：v2 修复（将 mousemove/mouseup 改为 pointermove/pointerup）不充分。浏览器会将 iframe 上方的指针事件发送到 iframe 内部文档，而非外层 iframe 元素。即使在父窗口注册了 pointermove/pointerup，当鼠标在 iframe 上方时事件仍被 iframe 吞掉。
- **根因**：iframe 是特殊元素，用户点击 iframe 时，浏览器将事件路由到 iframe 内部文档，而不是触发 iframe 外层元素上的 pointer 事件。因此在 iframe 元素上监听 pointerdown 也不可行。
- **v3 解决方案**（参照已在酒馆成功运行的悬浮球实现）：
  1. 在 iframe 内部 ball 元素上监听 `pointerdown`（内部文档可以正常接收）。
  2. `pointerdown` 触发后，立即设置 `iframeEl.style.pointerEvents = 'none'`，使后续鼠标事件穿透 iframe 到达父页面。
  3. 在 `parentWin` 上监听 `pointermove` / `pointerup`，事件链完全在父页面执行。
  4. `pointerup` 时恢复 `iframeEl.style.pointerEvents = 'auto'`。
- **额外改进**：
  - iframe 折叠态添加 `border-radius: 25px` 圆角裁剪。
  - 合并 `clampBallPosition` / `clampPanelPosition` 为统一的 `clampPos` 函数。
  - 外部点击事件从 `mousedown` 改为 `pointerdown`（统一事件类型）。
- **验证结果**：
  - webpack build:dev 全部 `compiled successfully`。
  - 程序化交互验证通过：拖拽正确移动位置、点击正确展开面板、关闭按钮正确恢复折叠。
  - `pointer-events` 在拖拽生命周期中正确切换（down→none, up→auto）。

## 2026-04-08T11:53:40+08:00

### 修复悬浮球拖拽"粘手" bug（v2 修复 — 不充分）

- **根因**：iframe 内 `pointerdown` 触发后，在父页面 `parentDoc` 上注册 `mousemove`/`mouseup` 监听器。跨 iframe 场景下
  `pointerdown` 的 `preventDefault()` 会阻止后续 mouse 兼容事件生成，且鼠标在 iframe 上方时 `mouseup`
  被 iframe 吞掉不冒泡到父文档，导致 `isDragging` 永远不被重置。
- **修复方案**（参考用户提供的已运行成品悬浮球代码）：
  1. 拖拽事件注册从 `parentDoc.addEventListener('mousemove'/​'mouseup')` 改为
     `parentWin.addEventListener('pointermove'/​'pointerup')`，统一 pointer 事件链。
  2. `onDragMove` 参数类型从 `MouseEvent` 改为 `PointerEvent`。
  3. 删除 `onTouchMove` 函数及其 `touchmove`/`touchend` 注册（pointer 事件已统一覆盖触摸设备）。
  4. `onDragEnd` 中的 `removeEventListener` 同步更新事件类型和目标。
- **改动范围**：仅 `src/alice-music-float/index.ts`，约 10 行变更。
- **构建结果**：`npm run build:dev` 全部 `compiled successfully`。

## 2026-04-08T11:40:34+08:00

### 修复 v1 pointer-events bug + 发现 v2 拖拽"粘手"新 bug

- **v1 bug 修复**：全屏 iframe 设置 `pointer-events: none` 导致所有事件被 iframe 元素拦截，内部子元素的
  `pointer-events: auto` 无效。
  - 修复方案：废弃全屏透明 iframe 覆盖层，改为 iframe 尺寸动态跟随内容（折叠态 50×50，展开态 280×380）。
  - iframe 不再设置 `pointer-events: none`，默认 `auto`，仅覆盖悬浮球/面板区域不遮挡酒馆页面。
  - 拖拽改为 iframe 内 pointerdown 触发后，在父页面 `parentDoc`
    上监听 mousemove/mouseup（解决鼠标超出 iframe 范围问题）。
- **v2 新 bug 发现**：实测拖拽交互"粘手"
  — 点击悬浮球后球持续跟随鼠标不释放，不是按住拖动而是点一下就粘上。松开左键球不停止，无法展开面板。
  - 推测根因：iframe 内 pointerdown 与父页面 mouseup 之间的事件传递/坐标系不一致，导致 mouseup 未被正确捕获或 isDragging 未重置。
  - 状态：未修复，记录到 SESSION_STATE bug 记录，下次会话处理。
- 已更新 `docs/SESSION_STATE.md`：记录 bug 详情和下一步修复方向。

## 2026-04-08T11:30:00+08:00

### 悬浮球最小骨架：从零实现折叠/展开/拖拽/设置页切换

- 新建 `src/alice-music-float/index.ts`，从零实现悬浮球音乐播放器最小骨架。
- 技术方案：
  - 脚本项目，通过 `createScriptIdIframe`
    创建全屏透明 iframe（`pointer-events: none`）挂载到酒馆页面 body，实现样式隔离。
  - iframe 内强制注入 Font Awesome 6.5.1 CDN，确保 regular/solid 图标可用。
  - 折叠态：50px 圆形悬浮球，渐变背景，图标 `fa-regular fa-music`，初始定位右下角。
  - 拖拽：Pointer 事件链（pointerdown/move/up/cancel），3px 阈值区分点击与拖拽，`setPointerCapture`
    确保拖拽不丢失，视口边界钳制。
  - 展开态：280×380px 面板，深色渐变背景，含顶部栏（齿轮 `fa-regular fa-gear` + 关闭
    `fa-solid fa-xmark`）、唱片区、歌曲信息占位、播放控制按钮（上/播放/下）。
  - 设置页：绝对定位覆盖面板，含返回按钮，播放模式与主题设置占位。
  - 折叠触发：关闭按钮点击 + 面板外部点击。
  - 窗口 resize 时自动钳制位置。
  - 卸载时 `pagehide` 清理 iframe。
- 构建产物：`dist/alice-music-float/index.js`，webpack build:dev 通过。

## 2026-04-08T10:53:56+08:00

### 全面重置：清除旧代码，UI 决策改为可移动悬浮球，准备重新开发

- 按用户决策终止所有前期实现，进行全面重置以重新开发。
- 已修改 `docs/DECISIONS.md`：
  - UI 设计决策从"悬浮窗双形态"改为"可移动悬浮球设计"。
  - 折叠态定义为圆形可拖拽小球，展开态为完整播放器面板。
  - 清理旧的图标兼容性补充决策、重启开发决策等历史条目，合并为精简版拖拽交互决策与运行环境决策。
- 已删除所有代码与构建产物：
  - `src/alice-music-float/index.ts`
  - `dist/alice-music-float/index.js`
- 已重置 `docs/SESSION_STATE.md`：
  - 清空 InProgress 与 Verification。
  - Done 保留已确定的设计决策与规范（图标、数据源、布局、MVU 等）。
  - NextStep 设定为从零开发悬浮球骨架。
- 当前仓库仅保留三文档作为重新开发的唯一依据。
