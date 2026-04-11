<template>
  <div class="phone-shell-wrap">
    <div class="phone-shell fade-in-up">
      <div class="phone-glass"></div>

      <section class="phone-screen">
        <header class="status-bar">
          <span class="sys-time">{{ currentTime }}</span>
          <div class="island"></div>
          <div class="sys-icons" aria-label="network and battery status">
            <span class="network">5G</span>
            <span class="signal" aria-hidden="true"> <i></i><i></i><i></i><i></i> </span>
            <span class="battery" aria-hidden="true">
              <span class="battery-level"></span>
              <span class="battery-cap"></span>
            </span>
          </div>
        </header>

        <main class="screen-content">
          <section class="status-panel card fade-in-up delay-1">
            <h2 class="panel-title">角色状态</h2>
            <template v-if="hasStatData">
              <div class="identity-row">
                <div>
                  <p class="value role-name">{{ roleName }}</p>
                  <p class="label">{{ locationText }}</p>
                </div>
                <div class="mood-chip">{{ moodEmoji }} {{ moodText }}</div>
              </div>

              <div class="meter-row">
                <div class="meter-head">
                  <span class="label">{{ energyLabel }}</span>
                  <span class="value">{{ energyValue }}%</span>
                </div>
                <div class="meter-track">
                  <div class="meter-fill" :style="{ width: `${energyValue}%` }"></div>
                </div>
              </div>

              <div class="affection-row">
                <span class="label">好感度</span>
                <span class="value">{{ favorLevel }}</span>
              </div>
            </template>

            <template v-else>
              <div class="placeholder-box">
                <p class="placeholder-title">暂无状态数据</p>
                <p class="placeholder-desc">等待消息变量中的 stat_data 初始化后展示。</p>
              </div>
            </template>
          </section>

          <section class="chat-panel card fade-in-up delay-2">
            <h2 class="panel-title">聊天预览</h2>

            <template v-if="previewMessages.length > 0">
              <div class="chat-list">
                <article
                  v-for="(item, index) in previewMessages"
                  :key="`${item.message_id}-${index}`"
                  class="bubble-row"
                  :class="item.role === 'user' ? 'from-user' : 'from-assistant'"
                  :style="{ animationDelay: `${120 + index * 90}ms` }"
                >
                  <div class="bubble">{{ item.message }}</div>
                </article>
              </div>
            </template>

            <template v-else>
              <div class="placeholder-box chat-placeholder">
                <p class="placeholder-title">暂无聊天记录</p>
                <p class="placeholder-desc">开始对话后，这里会显示最近 2-3 条消息。</p>
                <div class="mock-bubbles" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </template>
          </section>
        </main>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { injectStreamingMessageContext } from '@util/streaming';

type RoleLike = 'user' | 'assistant';
type ChatPreview = { message_id: number; role: RoleLike; message: string };

const context = injectStreamingMessageContext();

const currentTime = ref('00:00');
const statData = ref<Record<string, any>>({});
const previewMessages = ref<ChatPreview[]>([]);

const updateClock = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  currentTime.value = `${hh}:${mm}`;
};

const clampPercent = (value: unknown, fallback = 70) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return _.clamp(Math.round(numeric), 0, 100);
};

const pickFirst = (source: Record<string, any>, paths: string[], fallback = '') => {
  for (const path of paths) {
    const value = _.get(source, path);
    if (!_.isNil(value) && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return fallback;
};

const updateStatData = () => {
  const message_id = Number.isFinite(context.message_id) ? context.message_id : getCurrentMessageId();
  const variables = getVariables({ type: 'message', message_id });
  statData.value = _.isPlainObject(_.get(variables, 'stat_data')) ? _.get(variables, 'stat_data') : {};
};

const cleanBubble = (message: unknown) => {
  const text = String(message ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    return '';
  }
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
};

const updatePreviewMessages = () => {
  const last_id = Math.max(0, Number(getLastMessageId?.() ?? 0));
  const start_id = Math.max(0, last_id - 14);
  const range = `${start_id}-${last_id}`;
  const chats = getChatMessages(range, { role: 'all', hide_state: 'unhidden', include_swipes: false }) as Array<{
    message_id: number;
    role: 'system' | 'assistant' | 'user';
    message: string;
    is_hidden: boolean;
  }>;

  const valid = chats
    .filter(item => (item.role === 'assistant' || item.role === 'user') && !item.is_hidden)
    .map(item => ({
      message_id: item.message_id,
      role: item.role as RoleLike,
      message: cleanBubble(item.message),
    }))
    .filter(item => item.message !== '')
    .slice(-3);

  previewMessages.value = valid;
};

const hasStatData = computed(() => _.keys(statData.value).length > 0);
const roleName = computed(() =>
  pickFirst(statData.value, ['角色名称', '角色.名称', 'name', 'character.name'], '未命名角色'),
);
const locationText = computed(() =>
  pickFirst(statData.value, ['当前地点', '地点', '位置', 'world.location'], '未知地点'),
);
const moodText = computed(() => pickFirst(statData.value, ['当前心情', '心情', '情绪', 'mood.text'], '平静'));
const moodEmoji = computed(() => {
  const mood = moodText.value;
  if (/开心|愉快|兴奋|喜悦/.test(mood)) {
    return '😄';
  }
  if (/紧张|警惕|不安/.test(mood)) {
    return '😯';
  }
  if (/疲惫|低落|伤心|难过/.test(mood)) {
    return '😔';
  }
  return '🙂';
});

const energyRaw = computed(() =>
  _.find(
    [
      _.get(statData.value, '体力值'),
      _.get(statData.value, '精神状态'),
      _.get(statData.value, '体力'),
      _.get(statData.value, 'energy'),
      _.get(statData.value, 'spirit'),
    ],
    value => !_.isNil(value),
  ),
);
const energyValue = computed(() => clampPercent(energyRaw.value, 70));
const energyLabel = computed(() =>
  _.has(statData.value, '精神状态') || _.has(statData.value, 'spirit') ? '精神状态' : '体力值',
);

const favorValue = computed(() =>
  clampPercent(
    _.find(
      [
        _.get(statData.value, '好感度级别'),
        _.get(statData.value, '好感度'),
        _.get(statData.value, 'affection.level'),
        _.get(statData.value, 'affection'),
      ],
      value => !_.isNil(value),
    ),
    50,
  ),
);

const favorLevel = computed(() => {
  if (favorValue.value >= 85) {
    return `挚爱 (${favorValue.value})`;
  }
  if (favorValue.value >= 65) {
    return `亲近 (${favorValue.value})`;
  }
  if (favorValue.value >= 40) {
    return `友好 (${favorValue.value})`;
  }
  return `普通 (${favorValue.value})`;
});

let timer: number | undefined;
const stops: Array<() => void> = [];

$(() => {
  updateClock();
  updateStatData();
  updatePreviewMessages();

  timer = window.setInterval(() => {
    updateClock();
  }, 30_000);

  const refresh = () => {
    updateStatData();
    updatePreviewMessages();
  };

  stops.push(eventOn(tavern_events.MESSAGE_RECEIVED, refresh).stop);
  stops.push(eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, refresh).stop);
  stops.push(eventOn(tavern_events.USER_MESSAGE_RENDERED, refresh).stop);
  stops.push(eventOn(tavern_events.MESSAGE_EDITED, refresh).stop);
  stops.push(eventOn(tavern_events.MESSAGE_DELETED, refresh).stop);
});

watch(
  () => [context.message_id, context.message, context.during_streaming],
  () => {
    updateStatData();
    updatePreviewMessages();
  },
  { deep: false },
);

$(window).on('pagehide', () => {
  if (!_.isNil(timer)) {
    window.clearInterval(timer);
  }
  stops.forEach(stop => stop());
});
</script>

<style scoped>
.phone-shell-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  padding: 0.3rem 0;
}

.phone-shell {
  width: min(100%, 440px);
  aspect-ratio: 9 / 19;
  margin: 0 auto;
  border-radius: 2.1rem;
  padding: 0.42rem;
  background: linear-gradient(145deg, #d7e2f4 0%, #9eaec4 35%, #6a798e 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 18px 40px rgba(25, 36, 55, 0.32);
}

.phone-glass {
  width: 100%;
  aspect-ratio: 9 / 19;
  border-radius: 1.85rem;
  background:
    radial-gradient(circle at 20% 15%, rgba(255, 255, 255, 0.6), transparent 40%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.04));
}

.phone-screen {
  width: 100%;
  aspect-ratio: 9 / 19;
  margin-top: calc(-1 * (100% / (9 / 19)));
  border-radius: 1.85rem;
  background:
    radial-gradient(120% 95% at 0% 10%, rgba(233, 245, 255, 0.5), transparent 50%),
    linear-gradient(165deg, #edf4ff 0%, #dbe9f6 40%, #c9d7e8 100%);
  border: 1px solid rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(8px);
  overflow: hidden;
  padding: 0.6rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.55rem;
}

.status-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.45rem;
  min-height: 2rem;
}

.sys-time {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1f2a3d;
  letter-spacing: 0.03em;
}

.island {
  width: min(34vw, 7rem);
  height: 1.5rem;
  border-radius: 9999px;
  background: linear-gradient(180deg, #0f1522 0%, #04070b 100%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.sys-icons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.35rem;
}

.network {
  font-size: 0.76rem;
  font-weight: 700;
  color: #2c3950;
}

.signal {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.1rem;
  height: 0.72rem;
}

.signal i {
  display: block;
  width: 0.15rem;
  border-radius: 2px;
  background: #2f3c55;
}

.signal i:nth-child(1) {
  height: 0.26rem;
}

.signal i:nth-child(2) {
  height: 0.4rem;
}

.signal i:nth-child(3) {
  height: 0.55rem;
}

.signal i:nth-child(4) {
  height: 0.72rem;
}

.battery {
  display: inline-flex;
  align-items: center;
  width: 1.5rem;
  height: 0.72rem;
  border-radius: 0.2rem;
  border: 1px solid #2f3c55;
  padding: 0.08rem;
  gap: 0.08rem;
}

.battery-level {
  width: 1.08rem;
  height: 100%;
  border-radius: 0.09rem;
  background: linear-gradient(90deg, #70d685, #4daf67);
}

.battery-cap {
  width: 0.12rem;
  height: 0.32rem;
  border-radius: 0 2px 2px 0;
  background: #2f3c55;
}

.screen-content {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 0.6rem;
  min-height: 0;
}

.card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 1rem;
  box-shadow:
    0 8px 20px rgba(36, 52, 71, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.85) inset;
  padding: 0.68rem;
  min-height: 0;
}

.panel-title {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: #5d6d86;
  font-weight: 700;
}

.identity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.role-name {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: #1e2b42;
}

.label {
  margin: 0;
  font-size: 0.74rem;
  color: #677691;
}

.value {
  color: #1f2f49;
  font-weight: 700;
}

.mood-chip {
  padding: 0.38rem 0.55rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #2a3b58;
  background: linear-gradient(145deg, #e6f3ff, #d3e3f7);
  white-space: nowrap;
}

.meter-row {
  margin-top: 0.62rem;
}

.meter-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.28rem;
}

.meter-track {
  height: 0.58rem;
  border-radius: 999px;
  background: rgba(179, 197, 219, 0.5);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #4d91ff 0%, #79c5ff 100%);
  transition: width 0.45s ease;
}

.affection-row {
  margin-top: 0.62rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 0.66rem;
  padding: 0.45rem 0.52rem;
  background: linear-gradient(145deg, rgba(227, 245, 255, 0.8), rgba(211, 226, 248, 0.7));
}

.chat-panel {
  display: grid;
  grid-template-rows: auto 1fr;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 0;
}

.bubble-row {
  display: flex;
  animation: bubble-rise 0.45s ease both;
}

.from-user {
  justify-content: flex-end;
}

.from-assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 84%;
  font-size: 0.77rem;
  line-height: 1.38;
  border-radius: 0.75rem;
  padding: 0.46rem 0.58rem;
  color: #1e2d43;
  box-shadow: 0 2px 8px rgba(39, 52, 71, 0.11);
}

.from-assistant .bubble {
  background: #f5f9ff;
  border-bottom-left-radius: 0.26rem;
}

.from-user .bubble {
  background: linear-gradient(135deg, #96c4ff 0%, #60a6ff 100%);
  color: #fff;
  border-bottom-right-radius: 0.26rem;
}

.placeholder-box {
  height: calc(100% - 0.2rem);
  border-radius: 0.76rem;
  border: 1px dashed rgba(99, 125, 160, 0.45);
  background: rgba(236, 244, 255, 0.72);
  display: grid;
  place-content: center;
  text-align: center;
  padding: 0.8rem 0.55rem;
  gap: 0.23rem;
}

.placeholder-title {
  margin: 0;
  color: #3a4b67;
  font-size: 0.82rem;
  font-weight: 700;
}

.placeholder-desc {
  margin: 0;
  color: #6f7f9a;
  font-size: 0.7rem;
}

.chat-placeholder {
  gap: 0.42rem;
}

.mock-bubbles {
  display: flex;
  gap: 0.2rem;
  justify-content: center;
}

.mock-bubbles span {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 50%;
  background: #8ea4c4;
  animation: pulse 1.2s infinite;
}

.mock-bubbles span:nth-child(2) {
  animation-delay: 0.18s;
}

.mock-bubbles span:nth-child(3) {
  animation-delay: 0.36s;
}

.fade-in-up {
  animation: fade-up 0.55s ease both;
}

.delay-1 {
  animation-delay: 0.1s;
}

.delay-2 {
  animation-delay: 0.18s;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bubble-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>
