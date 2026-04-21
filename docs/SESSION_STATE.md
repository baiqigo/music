# SESSION_STATE

Goal: 在 SillyTavern 中完成 JS 音乐播放器扩展的三项核心能力：可移动悬浮球 UI（折叠/展开、拖拽、主页/设置页切换）、离线与在线双模式播放、基于 MVU 变量
`世界.当前剧情阶段` 的自动切歌；并维护四阶段离线曲库映射。

InProgress: 无（V2→V3 迁移已完成，浏览器实测全部通过）

Done:

- 已完成月光白主题卡片背景、内容位置、布局替换工作，符合用户给出的 HTML 代码结构要求。

- 已归纳三条阶段推进事件：上户口（初识期->软化期）、被抓走（软化期->失去期）、烟花告白（失去期->热恋期）。
- 已归纳 MVU 变量更新规则、Schema 结构与初始化变量。
- 已写入失去期离线歌曲 URL：`https://cdn.jsdelivr.net/gh/baiqigo/music/17.flac`。
- 已确定 UI 图标规范（Font Awesome，7个图标类名映射）。
- 已确定在线音乐数据源方案（`api.vkeys.cn`"落月API"聚合服务，前端直连，无需服务器代理）。
- 已调查 API 服务来源（2026-04-08T23:10）：
  - 落月API，开发者"落月"（GitHub: luoyue712）+ "小杰"，2024年6月起合作开发。
  - 官方文档：`doc.vkeys.cn`，GitHub 仓库：`github.com/lvluoyue/api-doc`。
  - 当前完全免费、无认证、无 QPS 限制、无使用条款。
  - 备用域名：`api.epdd.cn`（可作为 fallback）。
  - 版权评估：代码层面无问题；音乐内容为灰色地带，个人使用不商用风险极低。
- 已确定在线搜索完整流程（双平台搜索、`AbortController` 管理、音频可用性校验、结果标准化格式）。
- 已确定主界面唱片布局方案和设置页面功能项（含主题切换占位）。
- 已废弃汉堡菜单设计，改用齿轮图标。
- 已确定 Font Awesome 加载策略为强制注入（不依赖 ST 已有样式）。
- 已确定 UI 形态为可移动悬浮球（替代原悬浮窗设计），折叠态为圆形可拖拽小球。
- 已确定拖拽使用 Pointer 事件链，3px 阈值区分点击与拖拽。
- 已记录 JS-Slash-Runner 正确导入格式：`import 'http://127.0.0.1:5500/dist/alice-music-float/index.js';`。
- **悬浮球 UI 交互开发已完成**（v4.1，用户确认完美）：
  - 折叠/展开切换正常（单击打开面板、关闭按钮/外部点击折叠）。
  - 拖拽实时跟随鼠标移动，松开后停留在释放位置。
  - setPointerCapture 全程方案，事件链可靠。
  - 设置页面切换正常（齿轮进入、返回按钮回到主页）。
- **离线播放核心已完成**：
  - `OfflinePlayer` 类封装 HTML5 Audio 引擎，管理曲目索引与播放状态。
  - 四阶段离线歌曲映射（初识期/软化期/失去期/热恋期 → URL）已定义。
  - 播放/暂停切换（`togglePlay`）、上一首（`prev`）、下一首（`next`）控制逻辑已实现。
  - 按阶段切歌（`playByStage`）预留，供后续 MVU 监测调用。
  - 面板控制按钮（`btn-play`/`btn-prev`/`btn-next`）已绑定到播放引擎。
  - 播放/暂停图标自动切换（`fa-play` ↔ `fa-pause`）。
  - 歌曲信息显示已联动（标题 + 阶段名）。
  - 播放结束自动切下一首。
  - 脚本卸载时销毁 Audio 资源。
- **进度条 + 时长显示已完成**：
  - 可拖拽进度条（位于歌曲信息与控制按钮之间）。
  - 左侧当前时间 / 右侧总时长（`m:ss` 格式）。
  - `timeupdate` 实时更新进度；`loadedmetadata` 获取总时长。
  - 拖拽使用 `setPointerCapture`，hover 时显示拖拽圆点。
  - 切歌时进度条自动重置。
- **用户测试全部通过**（2026-04-08T17:10）：
  - 悬浮球拖拽、单击展开、关闭/外部点击折叠均正常。
  - 设置页齿轮进入/返回按钮回主页均正常。
  - 播放/暂停、上一首/下一首、图标切换均正常。
  - 进度条实时更新、拖拽 seek 均正常。
  - 歌曲信息显示正常。
- **唱片旋转动画已完成**（2026-04-08T17:13）：
  - CSS `@keyframes disc-spin` 动画（4s 匀速无限循环）。
  - 播放时添加 `.spinning` 类启动旋转，暂停时切换为 `.paused` 类（`animation-play-state: paused`，保留角度）。
  - 第2步"播放器 UI 联动"全部完成。
- **MVU 变量监测与自动切歌已完成**（2026-04-08T17:25）：
  - `await waitGlobalInitialized('Mvu')` 等待 MVU 框架初始化。
  - `eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, ...)` 监听变量更新结束事件。
  - 比较 `stat_data.世界.当前剧情阶段` 新旧值，变化时调用 `playerRef.playByStage(newStage)` 自动切歌。
  - 卸载时调用 `mvuEventStop.stop()` 清理事件监听。
  - 浏览器控制台模拟测试通过：初识期→失去期阶段变化成功触发自动切歌。
  - 第3步"MVU 变量监测与自动切歌"完成。
- **UI 架构重构已完成**（2026-04-08T22:45）：
  - 主界面（唱片/歌曲信息/进度条/控制按钮）始终存在，不因模式切换而变化。
  - 搜索页、歌曲列表页、设置页统一为 `.overlay-page` 叠加层，互斥显示。
  - 顶部栏布局：左侧（齿轮设置 + 汉堡歌曲列表）、右侧（放大镜搜索 + X 关闭）。
  - 搜索页（`#search-page`）：返回按钮 + 标题 + 搜索框（放大镜+输入框+回车按钮）+ 结果列表容器。
  - 歌曲列表页（`#playlist-page`）：返回按钮 + 标题 + 列表容器（含 active 高亮当前曲目样式）。
  - 设置页模式切换仅影响 `playMode` 状态变量，不切换主界面。
  - 打开搜索页时自动聚焦输入框。
- **在线搜索播放功能已完成**（2026-04-08T22:47）：
  - `searchPlatform()` 封装单平台搜索逻辑（搜索→取播放地址→音频可用性校验）。
  - `checkAudioPlayable()` 音频可用性检测（临时 Audio + 3 秒超时 + `loadedmetadata` / `error` 判定）。
  - `doSearch()` 完整搜索流程：`AbortController`
    管理请求生命周期，先网易云（前5取3可用）再QQ音乐（前5取3可用），阶段性渲染。
  - 搜索结果标准化为 `{title, artist, url, cover, source}` 格式。
  - 点击搜索结果 → `addToPlaylistAndPlay()` → 加入 `onlinePlaylist` 数组（按 URL 去重）→ 关闭搜索页 → 主界面播放。
  - `playOnlineTrack()` 直接使用 OfflinePlayer 的 Audio 元素播放在线歌曲，更新歌曲信息（标题 + 歌手·来源）。
  - `renderPlaylist()` 渲染歌曲列表页，当前播放歌曲高亮（`.active`），点击切歌。
  - 播放/暂停/上一首/下一首按钮智能切换：在线模式下控制在线列表，离线模式下控制离线引擎。
  - 在线播放结束自动切下一首；列表播完停止。
  - `_skipEndedHandler` 标志位防止离线 `ended` 处理器干扰在线播放。
  - MVU `playByStage()` 自动重置在线状态（通过 `onResumeOffline` 回调）。
- **在线播放列表循环回绕已修复**（2026-04-09T10:35）：
  - 上一首/下一首按钮使用取模运算循环回绕，到末尾跳第一首，到头跳最后一首。
  - 播放结束（ended）同样循环回到第一首。
- **循环模式按钮已完成**（2026-04-09T10:35）：
  - 三态切换：列表循环（`fa-solid fa-repeat`，默认）→ 单曲循环（`fa-repeat` + 角标"1"）→ 顺序播放（`fa-right-long`，到末尾停止）。
  - 离线/在线播放的 ended 事件均受 repeatMode 控制。
  - 手动点击上/下一首不受 repeatMode 影响（始终循环），仅影响自然播放结束行为。
- **收藏功能已完成**（2026-04-09T10:35）：
  - 主界面控制按钮区右侧新增爱心按钮（`fa-regular fa-heart` ↔ `fa-solid fa-heart` 红色）。
  - 在线播放时点击爱心切换收藏状态，离线模式不响应。
  - 收藏数据通过 `localStorage`（key: `alice-music-favorites`）持久化，跨会话保留。
  - 顶部栏左侧新增收藏列表入口按钮（`fa-regular fa-heart`）。
  - 收藏列表叠加页（`#fav-page`）：显示已收藏歌曲，点击播放（自动加入播放列表），X 按钮取消收藏。
- **收藏列表拖拽排序已完成**（2026-04-09T11:30）：
  - 收藏列表支持 HTML5 Drag and Drop 拖拽排序，与播放列表行为一致。
  - 拖拽后自动 `saveFavorites()` 持久化新顺序。
- **三列表数字序号已完成**（2026-04-09T11:30）：
  - 播放列表、收藏列表、离线列表的拖拽手柄（`fa-grip-vertical` 6点图标）统一改为数字序号。
  - CSS 类从 `.playlist-item-drag` 改为 `.playlist-item-index`，`font-variant-numeric: tabular-nums` 等宽数字。
  - 离线列表序号不可拖拽（`cursor:default`）。
- **列表项两行布局修复歌名截断**（2026-04-09T12:06）：
  - 三列表（播放/收藏/离线）列表项从单行 flex 改为两行布局：歌名一行 + 歌手·来源一行。
  - 新增 `.playlist-item-info` 容器（`flex:1; min-width:0; flex-direction:column`），包裹 title 和 artist。
  - 歌名和歌手·来源行均支持 `text-overflow: ellipsis` 独立截断，不再互相挤压。
  - 播放列表和收藏列表的 artist 行追加显示来源（`· 网易云` / `· QQ音乐`）。
- **全量代码审查 + Bug 修复**（2026-04-09T12:20）：
  - 发现并修复 `renderPlaylist()` 中重复 `appendChild(removeBtn)` 和重复 `click` 事件监听器的 bug。
  - 全量静态审查 2035 行源码，无其他功能性 bug。
- **初始加载自动播放已完成**（2026-04-09T13:10）：
  - MVU 初始化成功后，通过 `Mvu.getMvuData({ type: 'message', message_id: 'latest' })` 读取最新楼层的
    `stat_data.世界.当前剧情阶段`。
  - 根据当前阶段值调用 `playByStage()` 自动播放对应离线音乐。
  - 仅在离线模式下生效（`playByStage` 内部通过 `onResumeOffline` 回调处理模式切换）。
- **功能补全批次已完成**（2026-04-09T14:00）：
  - **防御性修复**（5 项）：删除死代码 `capturedPointerId`；`audio.src` 判断改用 `hasAttribute`；MVU `currentStage` 加
    `VALID_STAGES` 白名单校验；resize handler
    pagehide 时清理；localStorage 数据加 schema 校验（`Array.isArray` + 字段过滤 + `.map` 只保留需要字段）。
  - **播放失败胶囊 toast**：新增 `.toast-container` + `showToast()` 函数，离线播放出错显示"播放失败:
    {title}"（红色胶囊），在线播放出错显示"链接已过期: {title}"（红色胶囊）。
  - **搜索无结果提示**：搜索完两个平台仍无可用结果时显示"未找到可播放的歌曲，换个关键词试试"；网易云搜索完后显示"继续搜索QQ音乐..."中间状态。
  - **音量控制**：新增音量图标按钮（`fa-volume-high/low/xmark`，点击静音切换）+ 音量滑块（`pointerdown/move/up`
    拖拽），与进度条同风格。
  - **在线歌曲封面图**：在线播放时将封面图通过 `<img>` 标签显示在唱片 `.disc` 内部（CSS background 方案在 srcdoc
    iframe 中因 HTTP2 协议错误不可靠），隐藏默认音乐图标；切回离线时恢复默认。
  - **收藏功能优化**：收藏数据改为仅存元数据 `{title, artist, source}`（新增 `FavoriteItem`
    接口），不存 URL/cover（URL 有时效性）；点击收藏歌曲时自动用 `title + artist`
    搜索对应平台获取新 URL 并播放；获取中显示"正在获取播放链接..." toast，失败显示"链接获取失败，请手动搜索" toast。
- **全量代码审查 + Bug 修复（第二轮）**（2026-04-09T15:20）：
  - 全量审查 2305 行源码，发现并修复 3 个问题。
  - 修复 #1：在线顺序播放末尾停止时 `updateFavBtn()` + `updateDiscCover('')` 未同步。
  - 修复 #2：`checkAudioPlayable()` 临时 Audio 清理前未 `pause()`。
  - 修复 #3：`addToPlaylistAndPlay()` 中多余的 `renderPlaylist()` 调用（`playOnlineTrack` 内部已调用）。
- **功能补全批次二**（2026-04-09T18:00）：
  - P0 修复 #1：删除在线播放列表最后一首歌时，停止 audio 并重置 UI 到离线曲目信息。
  - P0 修复 #2：在线顺序播放到末尾后，恢复离线曲目信息显示（不再 UI 悬空）。
  - 音量持久化：localStorage 存储音量值，刷新后保持。
  - 悬浮球位置持久化：localStorage 存储位置坐标，刷新后保持。
  - 缓冲/加载状态：audio `waiting` 事件触发 spinner 动画，`canplay` 恢复。
  - 播放列表/收藏列表批量选择删除：全选复选框 + 逐项复选框 + "删除选中" 按钮。
  - MediaSession API 集成：系统级媒体控制（通知栏/锁屏歌曲信息 + 上/下一首/播放/暂停）。
  - 搜索超时控制：doSearch 30 秒总超时，resolveAndPlayFavorite 15 秒超时。
  - 收藏数据解析失败反馈：loadFavorites 解析失败显示 toast，saveFavorites 存储失败显示 toast。
  - 拖拽排序改用 Pointer 事件：替换 HTML5 Drag and Drop，兼容移动端触摸设备。
- **新会话启动审查（第三轮）+ 2 Bug 修复**（2026-04-09T19:47）：
  - 全量审查 2601 行源码，8 项审查要点全部检查完毕。
  - 修复 #1（P0/运行时错误）：`VOL_STORAGE_KEY` / `POS_STORAGE_KEY` / `FAV_STORAGE_KEY` 三个 `const`
    在声明前被引用（TDZ），导致音量和位置持久化**完全不工作**（ReferenceError 被 try/catch 静默吞掉）。已将声明移至
    `on('load')` 回调开头。
  - 修复 #2（防御性）：`resolveAndPlayFavorite` 的 `catch` 路径未执行 `clearTimeout(timer)`，15 秒后 `ctrl.abort()`
    会在已完成的请求上执行（无副作用但不干净）。已将 `ctrl`/`timer` 提升到 `try` 外并在 `catch` 中补 `clearTimeout`。
- **关闭按钮修复确认 + 设置图标替换**（2026-04-10T00:43）：
  - 关闭按钮（X）已确认正常工作，点击后触发 `panel-disappear` 动画并折叠。
  - 开关动画（`panel-appear` / `panel-disappear`）均正常运行。
  - 设置按钮图标从 Font Awesome `fa-regular fa-gear` 替换为用户提供的自定义 SVG 齿轮图标。
  - SVG 使用 `fill="currentColor"` 继承按钮颜色，18x18px 尺寸匹配原图标大小。
  - 用户已确认看到齿轮图标被成功替换为自定义 SVG 设置图标。
- **UI 美化批次一：图标替换 + 拖拽排序改为整行**（2026-04-10T15:26）：
  - 悬浮球图标：Font Awesome `fa-regular fa-music` 替换为 FA v7 官方 music SVG path（白色填充）。
  - 上一首/下一首按钮：`fa-backward-step` / `fa-forward-step` 替换为 FA v7 官方 SVG path。
  - 播放/暂停按钮：`<i>` 标签替换为两个互斥 `<svg>`（`#icon-play` /
    `#icon-pause`），暂停图标改为镂空双竖条（`fill="none" + stroke`）。
  - 播放列表/收藏列表拖拽排序：触发区域从仅序号数字扩展为**整行条目**，5px 阈值区分点击与拖拽。
  - 拖拽时阻止文本选择（`e.preventDefault`）和后续 click 事件（`suppressClick` + capture 拦截）。
  - **Bug 修复**：`waiting` 缓冲事件处理器中 `btnPlay.querySelector('i')` 改为操作 `#icon-spinner`
    SVG（旧代码残留，按钮内已无 `<i>` 元素导致 `TypeError: Cannot set properties of null`）。
  - chrome-devtools 浏览器端验证全部通过（12 项）。
- **UI 美化批次二：音量弹出式 + 唱片美化 + 顶部栏 + 过渡动画**（2026-04-10T18:35）：
  - 音量控制从水平条改为弹出式竖向滑块。
  - 点击音量按钮：首次打开弹窗，再次点击静音切换，点击外部关闭弹窗。
  - 唱片区从 120px 增大到 140px，添加多层 `radial-gradient` 模拟黑胶环槽纹理。
  - 唱片 `box-shadow` 增加 `inset` 内阴影，增强立体感。
  - 顶部栏设置按钮与列表按钮之间添加竖线分隔符（`.header-divider`）。
  - 按钮微交互：所有 `.icon-btn` 添加 `:active scale(0.92)`，播放按钮 hover 添加光晕。
  - 叠加页（搜索/列表/设置）添加从下方滑入动画（`overlay-slide-in`）。
  - 进度条 hover 增加 `transition: height 0.15s`。
  - 面板主体间距优化（`gap: 16px→12px`，`padding-bottom: 20px→16px`）。
- **UI 美化批次二修正**（2026-04-10T19:17）：
  - 音量按钮从 `.controls` 移到进度条左侧时间上方（`.progress-volume-area` 容器）。
  - 控制栏恢复 5 按钮对称布局：`[循环] [上一首] [播放] [下一首] [收藏]`，播放键居中。
  - 控制栏 gap 恢复 24px。
  - 去掉唱片中心孔 `::after` 伪元素（用户反馈不明显且破坏构图）。
- **离线歌曲数据填充 + 设置图标替换 + 歌曲信息显示优化**（2026-04-10T22:05）：
  - 四阶段离线歌曲 URL 和元数据全部填入：初识期=17(椎名林檎)、软化期=春风吹(方大同)、失去期=I Really Want to Stay at
    Your House、热恋期=打上花火(DAOKO x 米津玄师)。
  - 设置按钮 SVG 替换为 FA v7 官方 gear 图标（viewBox 0 0 640 640），与其他按钮风格统一。
  - 离线播放歌曲信息显示格式与在线模式统一：标题行=歌名，副标题行=歌手 · 阶段名。
  - 离线曲库列表页同步更新为歌名+歌手·阶段名格式。

- **唱片图标移除 + 离线不自动切歌 + 主题切换占位**（2026-04-10T23:15）：
  - 移除唱片中间 `.disc-icon`（`<i class="fa-regular fa-music">`），解决离线模式下 Font Awesome 加载失败显示方块X问题。
  - 离线模式播放结束后不再自动切歌（`onEnded` 始终返回 `true` 阻止
    `next()`），仅手动点击上/下一首或 MVU 阶段变化触发切歌。在线模式不受影响。
  - 设置页主题切换：三选项循环切换（默认→月光白→樱花粉→默认），`localStorage` 持久化（key:
    `alice-music-theme`），CSS 类占位（`.theme-moonlight` / `.theme-sakura`），具体配色待后续美化。
- **月光白主题设置按钮修复 + 代码备份**（2026-04-11T02:05）：
  - 修复月光白主题 CSS 错误隐藏 `overlay-page` 和 `toast-container`，导致设置页/播放列表/搜索页在月光白主题下不可用。
  - 月光白卡片设置按钮从底部栏（`ml-bar-bottom`）移到左上角（`ml-header`），与默认主题设置按钮位置一致。
  - 重置 localStorage 主题为默认，用户打开后看到默认界面。
  - 代码备份至 `backup_20260411_0205/index.ts`。
- **面板边角圆润化 + 月光白虚影修复 + 搜索框美化**（2026-04-11T03:45）：
  - `.float-panel` 的 `border-radius` 从 16px 改为 30px，边角更圆润。
  - `box-shadow` 改为双向新拟态阴影（深色适配版），背景色和内部内容不变。
  - 月光白 `.card` 和 `.card .one` 的 `border-radius`
    从 16px 同步为 30px，移除白色半透明 border 和白色内阴影 box-shadow，消除边角白色虚影。
  - 搜索框从矩形 8px 圆角改为 30px 大圆角新拟态风格：聚焦时底部蓝紫色动画线展开（`::before` +
    `scaleX(0→1)`），圆角过渡为直角；搜索按钮仅在有输入时显示。
- **收藏按钮 SVG 替换**（2026-04-11T11:35）：
  - 顶部栏收藏列表入口按钮（`btn-fav-list`）：FA `<i class="fa-regular fa-heart">` 替换为用户提供的 Uiverse.io
    SVG 爱心路径（`viewBox="0 0 17.503 15.625"`，`fill="currentColor"`）。
  - 控制栏收藏按钮（`btn-fav`）：FA `<i>` 替换为双 SVG 互斥显示（`#icon-heart-empty` 空心 / `#icon-heart-filled`
    实心），通过 `hidden` 类切换。
  - CSS 新增 `.heart-svg-icon`（16x16px，`fill: currentColor`，`transition: transform 0.2s`）。
  - `.ctrl-side-btn.fav-active i` 改为 `.ctrl-side-btn.fav-active .heart-svg-icon`，已收藏时红色 + drop-shadow 发光。
  - `updateFavBtn()` JS 从 `icon.className` 赋值改为 SVG `hidden` 类切换。
- **月光白转场动画**（2026-04-11T13:10）：
  - 点击切换到月光白时，触发流星坠落式转场动画（1.8 秒）。
  - 月亮（单层弯月 + 陨石坑 + 流星拖尾）从左上角对角线滑到右下角。
  - 6-8 颗四角星（clip-path）跟随月亮轨迹散布，各自有独立延迟产生拖尾效果。
  - 白色遮罩随月亮推进从左上到右下对角线渐变"刷白"面板（linear-gradient 135° mask）。
  - 月亮滑过 85% 时切换主题样式，动画结束后月亮/星星淡出、遮罩淡出、清理 DOM。
  - 全程 rAF 驱动（非 CSS keyframes），弹性缓动曲线（快冲+轻微回弹）。
  - localStorage 恢复月光白时跳过动画（`skipMoonTransition` 标志位）。
- **设置页/叠加页月光白配色 + 月亮不超出界面**（2026-04-11T13:55）：
  - `.float-panel.theme-moonlight .overlay-page` 背景改为浅色渐变（`rgba(240,240,245)` → `rgba(210,215,230)`）。
  - 设置项、标签、值、搜索框、播放列表项等全部添加月光白配色（深色文字 + 浅色背景）。
  - 月亮终点从 `panelW+30, panelH+30`（滑出界面）改为 `panelW-85, panelH-85`（右下角内侧，不超出面板边界）。
  - 星星使用用户提供的 clip-path 四角星（`M 50 0 C 70 30...`）+ 流星拖尾。
- **月光白搜索页/列表页配色修复 + 收藏按钮修复 + 搜索加速**（2026-04-12T00:08）：
  - 搜索页：搜索图标、搜索按钮、placeholder、搜索中/搜索提示文字、搜索结果标题/歌手全部从白色改为灰黑色。
  - 歌曲列表：序号(1234)从白色改为灰黑色，hover 加深。
  - 收藏按钮：月光白卡片 `#ml-btn-heart` 从单 SVG 改为双 SVG 互斥（空心/实心），新增 `syncMlFavIcon()` 同步收藏态。
  - 搜索速度优化：`searchPlatform`
    内部 URL 获取+音频校验从顺序改为并行（`Promise.allSettled`），双平台搜索从顺序改为并行（`Promise.all`）。
- **移动端适配 + 樱花粉移除 + Firefox 兼容修复**（2026-04-13T02:30）：
  - 删除樱花粉主题入口，`THEMES` 从三态改为两态（默认 ↔ 月光白）。
  - 修复快速点击分屏 bug：`themeSwitching` 标志位原本声明但从未设为
    `true`，补全双重锁逻辑（350ms 非动画锁 + 动画期间锁）。
  - 修复 Firefox 移动端月光白转场动画不触发：时间源从 `performance.now()` 改为 `Date.now()`（绕过 Fingerprinting
    Protection 精度限制）。
  - 性能优化：动画元素定位从 `left/top` 改为 `transform: translate()` 走 GPU 合成层；添加 `will-change` 提示；预计算
    `diag`/`sqrt2`。
  - 淡出 keyframes 从 `transform: scale()` 改为 `filter` + `opacity`，避免覆盖 translate 定位。
  - 代码备份至 `backup_20260413_0230/`（含源码 index.ts + 构建产物 index.js）。
  - 发布路径更新为 `https://testingcf.jsdelivr.net/gh/baiqigo/music@main/index.js`。
- **发布前最终全面代码审查（第四轮）**（2026-04-13T02:51）：
  - 全量审查 3717 行源码（删除 5 行冗余 CSS 后），9 大审查维度全部通过。
  - 清理 1 处冗余 CSS（`.float-ball i` 选择器，悬浮球图标已从 `<i>` 改为 SVG，该规则不匹配任何元素）。
  - 未发现影响功能的 bug，代码可以发布。
  - webpack build:dev 所有入口 `compiled successfully`。
- **在线搜索 API 失效调研**（2026-04-18T05:30）：
  - 验证 `api.vkeys.cn` 主域名和备用域名 `api.epdd.cn` 均已超时不可用，在线搜索播放功能完全瘫痪。
  - 分析 `guohuiyuan/go-music-dl`（2.4k stars）源码：核心库 `music-lib`
    直连各平台官方 API（网易云需 LinuxAPI/WeAPI/EAPI 加密，QQ音乐和酷狗无加密但需特定 Referer），Go 后端代理模式，不能直接被前端 JS 复用。
  - 发现 `metowolf/Meting`（2k
    stars）：纯 JS（Node.js）多平台音乐 API 框架，零外部依赖，内置加密算法，支持网易云/QQ/酷狗/酷我/百度，统一接口（search/song/url/lyric/pic），MIT 许可证。
  - 发现 `ELDment/Meting-Agent`（74 stars）：基于 Meting 的 MCP Server 封装。
  - 发现 `UnblockNeteaseMusic/server`（7.7k stars）：内置 QQ/酷狗/酷我/波点/咪咕/B站等多音源。
  - 核心问题：所有方案均为 Node.js 服务端库，前端浏览器 fetch 直调官方 API 受 CORS 限制。需要找到可用的聚合 API 服务或自建代理。
  - 落月 API 可能因 V3 升级导致 V2 端点失效，需检查文档确认。
- **落月 API V2/V3 实测结果更新**（2026-04-21T21:12）：
  - **V2 点歌 API 仍然可用**：`/v2/music/tencent?word=` 搜索 200 OK，`/v2/music/tencent?id=`
    取播放地址部分可用（付费歌曲 35kbps，部分返回 500）。上次超时是网络波动，非 API 下线。
  - **V2 分拆子接口已下线**：`/v2/music/tencent/search`、`/v2/music/tencent/url` 返回 404。
  - **V3 搜索 API 完全可用**：`GET /music/tencent/search/song?keyword=告白气球` →
    code:0，返回 songID/songMID/cover/pay/interval 等详细字段。
  - **V3 播放链接 API 完全可用**：`GET /music/tencent/song/link?id=107192078&quality=0`
    → 返回有效播放 URL。支持 quality 参数（0=试听35kbps，6=标准128kbps，8=HQ320kbps）。付费歌曲用 quality=0 可获取试听 URL。
  - **V3 路径格式变化**：不再使用版本号前缀（`/v2/...` → `/music/...`），参数名变化（`word` → `keyword`，新增 `quality`
    参数）。
  - **V3 仅支持 QQ 音乐**，网易云音乐接口尚未上线。V2 的网易云点歌 API 仍可用作备用。
  - Meting /
    Meting-Agent 源码已下载到本地（`E:\xiazai\Meting-master`、`E:\xiazai\Meting-Agent-main`），供后续备用方案参考。
- **QQ 音乐 V2→V3 代码迁移已完成**（2026-04-21T21:17）：
  - `searchPlatform('tencent')` 搜索端点从 `/v2/music/tencent?word=` 改为 `/music/tencent/search/song?keyword=&limit=`。
  - `searchPlatform('tencent')` 播放链接从 `/v2/music/tencent?id=` 改为
    `/music/tencent/song/link?id=&quality=6`（付费歌曲 fallback quality=0）。
  - V3 响应解析：搜索 `data.list[]`（字段 songID/title/singer/cover），成功 code=0。
  - `checkApiStatus()` 从 V2 网易云端点改为 V3 QQ 音乐端点检测。
  - 网易云保留 V2（`/v2/music/netease?word=` / `?id=`），不变。
  - webpack build:dev 全部编译通过。

- **浏览器端 V3 迁移验证全部通过**（2026-04-21T21:50）：
  - chrome-devtools 自动化测试 5 项全部通过。
  - 悬浮球展开正常（50x50→280x380），pointer 事件链正确触发。
  - 设置页切换在线模式后，`checkApiStatus()` V3 端点返回"已连接"（绿色 `.ok`）。
  - 在线搜索"告白气球"返回 3 条可用结果，`checkAudioPlayable` 校验通过。
  - 点击搜索结果"告白气球 - 二珂"：歌曲信息 `二珂 · QQ音乐`（确认 V3 QQ 音乐端点），封面图 QQ 音乐 CDN
    URL，唱片旋转，暂停图标正确。
  - 收藏按钮点击：localStorage 保存 `{title:"告白气球", artist:"二珂", source:"QQ音乐"}`。
  - 收藏列表点击触发
    `resolveAndPlayFavorite`：toast"正在获取播放链接..."显示，重新搜索获取新 URL 后自动播放，收藏页自动关闭。

NextStep:

1. 将构建产物推送到 GitHub `baiqigo/music` 仓库，更新 CDN 发布版本。
2. V3 网易云接口上线后迁移网易云搜索。

核心功能清单（已全部完成，UI 美化时禁止改动以下逻辑）:

1. **OfflinePlayer 类**（行 64-175）：HTML5 Audio 引擎，管理离线播放/暂停/切歌/进度/ended 事件链。
2. **四阶段离线歌曲映射 OFFLINE_TRACKS**（行 43-58）：初识期/软化期/失去期/热恋期 → URL + 元数据。
3. **MVU 变量监测与自动切歌**（`waitGlobalInitialized('Mvu')` + `eventOn(VARIABLE_UPDATE_ENDED)`）：监听
   `世界.当前剧情阶段` 变化，自动调用 `playByStage()`。
4. **初始加载自动播放**：MVU 初始化后读取当前阶段，自动播放对应离线音乐。
5. **在线搜索播放**：`doSearch()` 双平台搜索（网易云+QQ音乐）、`checkAudioPlayable()` 音频校验、`searchPlatform()`
   单平台封装。
6. **在线播放列表管理**：`onlinePlaylist`
   数组、`addToPlaylistAndPlay()`、`removeFromPlaylist()`、`playOnlineTrack()`、拖拽排序。
7. **收藏功能**：`favorites` 数组 + localStorage 持久化（`alice-music-favorites`）、`resolveAndPlayFavorite()`
   重新获取 URL。
8. **循环模式**：`repeatMode` 三态（repeat-all/repeat-one/sequential），影响 ended 行为。
9. **悬浮球拖拽交互**：Pointer 事件链 + setPointerCapture，3px 阈值区分点击与拖拽。
10. **进度条拖拽 seek**：setPointerCapture 方案。
11. **音量控制**：弹出式竖向滑块、静音切换、localStorage 持久化（`alice-music-volume`）。
12. **悬浮球位置持久化**：localStorage（`alice-music-ball-pos`）。
13. **MediaSession API**：系统级媒体控制。
14. **播放失败 Toast 提示**：`showToast()` 胶囊通知。
15. **主题切换框架**：`applyTheme()` + `enterMoonlightLayout()`/`exitMoonlightLayout()` +
    localStorage（`alice-music-theme`）。

功能实现计划（按依赖顺序，已完成项标记 ✅）:

1. ✅ **离线播放核心**
2. ✅ **播放器 UI 联动**
3. ✅ **MVU 变量监测与自动切歌**
4. ✅ **在线搜索播放**
5. ✅ **设置页功能**
   - ✅ 播放模式切换开关（离线 ↔ 在线，仅状态切换）。
   - ✅ 在线数据源状态显示（仅在线模式可见，三态指示器）。
   - 主题切换按钮占位（具体配色待美化阶段定义）。
6. **UI 美化**（最终阶段，用户亲自指导）。

Verification:

- 新会话启动检查全部通过（唱片旋转动画 CSS/JS、MVU 监听逻辑、热恋期 URL 三处一致性）。
- webpack build:dev 全部编译通过（含离线播放核心 + 进度条 + 唱片旋转动画 + MVU 监测 + 搜索/列表/设置叠加页 UI）。
- 悬浮球交互已通过用户实际测试，确认完美。
- 离线播放功能已通过用户实际测试（失去期歌曲可正常播放）。
- 进度条拖拽 seek 已通过用户实际测试，确认正常。
- 所有按钮交互（播放/暂停/上一首/下一首/设置/关闭/返回）均已通过用户测试。
- MVU 变量监测已通过浏览器控制台模拟测试（eventEmit 模拟阶段变化 → 自动切歌日志输出正常）。
- MVU 自动切歌完整链路已通过实际浏览器验证（初识期→失去期、失去期→热恋期两次阶段变化均成功触发切歌，无播放错误）。
- webpack build:dev 全部编译通过（含在线搜索播放功能 + 数据源状态显示）。
- 浏览器 API 端到端测试通过（2026-04-08T23:02）：
  - 网易云搜索 API：返回10条结果，取播放地址成功，音频可用性校验通过。
  - QQ音乐搜索 API：返回10条结果，取播放地址成功，音频可用性校验通过。
  - 完整搜索流程测试（关键词"告白气球"）：网易云3条+QQ音乐3条可用结果，总耗时约10.7秒。
- 用户确认在线搜索播放测试成功（2026-04-08T23:10）。
- **设置页在线数据源状态显示已完成**（2026-04-08T23:16）：
  - `checkApiStatus()` 函数：向 `api.vkeys.cn` 发送最小搜索请求，5 秒超时，返回 `'ok'` | `'fail'`。
  - 设置页新增"数据源状态"行（`#api-status-item`），仅在线模式可见。
  - 状态指示器三态：检测中（黄色闪烁圆点）、已连接（绿色圆点）、不可用（红色圆点）。
  - 打开设置页时自动触发检测（仅在线模式）；模式切换时联动显隐并触发检测。
  - 第5步"设置页功能"全部完成。
- **用户实际测试通过**（2026-04-08T23:28）：
  - 在线模式下数据源状态显示"已连接"（绿色圆点），无 bug。
  - 离线模式下数据源状态行正确隐藏。
  - 模式切换联动正常。
- **新会话 bug 审查通过**（2026-04-09T08:50）：
  - 全量源码审查，未发现影响功能的严重 bug。
  - webpack build:dev 全部编译通过。
  - 仅发现3个低风险防御性编程改进点（audio.src 检查、pointercancel 未处理、ended 事件顺序），均不影响实际使用。
- **离线/在线模式 UI 隔离已完成**（2026-04-09T09:21）：
  - 离线模式：隐藏搜索按钮（放大镜），歌曲列表显示离线曲库（4首剧情BGM），当前播放高亮，点击可切歌。
  - 在线模式：显示搜索按钮，歌曲列表显示在线播放列表。
  - 模式切换时搜索按钮自动显隐，歌曲列表内容自动切换。
  - webpack build:dev 编译通过。
- **在线播放列表管理功能已完成**（2026-04-09T09:50）：
  - 每首歌右侧新增 X 删除按钮（`.playlist-item-remove`），hover 变红色，点击从列表移除。
  - 左侧新增拖拽手柄（`fa-solid fa-grip-vertical`），HTML5 Drag and Drop 实现拖拽排序。
  - 删除歌曲时智能更新 `onlineCurrentIndex`：删除当前播放歌→自动播下一首；删除前面的歌→索引前移；列表清空→切回离线。
  - 拖拽排序时同步更新 `onlineCurrentIndex`，确保当前播放歌曲高亮不错位。
  - webpack build:dev 编译通过。

- **循环回绕 + 循环模式 + 收藏功能**（2026-04-09T10:35）：
  - webpack build:dev 全部编译通过。
  - 循环逻辑数学验证通过（取模运算正确处理 2首歌/1首歌场景）。
  - 待用户实际浏览器测试确认。
- **收藏列表拖拽排序 + 三列表数字序号**（2026-04-09T11:30）：
  - webpack build:dev 全部编译通过。
  - 用户实际浏览器测试通过（2026-04-09T12:00）：拖拽排序可上下拉，数字序号正确显示。
- **用户确认以下功能正常**（2026-04-09T12:00）：
  - 在线播放列表循环回绕（上一首/下一首）正常。
  - 循环模式按钮切换正常。
  - 收藏功能正常。
  - 收藏列表拖拽排序正常。
  - 三列表数字序号正确显示。
- **列表项歌名截断问题**（2026-04-09T12:06）：
  - 用户报告：歌手·来源后缀过长时歌名被省略为"打…"。
  - 修复：改为两行布局（歌名独占一行，歌手·来源独占一行），各自独立 ellipsis 截断。
  - webpack build:dev 全部编译通过，待用户测试确认。
- **全量代码审查 + 浏览器验证**（2026-04-09T12:20）：
  - 静态审查发现并修复 `renderPlaylist()` 重复 `appendChild` + 重复 `click` 监听器 bug（点击列表项会触发两次
    `playOnlineTrack`）。
  - webpack build:dev 全部编译通过。
  - chrome-devtools 浏览器端验证通过：悬浮球折叠/展开、设置页模式切换、离线曲库列表、收藏列表、循环模式三态切换、API 检测"已连接"均正常。
- **初始加载自动播放**（2026-04-09T13:10）：
  - webpack build:dev 全部编译通过。
  - chrome-devtools 浏览器端验证通过（2026-04-09T13:20）：
    - 控制台输出 `[alice-music-float] 初始加载：当前阶段=初识期，自动播放`，逻辑正确触发。
    - MVU 变量监测同时正常启动。
    - 代码回审确认无误。
  - **用户实际测试通过**（2026-04-09T13:25）：
    - 临时将初识期 URL 替换为失去期音乐（`17.flac`）进行端到端测试。
    - 新开对话 → MVU 初始化 → 初识期变量就位 → 音乐自动播放，用户确认成功。
    - 测试后已恢复初识期 URL 为 `URL_初识期_待填`，构建通过。
- **功能补全批次**（2026-04-09T14:00 ~ 15:00）：
  - webpack build:dev 全部编译通过（所有入口 `compiled successfully`）。
  - **封面图修复**：初版 CSS `background-image` 方案在 `srcdoc` iframe 中因 `ERR_HTTP2_PROTOCOL_ERROR`
    间歇性失败（chrome-devtools 网络请求确认），改为 `<img>` 标签方案后用户确认封面正常显示。
  - **浏览器自动验证通过**（chrome-devtools）：
    - 音量按钮静音切换：图标 `fa-volume-high` ↔ `fa-volume-xmark`，滑块 100% ↔ 0%。
    - Toast 容器 DOM 存在，动态创建 toast 成功。
    - 唱片封面 `<img>` src 正确设置为 QQ 音乐封面 URL，唱片 `disc spinning` 旋转正常。
  - **用户实际测试通过**（2026-04-09T15:00）：
    - 封面图：在线播放"春风吹"时唱片显示封面并旋转，确认正常。
    - 音量控制：滑块拖拽调节音量正常，静音切换正常。
    - 搜索无结果提示："未找到可播放的歌曲，换个关键词试试"正常显示。
    - 收藏重新获取 URL：点击收藏歌曲后自动搜索获取新链接并播放，速度比手动搜索快。
    - 所有新增功能均无 bug。

- **全量代码审查（第二轮）+ 浏览器实测验证**（2026-04-09T15:20 ~ 16:00）：
  - 全量审查 2305 行源码，发现 3 个问题并修复。
  - webpack build:dev 全部编译通过。
  - **chrome-devtools 浏览器端验证通过**（2026-04-09T16:00）：
    - 悬浮球加载、展开/折叠正常。
    - 在线模式切换、搜索按钮显隐正常。
    - 在线搜索"春风吹"：网易云 3 条 + QQ音乐 3 条可用结果，API 请求全部 200。
    - 点击搜索结果播放：歌曲信息、封面图、唱片旋转、暂停图标均正确。
    - **修复 #1 验证**：收藏歌曲 → 切 sequential 模式 → seek 到 3:18/3:20 → 自然 ended
      → 爱心按钮重置为空心、封面图隐藏、唱片暂停、播放按钮回 play 图标。**通过。**
    - **修复 #3 验证**：搜索中 `checkAudioPlayable()` 音频校验正常工作（`loadedmetadata`
      正确触发，duration=35s）。**通过。**
    - **修复 #4 验证**：点击搜索结果后播放列表正确显示 1 项且 active 高亮，无重复渲染。**通过。**
    - 收藏数据 localStorage 格式正确：`[{title, artist, source}]`，不含 URL/cover。
    - 循环模式三态切换正常（repeat-all → repeat-one → sequential）。

- **功能补全批次二**（2026-04-09T18:00）：
  - webpack build:dev 全部编译通过（所有入口 `compiled successfully`）。
  - 待用户浏览器实际验证。
- **新会话启动审查（第三轮）**（2026-04-09T19:47）：
  - 全量审查 2601 行源码，8 项审查要点全部通过。
  - 发现并修复 2 个 bug（TDZ + clearTimeout）。
  - webpack build:dev 全部编译通过（所有入口 `compiled successfully`）。
  - **chrome-devtools 浏览器端验证通过**（2026-04-09T20:05）：
    - 悬浮球加载正常（折叠态 50x50，z-index 99999）。
    - **位置持久化修复验证**：localStorage `alice-music-ball-pos` =
      `{x:346,y:184}`，iframe 实际位置一致；模拟拖拽后 Y 从 184→224，localStorage 同步更新。**通过。**
    - **音量持久化修复验证**：localStorage `alice-music-volume` = `0.27`，音量滑块 27%、图标 `fa-volume-low`；静音后存
      `0`，取消静音恢复 `0.27`。**通过。**
    - 收藏数据加载正常（3 首歌曲：打上花火、告白气球、春风吹）。
    - 面板展开/折叠正常（pointer 事件链触发 expand/collapse）。
    - 设置页：离线模式 API 状态隐藏、搜索按钮隐藏；切在线模式后 API "已连接"（绿色 `.ok`）、搜索按钮可见。

- **关闭按钮 + 设置图标 + 动画验证**（2026-04-10T00:43）：
  - webpack build:dev 全部编译通过。
  - 用户确认看到齿轮图标已成功替换为自定义 SVG 设置图标。
  - chrome-devtools 浏览器端全量验证通过（7 项测试）：
    1. 悬浮球展开：pointer 事件触发 expand，面板显示 `panel-appear` 动画，iframe 切换为 280x380。**通过。**
    2. 设置按钮 SVG：`.settings-icon`
       渲染为 18x18px，`fill="currentColor"`，viewBox=`0 0 24 24`，path 存在。点击打开设置页（播放模式/主题）。**通过。**
    3. 设置页返回：点击返回按钮，设置页隐藏。**通过。**
    4. 歌曲列表按钮：点击打开播放列表页，显示歌曲列表。**通过。**
    5. 收藏列表按钮：点击打开收藏列表页，播放列表页自动关闭（互斥）。**通过。**
    6. 关闭按钮（X）：点击添加 `collapsing` 类，`panel-disappear` 动画执行，`animationend`
       触发后面板隐藏、悬浮球恢复、iframe 缩回 50x50。**通过。**
    7. 全量控件检查：play/prev/next/repeat/fav/volume 按钮全部存在，歌曲信息显示正常。**通过。**

- **UI 美化批次二 chrome-devtools 浏览器验证通过（14 项）**（2026-04-10T20:30）：
  1. 音量在 progress-volume-area 内。**通过。**
  2. 音量不在 controls 内。**通过。**
  3. controls 5 个子元素（repeat→prev→play→next→fav）。**通过。**
  4. controls gap 24px。**通过。**
  5. 唱片 140px。**通过。**
  6. 无 disc::after 中心孔。**通过。**
  7. 顶部栏分隔符存在。**通过。**
  8. 音量弹窗默认隐藏。**通过。**
  9. 点击音量→弹窗打开。**通过。**
  10. 再点→静音（xmark, 0%）。**通过。**
  11. 再点→取消静音。**通过。**
  12. 点外部→弹窗关闭。**通过。**
  13. CSS 微交互全部存在（active scale, hover glow, overlay-slide-in, progress transition）。**通过。**
  14. 设置页叠加动画 overlay-slide-in 生效。**通过。**
  - 控制台无播放器相关错误。

- **唱片图标移除 + 离线不自动切歌 + 主题切换占位 chrome-devtools 验证通过（5 项）**（2026-04-10T23:15）：
  1. `.disc-icon` 元素不存在（`hasDiscIcon: false`）。**通过。**
  2. 唱片封面 `<img>` 存在且离线模式下隐藏（`coverHidden: true`）。**通过。**
  3. 主题切换三态循环：默认→月光白（`theme-moonlight`）→樱花粉（`theme-sakura`）→默认（无 theme class）。**通过。**
  4. 主题 localStorage 持久化正确（`alice-music-theme`）。**通过。**
  5. 控制台无播放器相关错误。**通过。**

- **月光白设置按钮修复**（2026-04-11T02:05）：
  - webpack build:dev 全部编译通过。
  - localStorage 主题已重置为默认。
  - 代码备份至 `backup_20260411_0205/index.ts`。

- **发布前最终全面代码审查（第四轮）**（2026-04-13T02:51）：
  - 全量审查 3722 行源码（9 大审查维度）：
    1. HTML 结构完整性（DOM ID/类名一致性）— **通过**
    2. CSS 样式（死代码/冲突/遗漏）— 发现 1 处冗余 `.float-ball i`（已清理）
    3. JS 核心逻辑（事件绑定/内存泄漏/竞态条件）— **通过**
    4. localStorage 持久化（读写一致性/异常处理）— **通过**
    5. Audio 引擎（资源释放/错误处理/ended 事件链）— **通过**
    6. 在线搜索/播放（AbortController/超时/URL 校验）— **通过**
    7. MVU 集成（初始化/事件监听/卸载清理）— **通过**
    8. 月光白主题/转场动画（DOM 清理/内存泄漏）— **通过**
    9. 构建验证（webpack build:dev 所有入口 compiled successfully）— **通过**
  - 未发现影响功能的 bug。代码可以发布。

Bug 记录:

1. ~~**粘手 bug v1/v2**~~（已修复 v3）。
2. ~~**交互行为反转 bug（v3）**~~（v4 已修复）。
3. ~~**拖拽不跟随 + 松开后粘手（v4）**~~（v4.1 已修复）。
4. ~~**在线播放列表不循环 bug**~~（已修复，取模运算循环回绕）。
5. ~~**在线顺序播放末尾停止时 UI 状态不同步**~~（已修复，第二轮审查发现，浏览器验证通过）。
6. ~~**checkAudioPlayable 临时 Audio 未 pause**~~（已修复，防御性改进，浏览器验证通过）。
7. ~~**addToPlaylistAndPlay 重复调用 renderPlaylist**~~（已修复，删除冗余调用，浏览器验证通过）。
8. ~~**删除列表最后一首歌时音频未停止**~~（已修复，补全批次二）。
9. ~~**在线顺序播放到末尾后 UI 悬空**~~（已修复，补全批次二，恢复离线曲目信息）。
10. ~~**VOL_STORAGE_KEY / POS_STORAGE_KEY TDZ 导致持久化不工作**~~（已修复，第三轮审查发现，声明前移）。
11. ~~**resolveAndPlayFavorite catch 路径未 clearTimeout**~~（已修复，防御性改进）。
12. ~~**waiting 缓冲事件 querySelector('i') 返回 null**~~（已修复，图标从 `<i>` 改为 SVG 后残留旧代码）。
13. ~~**月光白主题隐藏 overlay-page 导致设置页不可用**~~（已修复，CSS 不再隐藏 overlay-page/toast-container）。
14. ~~**月光白搜索页/列表页元素白色不可见**~~（已修复，搜索图标/按钮/提示/序号全部添加深色覆盖）。
15. ~~**月光白卡片收藏按钮无视觉反馈**~~（已修复，改为双 SVG 互斥 + syncMlFavIcon 同步）。
16. ~~**Firefox 移动端快速点击主题切换导致分屏**~~（已修复，`themeSwitching` 双重锁 + 350ms 非动画延迟）。
17. ~~**Firefox 移动端月光白转场动画不触发/卡死**~~（已修复，`Date.now()` 替代
    `performance.now()`，`transform: translate()` 替代 `left/top`）。

LastUpdated: 2026-04-21T21:55:00+08:00
