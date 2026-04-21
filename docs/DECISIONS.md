# DECISIONS

## 技术栈与运行环境约束

1. 项目形态为 SillyTavern 内运行的 JS 扩展脚本。
2. 功能核心为内嵌音乐播放器，不迁移为独立站点或独立后端服务。
3. 实现需同时适配主流浏览器桌面端与手机端交互。
4. `dist/*/index.js` 构建产物依赖酒馆助手脚本运行时（如 `getScriptId`、`eventOn`
   等全局能力），必须通过 JS-Slash-Runner 脚本树中的 `import` 执行，不可作为普通页面 `<script>` 直接注入。

## UI 设计决策

1. 采用可移动悬浮球设计，双形态切换：
   - 折叠态（悬浮球）：屏幕边缘圆形小球，可自由拖拽移动到任意位置。
   - 展开态：完整播放器面板。
2. 悬浮球必须可拖拽定位，禁止固定在单一位置。拖拽结束后悬浮球停留在释放位置，不自动吸附边缘。
3. 展开态包含两页：
   - 主页面：歌曲信息、播放控制、进度条等。
   - 设置页面包含以下设置项：
     - 播放模式切换：离线播放 / 在线搜索播放（切换开关或按钮）。
     - 主题切换：预设两套配色方案，点击按钮切换（具体配色待后续美化阶段定义，当前先占位 UI 元素）。
     - 在线数据源状态：显示当前 API 连接状态（仅在线模式下可见）。
4. 页面切换规则：
   - 主页面点击齿轮图标（`fa-regular fa-gear`，左上角）进入设置页面。
   - 设置页面通过返回按钮回到主页面。
5. 折叠/展开规则：
   - 点击悬浮球进入展开态。
   - 展开态顶部左上角为齿轮设置按钮（`fa-regular fa-gear`），右上角为关闭按钮（`fa-solid fa-xmark`）。
   - 点击右上角关闭按钮（`fa-solid fa-xmark`）后，立即收起为悬浮球（折叠态图标为 `fa-regular fa-music`）。
   - 点击外部区域也可折叠回悬浮球。

## UI 图标规范

项目使用 Font Awesome 图标库。不依赖 SillyTavern 已有的 Font Awesome 样式。在悬浮窗 iframe 内强制注入
`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`，确保 regular 和 solid 两种风格均可用。

各交互元素的图标类名映射：

1. 折叠态按钮图标：`fa-regular fa-music`
   - 折叠态悬浮窗显示为音乐图标小按钮。
2. 设置按钮（展开态左上角）：自定义 SVG 齿轮图标
   - 原汉堡菜单（三横线）设计废弃，原 `fa-regular fa-gear` 已替换为用户提供的自定义 SVG（24x24 viewBox，
     `fill="currentColor"`），CSS 类 `.settings-icon`（18x18px）。
   - 点击进入设置页面。
3. 关闭按钮（展开态右上角）：`fa-solid fa-xmark`
   - 点击后收起为折叠态。
   - 使用免费版 `fa-solid fa-xmark`，不使用 `fa-light fa-circle-xmark`（Pro 版）。
4. 上一首：`fa-regular fa-backward-step`
5. 下一首：`fa-regular fa-forward-step`
6. 播放按钮：`fa-regular fa-play`
   - 点击后开始播放，图标切换为暂停。
7. 暂停按钮：`fa-regular fa-pause`
   - 点击后暂停播放，图标切换回播放。

播放/暂停为同一按钮位置，根据当前播放状态切换图标。

使用方式：在 HTML 中通过 `<i>` 标签加类名渲染图标，例如
`<i class="fa-regular fa-music"></i>`。不需要下载图标文件，类名即图标。

## 主界面布局

展开态主页面采用音乐播放器布局：

1. 顶部栏：
   - 左上角：齿轮设置按钮（`fa-regular fa-gear`）。
   - 右上角：关闭按钮（`fa-solid fa-xmark`）。
2. 中央区域：
   - 唱片样式封面展示区（圆形旋转唱片视觉效果）。
   - 播放时唱片旋转，暂停时停止旋转。
   - 在线模式下如搜索结果包含封面图则显示封面，否则显示默认唱片图案。
3. 歌曲信息区：
   - 歌曲名称。
   - 歌手名（如有）。
   - 当前阶段标识（离线模式下显示当前剧情阶段名）。
   - 音源标识（在线模式下显示来源：网易云 / QQ音乐）。
4. 进度条：
   - 显示播放进度。
   - 可拖动调整播放位置。
5. 控制按钮区（底部）：
   - 上一首（`fa-regular fa-backward-step`）。
   - 播放/暂停（`fa-regular fa-play` / `fa-regular fa-pause`，切换显示）。
   - 下一首（`fa-regular fa-forward-step`）。

## 播放模式设计决策

1. 默认模式为离线播放。
2. 离线播放内置 4 首歌曲 URL（硬编码或配置文件）。
3. 在线搜索播放作为补充能力，用于扩展曲库：
   - 在播放器内搜索页面输入歌曲名。
   - 前端直接调用第三方聚合 API 搜索。
   - 对返回结果进行音频可用性校验。
   - 展示通过校验的结果列表供用户选择并播放。

## 在线音乐数据源

### 数据源

`api.vkeys.cn`
为第三方音乐聚合服务（全称"落月API"），该服务将网易云音乐和 QQ 音乐的搜索、取播放地址等接口统一封装为标准 HTTP
API。前端可直接 `fetch` 调用，该服务允许跨域访问（CORS），无需本项目搭建服务器端代理。

### 服务来源与维护者

- **全称**：落月API（API-V3）
- **维护者**：开发者"落月"（GitHub: [luoyue712](https://github.com/luoyue712)，QQ: 1569097443）和"小杰"（QQ:
  2772655946），2024年6月起合作开发。
- **官方文档**：[doc.vkeys.cn](https://doc.vkeys.cn)
- **文档仓库**：[github.com/lvluoyue/api-doc](https://github.com/lvluoyue/api-doc)
- **后端技术栈**：PHP 8.5 + webman 框架（基于 workerman 协程）+ Swoole 事件循环 + Redis 缓存 + 连接池
- **主域名**：`api.vkeys.cn`（生产环境）
- **备用域名**：`api.epdd.cn`（测试/故障转移，可作为 fallback）
- **QPS 限制**：暂无
- **数据缓存**：5 分钟 ~ 1 天（重复请求延长缓存，最长不超过1天）
- **认证机制**：无（无需 API Key / Token，直接裸调）
- **收费策略**：当前完全免费，文档中未提及任何收费计划
- **使用条款**：文档中无任何使用条款 / ToS / 隐私政策
- **性质**：个人开发者维护的免费非官方聚合 API，通过逆向/代理方式封装音乐平台接口
- **已知采用者**：Koishi 机器人插件（music-link-vincentzyu-fork）、小智 AI 音乐播放、VoiceHub 等

### 版权与法律风险评估

1. **本项目代码层面**：无版权问题，播放器 UI 和调用逻辑为原创代码。
2. **音乐内容层面**：通过非官方 API 获取音频 URL 并播放，属于间接使用未经授权的音乐资源，存在灰色地带。
3. **实际风险**：个人/小范围使用、不商用、不公开大规模分发的前提下，被追究的可能性极低。
4. **服务可靠性风险**：个人项目无 SLA，可能随时下线/限流/收费，但有备用域名可做 fallback。

### 架构

前端直连，无需服务器端代理。请求链路：用户输入关键词 -> 前端 `fetch` -> `api.vkeys.cn` -> 返回 JSON -> 前端解析展示。

### API 端点

1. 网易云搜索：
   - `GET https://api.vkeys.cn/v2/music/netease?word={关键词}`
   - 返回格式：`{ data: [{ id, song/name/title, singer/artist, cover, ... }] }`
2. 网易云取播放地址：
   - `GET https://api.vkeys.cn/v2/music/netease?id={歌曲ID}`
   - 返回格式：`{ data: { url: "可播放音频地址" } }`
3. QQ 音乐搜索：
   - `GET https://api.vkeys.cn/v2/music/tencent?word={关键词}`
   - 返回格式：`{ data: [{ id, song/name/title, singer/artist, cover, grp: [...], ... }] }`
   - `grp` 字段为分组/翻唱版本列表，每项结构同主结果。
4. QQ 音乐取播放地址：
   - `GET https://api.vkeys.cn/v2/music/tencent?id={歌曲ID}`
   - 返回格式：`{ data: { url: "可播放音频地址" } }`

### 搜索流程

1. 用户在播放器搜索框输入关键词。
2. 前端创建 `AbortController` 管理请求生命周期（用户发起新搜索时取消上一次未完成请求）。
3. 先发网易云搜索请求，从返回的 `data` 数组中取前 5 条结果。
4. 对每条结果，用其 `id` 请求网易云播放地址端点，获取 `data.url`。
5. 对返回的 `url` 执行音频可用性检测：
   - 创建临时 `Audio` 对象。
   - 设置 `src` 为该 `url`，调用 `load()`。
   - 监听 `onloadedmetadata` 事件，触发则判定可播。
   - 超时 3 秒或触发 `onerror` 则判定不可播。
   - 检测完毕后释放临时 `Audio` 对象。
6. 通过检测的结果加入展示列表（网易云最多取 3 条可用结果）。
7. 网易云搜索完成后，再发 QQ 音乐搜索请求，执行同样流程（QQ 音乐最多取 3 条可用结果）。
8. 合并两个平台可用结果，展示给用户。

### 搜索结果标准化格式

每条搜索结果统一为以下结构：

```json
{
  "title": "string",
  "artist": "string",
  "url": "string",
  "cover": "string",
  "source": "网易云 | QQ音乐"
}
```

字段说明：

- `title`：歌曲名（取自 `song` 或 `name` 或 `title` 字段）。
- `artist`：歌手名（取自 `singer` 或 `artist` 字段）。
- `url`：已通过可用性检测的播放地址。
- `cover`：封面图 URL（可能为空字符串）。
- `source`：来源标识（`网易云` 或 `QQ音乐`）。

### 播放方式

用户点击搜索结果后：

1. 将该结果包装为标准歌曲对象。
2. 加入播放列表。
3. 使用 HTML5 Audio（`new Audio(url)`）播放。

### 风险说明

- `api.vkeys.cn` 为第三方服务，可用性不受本项目控制。
- 如该服务不可用，在线搜索功能将失效，但不影响离线播放功能。
- 部分歌曲的播放 URL 存在时效性，过期后需重新搜索获取。

## MVU 监测机制决策

1. 监测 MVU 变量路径：`世界.当前剧情阶段`。
2. 变量可取值限定为四个阶段：`初识期`、`软化期`、`失去期`、`热恋期`。
3. 在离线模式下，当该变量值变化时，自动切换并播放对应阶段歌曲。

## 阶段与歌曲映射

- `初识期` -> 17 (椎名林檎) -> `https://cdn.jsdelivr.net/gh/baiqigo/music/17.flac`
- `软化期` -> 春风吹 (方大同) -> `https://cdn.jsdelivr.net/gh/baiqigo/music/cunfc.flac`
- `失去期` -> I Really Want to Stay at Your House -> `https://cdn.jsdelivr.net/gh/baiqigo/music/sbpk.mp3`
- `热恋期` -> 打上花火 (DAOKO × 米津玄师) -> `https://cdn.jsdelivr.net/gh/baiqigo/music/biaobai.mp3`

## 事件推进链与阶段跃迁

1. 上户口事件（触发阶段：初识期）
   - 触发条件：`好感度 >= 50`
   - 收尾更新：`世界.事件记录.上户口 = true`，`世界.当前剧情阶段 = 软化期`
2. 被抓走事件（触发阶段：软化期）
   - 触发条件：`好感度 >= 75` 且 `世界.事件记录.上户口 == true`
   - 收尾更新：`世界.事件记录.被抓走 = true`，`世界.当前剧情阶段 = 失去期`
3. 烟花下的告白事件（触发阶段：失去期）
   - 触发条件：`好感度 >= 95` 且 `世界.事件记录.被救回 == true`
   - 收尾更新：`世界.事件记录.烟花告白 = true`，`世界.当前剧情阶段 = 热恋期`

## MVU 更新规则（归纳）

1. `世界.当前剧情阶段` 只能由明确大事件更新，日常互动不得更新。
2. 阶段更新唯一条件：
   - 更新到 `软化期`：仅上户口事件完整完成后。
   - 更新到 `失去期`：仅被抓走事件完整完成后。
   - 更新到 `热恋期`：必须在 `失去期` 且 `被救回==true` 且 `好感度>=95` 且烟花告白事件完整完成。
3. `世界.事件记录` 的布尔变量（`上户口`、`被抓走`、`被救回`、`烟花告白`）一旦为 `true` 不可回退为 `false`。
4. `被救回` 事件为玩家自由推动事件：无固定流程脚本，由叙事实际情况判定。
5. 爱丽丝好感度在失去期规则：
   - `被救回==false` 时锁定不变。
   - `被救回==true` 后恢复正常增减规则。

## Schema 与初始化约束（归纳）

1. `世界.当前剧情阶段` 使用枚举：`'初识期' | '软化期' | '失去期' | '热恋期'`，默认 `初识期`。
2. `世界.事件记录` 包含：`上户口`、`被抓走`、`被救回`、`烟花告白`，默认均为 `false`。
3. 初始变量（关键项）：
   - 世界：`时间=夜晚`，`天气=暴雨`，`地点=昏暗的街道积水处`，`当前剧情阶段=初识期`
   - 结月：`当前余额=30000`
   - 爱丽丝：`好感度=0`，`理智值=40`

## 拖拽交互决策

1. 悬浮球拖拽交互以 Pointer 事件链为主实现（`pointerdown/move/up/cancel`）。
2. 拖拽过程中与窗口尺寸变化后，悬浮球位置必须做视口边界钳制，确保元素不离开可视区域。
3. 拖拽与点击通过位移阈值（3px）区分：超过阈值判定为拖拽，未超过判定为点击并触发展开。
4. iframe 拖拽采用 pointer-events 穿透方案（两阶段策略）：
   - 不在 iframe 外层元素上监听 pointerdown（浏览器会将事件路由到 iframe 内部文档）。
   - pointerdown 在 iframe 内部 ball 元素触发，**不立即**设置 pointer-events:none。
   - 先在 iframe 内部监听 pointermove/pointerup，判断是点击还是拖拽：
     - 移动 <= 3px + pointerup → 单击 → 展开面板。
     - 移动 > 3px → 进入拖拽模式：设置 iframe
       `pointer-events: none`，将事件监听转移到父窗口 pointermove/pointerup，悬浮球跟随移动。
   - pointerup 时恢复 `pointer-events: auto`，悬浮球停留在释放位置。

## 拖拽实现方案决策（v4.1 更新）

1. 废弃 v3/v4 的 `pointer-events: none` 穿透方案和父窗口事件监听方案。原因：`releasePointerCapture`
   后事件链断裂，浏览器不再向原 capture 目标分发事件，且 `pointer-events: none` 生效时机不可控。
2. 采用 `setPointerCapture`
   全程方案：整条拖拽事件链（pointerdown/move/up）全在 iframe 内部 ball 元素上完成。`setPointerCapture`
   保证鼠标移出 iframe 范围后，pointermove/pointerup 仍路由到 ball。
3. 不再需要切换 `iframeEl.style.pointerEvents`，不再需要 `parentWin.addEventListener`。

## 开发阶段划分决策

1. 功能开发与 UI 美化分离：先完成所有功能实现，最后统一进行 UI 美化。
2. UI 美化阶段由用户亲自指导，不由 AI 自主决定配色/动画/布局细节。
3. 功能实现阶段的 UI 仅需保证可交互、信息正确展示即可，不追求视觉效果。

## 面板页面架构决策

1. 主界面（唱片/歌曲信息/进度条/控制按钮）始终显示，不因模式切换或页面跳转而隐藏。
2. 搜索页、歌曲列表页、设置页为叠加层（`.overlay-page`），覆盖在主界面之上，互斥显示。
3. 顶部栏按钮布局：左侧（齿轮设置 + 汉堡歌曲列表），右侧（放大镜搜索 + X 关闭）。
4. 搜索功能为独立叠加页，搜索到歌曲后加入播放列表，回到主界面播放。不在主界面内嵌搜索。
5. 歌曲列表通过汉堡按钮（`fa-solid fa-bars`，齿轮右边）打开。

## 离线/在线模式 UI 隔离决策

1. 搜索按钮（放大镜）仅在线模式可见，离线模式隐藏。离线模式下用户无法触发在线搜索。
2. 歌曲列表页根据当前模式显示不同数据：
   - 离线模式：显示离线曲库（4首剧情BGM），当前播放高亮，点击切歌。
   - 在线模式：显示在线播放列表（用户通过搜索添加的歌曲）。
3. 两套列表数据完全独立，模式切换时列表内容跟着切换。
4. 在线播放列表支持用户管理：每首歌右侧有 X 按钮可移除，左侧有拖拽手柄可排序。
5. 离线曲库列表不支持删除和排序（固定4首剧情BGM）。

## 循环模式决策

1. 播放器支持三种循环模式，通过控制按钮区左侧的循环按钮单击循环切换：
   - 列表循环（`repeat-all`，默认）：播放完最后一首自动回到第一首。图标 `fa-solid fa-repeat`，高亮态。
   - 单曲循环（`repeat-one`）：播放结束后重新播放当前歌曲。图标 `fa-solid fa-repeat` + 角标"1"，高亮态。
   - 顺序播放（`sequential`）：播放到列表末尾后停止。图标 `fa-solid fa-right-long`，暗淡态。
2. 循环模式仅影响歌曲自然播放结束（ended）的行为。手动点击上一首/下一首始终循环跳转。
3. 循环模式同时影响离线播放和在线播放。

## 收藏功能决策

1. 收藏数据通过 `localStorage`（key: `alice-music-favorites`）持久化，跨会话保留。
2. 在线播放列表（播放队列）不持久化：因在线歌曲 URL 有时效性，过期需重新搜索获取。
3. 主界面控制按钮区右侧为收藏爱心按钮：空心 `fa-regular fa-heart`（未收藏）↔ 实心红色 `fa-solid fa-heart`（已收藏）。
4. 仅在线播放模式下爱心按钮可点击，离线模式下不响应。
5. 顶部栏左侧新增收藏列表入口按钮（`fa-regular fa-heart`），打开收藏列表叠加页。
6. 收藏列表叠加页与搜索页/播放列表页/设置页互斥显示。
7. 收藏列表中点击歌曲 → 自动加入播放队列并播放 → 关闭收藏页。
8. 收藏列表中每首歌右侧有 X 按钮可取消收藏。

## 控制按钮区布局决策

1. 控制按钮区从 3 个按钮扩展为 5 个按钮，布局为： `[循环模式] [上一首] [播放/暂停] [下一首] [收藏]`
2. 循环模式和收藏为侧按钮（`.ctrl-side-btn`），16px 字号，比中间三个按钮小。

## 收藏数据持久化决策（更新）

1. 收藏数据结构从 `SearchResult`（含 url/cover）改为 `FavoriteItem`（仅 title/artist/source）。
2. 原因：在线歌曲 URL 有时效性（API 返回的播放地址可能在数小时后过期），持久化 URL 会导致过期后播放静默失败。
3. 点击收藏歌曲时，自动用 `title + artist` 作为关键词搜索对应平台（网易云/QQ音乐），获取最新 URL 后播放。
4. 搜索过程中显示 toast "正在获取播放链接..."，失败显示 "链接获取失败，请手动搜索"。
5. 向后兼容：加载旧格式 localStorage 数据时自动提取 3 个字段，丢弃过时的 url/cover。

## 在线播放列表持久化决策

1. 在线播放列表（播放队列）不持久化，页面刷新后清空。
2. 原因同收藏决策：URL 有时效性，持久化后大概率过期。
3. URL 过期播放失败时显示 toast 提示"链接已过期: {title}"。

## 音量控制决策（更新）

1. ~~音量控制位于进度条下方、控制按钮上方（水平滑块）。~~ 已废弃。
2. 音量按钮移入控制按钮区最右侧（`.controls` 内，收藏按钮后面），作为 `.volume-wrap` 容器。
3. 点击音量按钮交互逻辑：
   - 弹窗关闭时点击 → 打开竖向音量滑块弹窗（向上弹出）。
   - 弹窗打开时点击 → 静音/取消静音切换（记忆静音前音量）。
   - 点击面板其他区域 → 关闭弹窗。
4. 竖向滑块：底部=音量0，顶部=音量1，渐变填充 + 白色圆点，pointer 事件拖拽。
5. 图标三态自动切换：`fa-volume-high`（≥0.5）、`fa-volume-low`（>0 且 <0.5）、`fa-volume-xmark`（=0）。
6. 弹窗样式：32px 宽、110px 高、圆角 16px、毛玻璃背景、弹出动画。

## 播放失败用户反馈决策

1. 播放失败（Audio error 事件）通过胶囊 Toast 提示用户，不使用模态弹窗。
2. Toast 样式：圆角胶囊（20px border-radius），面板底部居中，2.5 秒自动消失。
3. 离线播放出错：红色 toast "播放失败: {title}"。
4. 在线播放出错：红色 toast "链接已过期: {title}"。
5. 信息类 toast（如"正在获取播放链接..."）：蓝色。

## 在线封面图显示决策

1. 在线播放歌曲时，如有封面图 URL，在唱片 `.disc` 内部通过 `<img>` 标签显示。
2. 禁止使用 CSS `background-image` 方案：在 `srcdoc` iframe 中，CSS background 对 QQ 音乐 CDN 请求存在
   `ERR_HTTP2_PROTOCOL_ERROR` 间歇性失败，`<img>` 标签更可靠。
3. 封面图 `<img>` 使用 `position: absolute; object-fit: cover; border-radius: 50%` 填满圆形唱片。
4. 切回离线模式时隐藏封面 img 并恢复默认音乐图标。

## 运行环境与导入方式决策

1. JS-Slash-Runner 导入脚本格式固定为： `import 'http://127.0.0.1:5500/dist/alice-music-float/index.js';`
2. 所有会话以三文档状态为唯一任务来源。

## 持久化策略决策

1. 音量值通过 `localStorage`（key: `alice-music-volume`）持久化，页面刷新后恢复上次音量。
2. 悬浮球位置通过 `localStorage`（key: `alice-music-ball-pos`）持久化为 `{x, y}`
   JSON，页面刷新后恢复上次位置（含视口边界钳制）。
3. 收藏数据通过 `localStorage`（key: `alice-music-favorites`）持久化（已有决策）。
4. 在线播放列表不持久化（已有决策）。

## 批量操作决策

1. 播放列表和收藏列表支持批量选择删除，不支持一键清空（防误触）。
2. 批量选择 UI：列表页顶部全选复选框 + "全选" 标签 + "删除选中" 按钮；每个列表项前有独立复选框。
3. 全选复选框支持三态：全选（checked）、部分选（indeterminate）、全不选（unchecked）。
4. 批量删除从数组末尾向前 splice，避免索引偏移。

## 拖拽排序实现决策

1. 播放列表和收藏列表的拖拽排序使用 Pointer 事件（`pointerdown/move/up` + `setPointerCapture`），不使用 HTML5 Drag and
   Drop API。
2. 原因：HTML5 Drag and Drop 在移动端触摸设备上不工作（touch 设备不触发 dragstart 等事件）。
3. 拖拽触发区域为整个列表项条目（`.playlist-item`），不再限于序号区域。
4. 通过 5px 位移阈值区分点击（触发播放）和拖拽（触发排序）。
5. 拖拽结束后通过 `suppressClick` + capture 阶段 click 拦截，防止触发播放。
6. `pointerdown` 中排除复选框（`.playlist-item-checkbox`）和删除按钮（`.playlist-item-remove`），不影响勾选/删除操作。

## MediaSession API 决策

1. 通过 `navigator.mediaSession` 设置系统级媒体控制（通知栏/锁屏歌曲信息）。
2. 支持 play/pause/previoustrack/nexttrack 四个 action handler，绑定到对应按钮的 click 事件。
3. metadata 包含 title、artist、artwork（在线播放有封面图时设置）。
4. 如浏览器不支持 `mediaSession`（检查 `'mediaSession' in navigator`），静默跳过。

## 控制按钮图标决策（更新）

1. 悬浮球、上一首、下一首、播放、暂停按钮图标从 Font Awesome `<i>` 标签改为内联 SVG（FA v7 官方 path）。
2. 暂停图标使用镂空双竖条效果（`fill="none" stroke="white" stroke-width="48"`），而非实心填充。
3. 播放/暂停按钮内放两个 `<svg>`（`#icon-play` / `#icon-pause`），通过 `hidden` class 互斥显示，不再通过 `className`
   赋值切换。

## 控制按钮区布局决策（更新）

1. 控制按钮区保持 5 个按钮对称布局：`[循环模式] [上一首] [播放/暂停] [下一首] [收藏]`，播放键居中。
2. ~~音量按钮在控制栏内。~~ 已移出，改为进度条左侧独立位置。
3. 控制按钮区 gap 保持 24px。

## 音量按钮位置决策

1. 音量按钮位于进度条左侧、时间标签上方（`.progress-volume-area` 容器）。
2. 音量按钮与进度条在同一行排列（flex，align-items: flex-end）。
3. 不在控制栏内放置音量按钮，避免破坏 5 按钮对称和播放键居中。

## 唱片区视觉决策

1. 唱片尺寸为 140px（从 120px 增大），利用音量条移除后腾出的垂直空间。
2. 唱片背景使用多层 `radial-gradient` 模拟黑胶环槽纹理（4 条同心细线 + 中心高光 + 底色渐变）。
3. 不使用 `::after` 伪元素中心孔（在 140px 尺寸下不明显，且破坏整体构图）。
4. 唱片 `box-shadow` 包含外部微光 + `inset` 内阴影，增强立体感。

## 离线歌曲信息显示决策

1. 离线播放歌曲信息显示格式与在线模式统一：标题行显示歌曲名，副标题行显示 `歌手 · 阶段名`。
2. 若歌手字段为空，副标题行仅显示阶段名。
3. 离线歌曲列表页同样显示歌名 + `歌手 · 阶段名`（而非单独显示阶段名）。
4. `OFFLINE_TRACKS` 数据包含完整歌曲元数据（title/artist/url/stage），不再使用阶段名作为 title。

## 设置按钮图标决策（更新）

1. 设置按钮 SVG 从 24x24 viewBox 替换为 FA v7 官方 gear SVG（viewBox
   `0 0 640 640`），与悬浮球/上一首/下一首图标风格统一。

## 离线模式播放结束行为决策

1. 离线模式下歌曲播放结束后不自动切到下一首（`onEnded` 始终返回 `true`）。
2. 原因：离线曲库是按 MVU 剧情阶段触发的，每个阶段固定一首 BGM，不应自动播放其他阶段的歌曲。
3. 切歌方式仅限：用户手动点击上/下一首按钮，或 MVU 变量 `世界.当前剧情阶段` 发生变化时自动调用 `playByStage()`。
4. 在线模式不受影响，仍受 `repeatMode`（列表循环/单曲循环/顺序播放）控制。

## 唱片区图标决策

1. 移除唱片中间的 `.disc-icon`（`<i class="fa-regular fa-music">`）元素。
2. 原因：在 srcdoc iframe 中 Font Awesome 偶尔加载失败，导致显示方块X（乱码图标），影响视觉。
3. 离线模式下唱片仅显示黑胶纹理背景（`radial-gradient`），不显示任何图标。
4. 在线模式下有封面图时通过 `<img id="disc-cover">` 显示，无封面时同样仅显示黑胶纹理。

## 主题切换决策

1. 设置页主题切换支持三个选项：默认、月光白、樱花粉。
2. 交互方式：点击循环切换（与播放模式切换交互一致）。
3. 主题通过在 `#float-panel`
   元素上添加/移除 CSS 类实现：`theme-moonlight`（月光白）、`theme-sakura`（樱花粉）、无额外类（默认）。
4. 主题选择通过 `localStorage`（key: `alice-music-theme`）持久化，刷新后恢复。
5. 具体配色方案待后续 UI 美化阶段由用户指导定义，当前为 CSS 占位。
6. 月光白主题 CSS 仅隐藏 `.panel-header` 和 `.panel-body`，不隐藏 `.overlay-page` 和
   `.toast-container`，确保设置页/播放列表/搜索页/toast 在任何主题下均可用。
7. 月光白卡片设置按钮位于左上角（`.ml-header` 区域），与默认主题设置按钮位置一致。

## UI 美化安全约束

1. UI 美化阶段仅允许修改 CSS 样式、HTML 结构布局、主题配色。
2. 禁止改动以下核心功能代码（JS 逻辑）：
   - `OfflinePlayer` 类及其所有方法（播放/暂停/切歌/ended 事件链）。
   - `OFFLINE_TRACKS` 四阶段离线歌曲映射数据。
   - MVU 变量监测逻辑（`waitGlobalInitialized`、`eventOn(VARIABLE_UPDATE_ENDED)`、`playByStage`）。
   - 在线搜索播放逻辑（`doSearch`、`searchPlatform`、`checkAudioPlayable`、`addToPlaylistAndPlay`、`playOnlineTrack`）。
   - 在线播放列表管理（`onlinePlaylist`、`removeFromPlaylist`、拖拽排序 splice 逻辑）。
   - 收藏功能（`favorites`、`loadFavorites`、`saveFavorites`、`resolveAndPlayFavorite`）。
   - 循环模式状态机（`repeatMode` 三态切换 + ended 行为控制）。
   - 悬浮球拖拽交互（Pointer 事件链 + setPointerCapture + 3px 阈值）。
   - 进度条拖拽 seek 逻辑。
   - 音量控制逻辑（静音切换、localStorage 持久化）。
   - 悬浮球位置持久化逻辑。
   - MediaSession API 集成。
   - Toast 提示系统（`showToast`）。
   - 主题切换框架（`applyTheme`、`enterMoonlightLayout`、`exitMoonlightLayout`）。
3. 功能代码备份位于 `backup_20260411_0205/index.ts`，如 UI 美化导致功能异常可回滚对比。

## 收藏按钮图标决策

1. 收藏列表入口按钮（顶部栏 `btn-fav-list`）和收藏按钮（控制栏 `btn-fav`）从 Font Awesome `<i>`
   标签改为用户提供的 Uiverse.io SVG 爱心路径（`viewBox="0 0 17.503 15.625"`）。
2. 收藏按钮使用双 SVG 互斥方案（与播放/暂停一致）：`#icon-heart-empty`（空心，未收藏）和
   `#icon-heart-filled`（实心，已收藏），通过 `hidden` 类切换。
3. SVG 使用 `fill="currentColor"` 继承按钮颜色，已收藏态额外施加红色（`#f87171`）+ `drop-shadow` 发光。
4. CSS 类名 `.heart-svg-icon`（16x16px），统一两处爱心 SVG 的尺寸和样式。

## 月光白转场动画决策

1. 点击切换到月光白时触发流星坠落式转场动画，从左上角到右下角对角线扫过面板。
2. 月亮使用单层弯月（`moon-body` + `mask-image` 挖月形），不使用双层叠加（阴影层+主体层会导致边缘凸出）。
3. 月亮终点停留在面板右下角**内侧**（不超出面板边界），动画结束后与星星一起淡出消散。
4. 白色遮罩使用对角线 `linear-gradient(135deg)` + `mask-image` 实现"刷白"效果，遮罩推进进度与月亮位置同步。
5. 星星使用用户提供的 clip-path 四角内凹星形（`M 50 0 C 70 30...`），6-8 颗随机散布，各自有独立延迟产生拖尾层次感。
6. 月亮和星星均带有流星拖尾元素（`.moon-trail` / `.star-trail`），方向为 135° 对角线。
7. 动画时长 1.8 秒，缓动曲线为快冲+轻微回弹。
8. 全程使用 `requestAnimationFrame` 驱动（非 CSS keyframes），确保月亮位置、遮罩进度、星星位置三者精确同步。
9. `localStorage` 恢复月光白时跳过转场动画（`skipMoonTransition` 标志位），仅用户点击切换时触发。
10. 动画层 `z-index: 9999`，`pointer-events: none`，不干扰用户交互。

## 叠加页（overlay-page）主题配色决策

1. 叠加页（设置页/搜索页/播放列表/收藏列表）的背景色和文字色跟随当前主题。
2. 默认主题：深蓝渐变背景（`#1a1a2e` → `#0f3460`），白色文字。
3. 月光白主题：浅灰白渐变背景（`rgba(240,240,245)` → `rgba(210,215,230)`），深色文字（`rgba(40,40,50)`）。
4. 月光白下设置项（`.setting-item`）使用 `rgba(0,0,0,0.04)` 浅灰背景，文字颜色 `rgba(40,40,50,0.85)`。
5. 月光白下播放列表/收藏列表项文字为深色，active 态使用 `rgba(100,110,200,0.1)` 淡紫高亮。
6. 搜索框在月光白下使用浅灰背景、深色输入文字。
7. 月光白下搜索图标（`.search-icon`）、搜索按钮（`.search-btn`）、搜索提示（`.search-placeholder`）、搜索加载状态（`.search-loading`）、搜索结果标题/歌手均使用深灰色文字。
8. 月光白下歌曲列表序号（`.playlist-item-index`）使用深灰色，hover 加深。

## 月光白卡片收藏按钮决策

1. 月光白卡片底部栏收藏按钮（`#ml-btn-heart`）使用双 SVG 互斥方案（与默认主题一致）：`#ml-icon-heart-empty`（空心）和
   `#ml-icon-heart-filled`（实心）。
2. 收藏状态通过 `syncMlFavIcon()` 函数同步：检查默认主题 `btn-fav` 的 `fav-active` 类，切换月光白卡片心形图标。
3. 已收藏态实心心形使用红色（`#f87171`）。
4. `updateFavBtn()` 每次调用后自动触发 `syncMlFavIcon()`，`enterMoonlightLayout()` 初始化时也调用。

## 搜索性能优化决策

1. `searchPlatform()` 内部对多首候选歌曲的 URL 获取和音频可用性校验使用 `Promise.allSettled`
   并行执行，不再顺序逐条处理。
2. `doSearch()` 中网易云和 QQ 音乐两个平台的搜索使用 `Promise.all` 并行执行，不再先后顺序。
3. 并行化后移除了中间态"继续搜索QQ音乐..."提示（两平台同时进行，无阶段性区分）。
4. 搜索总耗时从 ~10 秒降至 ~3-5 秒。

## 主题切换决策（更新）

1. 樱花粉主题已移除，设置页主题切换仅保留两态：默认 ↔ 月光白。
2. `THEMES` 数组从 `['默认', '月光白', '樱花粉']` 缩减为 `['默认', '月光白']`。
3. 旧版 localStorage 中存储的 `'樱花粉'` 值不会命中 `THEMES.indexOf()`，自动回退到默认主题。

## 发布部署路径决策

1. JS-Slash-Runner 导入脚本格式更新为： `import 'https://testingcf.jsdelivr.net/gh/baiqigo/music@main/index.js';`
2. 构建产物 `dist/alice-music-float/index.js` 上传到 GitHub 仓库 `baiqigo/music` 的 `main` 分支根目录。
3. 通过 jsDelivr CDN（testingcf 节点）分发，无需本地 Live Server。

## Firefox 移动端兼容性决策

1. 转场动画时间源从 `performance.now()` 改为 `Date.now()`：Firefox 移动端 srcdoc iframe 中 `performance.now()`
   受 Fingerprinting Protection 影响，精度降至 ~100ms，导致 rAF 动画卡死。
2. 动画元素定位从 `style.left/top` 改为 `style.transform = translate()`：走 GPU 合成层，避免每帧触发 layout
   reflow，Firefox 移动端性能显著改善。
3. 动画元素添加 `will-change: transform, opacity` 提示浏览器预建合成层。
4. 淡出动画 keyframes 从 `transform: scale()` 改为 `filter: blur()` + `opacity`，避免覆盖 `translate()`
   定位导致元素跳位。
5. 主题切换添加双重防连点锁：`themeSwitching` 标志位（350ms 非动画切换锁）+
   `moonTransitionRunning`（动画期间锁），防止 Firefox 移动端快速点击导致多个转场动画叠加产生分屏。

## 在线搜索 API 失效与备选方案调研（2026-04-18）

### 当前 API 状态

1. `api.vkeys.cn`（落月 API V2 主域名）：2026-04-18 验证已超时不可用。
2. `api.epdd.cn`（落月 API 备用域名）：2026-04-18 验证连接被关闭不可用。
3. 在线搜索播放功能完全瘫痪，离线播放不受影响。
4. 可能原因：落月 API 升级至 V3，V2 端点 (`/v2/music/netease`、`/v2/music/tencent`) 已下线。需检查 `doc.vkeys.cn`
   文档确认 V3 端点格式。

### 调研的开源项目与 API 方案

以下为调研发现的可参考开源项目，按与本项目相关度排序：

| 项目                           | Stars | 语言         | 许可证   | 方案特点                                                                              |
| ------------------------------ | ----- | ------------ | -------- | ------------------------------------------------------------------------------------- |
| **metowolf/Meting**            | 2k    | JS (Node.js) | MIT      | 多平台音乐 API 框架，零外部依赖，内置加密算法，支持网易云/QQ/酷狗/酷我/百度，统一接口 |
| **UnblockNeteaseMusic/server** | 7.7k  | JS (Node.js) | LGPL-3.0 | 解锁网易云灰色歌曲，内置 QQ/酷狗/酷我/波点/咪咕/B站/YouTube 等多音源                  |
| **guohuiyuan/go-music-dl**     | 2.4k  | Go           | AGPL-3.0 | 11 平台聚合搜索下载（Web+CLI+桌面），核心库 `music-lib` 直连各平台官方 API            |
| **ELDment/Meting-Agent**       | 74    | JS           | MIT      | 基于 Meting 的 MCP Server / Skill 封装，支持网易云/QQ/酷狗/酷我                       |
| **injahow/meting-api**         | —     | —            | —        | Meting 的 RESTful API 封装，可自部署为 HTTP 服务                                      |

### 各平台官方 API 端点汇总（来自 music-lib 源码）

**网易云音乐**（需加密，前端直连困难）：

- 搜索：`http://music.163.com/api/linux/forward` → `api/cloudsearch/pc`（LinuxAPI 加密）
- 取播放地址：`http://music.163.com/weapi/song/enhance/player/url`（WeAPI 加密）
- 高品质下载：`https://interface3.music.163.com/eapi/song/enhance/player/url/v1`（EAPI 加密）

**QQ 音乐**（无加密，需 Referer，CORS 未知）：

- 搜索：`http://c.y.qq.com/soso/fcgi-bin/search_for_qq_cp?w={keyword}&format=json`（GET）
- 取播放地址：`https://u.y.qq.com/cgi-bin/musicu.fcg`（POST JSON，`music.vkey.GetVkey`）
- 歌曲详情：`https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg`（GET）

**酷狗音乐**（搜索无加密，播放地址需 MD5 签名）：

- 搜索：`http://songsearch.kugou.com/song_search_v2?keyword={keyword}&format=json`（GET）
- 取播放地址：`http://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash={hash}`（GET）
- 备用取地址：`https://trackercdn.kugou.com/i/v2/?hash={hash}&key={md5}`（GET，需 MD5 签名）

**酷我音乐**（需 CSRF token）：

- 搜索：`http://www.kuwo.cn/api/www/search/searchMusicBykeyWord`（GET，需 `csrf` header）

### 前端直连可行性评估

1. **网易云**：❌ 不可行。需 LinuxAPI/WeAPI/EAPI 三种加密算法，前端实现复杂且 CORS 被拦截。
2. **QQ 音乐**：⚠️ 需验证。搜索接口无加密，但 CORS 策略未知，可能需要代理。
3. **酷狗**：⚠️ 需验证。搜索无加密，播放地址需 MD5 签名（前端可实现），但 CORS 策略未知。
4. **聚合 API 服务**：✅ 最佳方案。找到可用的第三方聚合 API（如落月 V3、或自建 Meting API 服务）。

### 待确认事项

1. ~~落月 API V3 是否有新端点格式~~（已确认，见下方 V3 端点决策）。
2. `metowolf/Meting` 源码分析：评估加密算法前端移植可行性，或确认 `injahow/meting-api`
   自部署方案。备用方案，优先级降低。
3. QQ 音乐 / 酷狗官方接口的 CORS 策略（需浏览器实测）。备用方案，优先级降低。

## 落月 API V3 迁移决策（2026-04-21）

### V2/V3 状态更正

1. **V2 点歌 API 仍然可用**：`/v2/music/tencent?word=` 搜索 + `?id=`
   取播放地址均正常返回。上次超时是网络波动，非 API 下线。
2. **V2 分拆子接口已下线**：`/v2/music/tencent/search`、`/v2/music/tencent/url` 返回 404。
3. **V3 QQ 音乐接口已可用**（标记"开发中"，但实测稳定）。V3 网易云接口尚未上线。

### V3 端点格式（QQ 音乐）

**搜索**：

- `GET https://api.vkeys.cn/music/tencent/search/song?keyword={keyword}&page=1&limit=10`
- 返回 `data.list[]`，每项含 `songID`、`songMID`、`cover`、`singer`、`title`、`pay`、`interval`（秒数）、`bpm` 等。
- 成功 code 为 `0`（V2 为 `200`）。

**播放链接**：

- `GET https://api.vkeys.cn/music/tencent/song/link?id={songID}&quality={0-14}`
- 返回 `data.url`（播放地址）、`data.kbps`（码率）。
- `quality` 推荐值：`0`=试听(35kbps)、`6`=标准(128kbps)、`8`=HQ(320kbps)。付费歌曲用 `quality=0` 可获取试听。

### 迁移策略

1. QQ 音乐：代码从 V2 (`/v2/music/tencent?word=`/`?id=`) 切换到 V3
   (`/music/tencent/search/song`、`/music/tencent/song/link`)。
2. 网易云音乐：落月 V2 播放链接已失效（返回 500），切换到 Meting API
   Vercel 公共实例（`https://meting-api-omega.vercel.app/api`，CORS
   `*`，搜索结果自带 302→CDN 播放 URL）。源项目：[xizeyoupan/Meting-API](https://github.com/xizeyoupan/Meting-API)（archived）。如实例失效可 fork 后一键部署到 Vercel（零成本）。
3. 搜索结果字段映射需更新：V2 `id`→V3 `songID`，V2 `song`→V3 `title`，V2 `interval`(文本)→V3 `interval`(秒数)。
4. 成功判断条件需更新：V2 `code===200` → V3 `code===0`。
5. QQ 音乐 V3 播放链接空路径检测：`isValidUrl()` 检查 `new URL(u).pathname.length > 1`，过滤
   `http://ws.stream.qqmusic.qq.com/` 等无效 URL；策略为先 quality=0 再尝试 quality=6 升级。
6. 搜索结果双平台交替排列（interleave）：QQ第1→网易第1→QQ第2→网易第2→…确保两个平台最佳结果均在前列。
