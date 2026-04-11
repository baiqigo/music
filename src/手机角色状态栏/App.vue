<template>
  <div class="stage">
    <div class="phone" aria-label="手机角色状态栏">
      <div class="notch" />

      <div class="screen">
        <header class="sysbar fade-1">
          <span>{{ now_time }}</span>
          <div class="sys-icons">
            <span>5G</span>
            <span>95%</span>
          </div>
        </header>

        <section class="role-panel fade-2">
          <div class="role-main">
            <h2>{{ status.角色名 }}</h2>
            <p>{{ status.状态描述 }}</p>
          </div>
          <div class="chips">
            <span>地点 {{ status.地点 }}</span>
            <span>心情 {{ status.心情 }}</span>
            <span>体力 {{ status.体力 }}</span>
            <span>精神 {{ status.精神 }}</span>
            <span>好感 {{ status.好感 }}</span>
          </div>
        </section>

        <section class="chat-panel fade-3">
          <div class="chat-title">聊天界面</div>
          <div class="bubble" v-for="(item, idx) in chat_preview" :key="idx" :class="item.role">
            <div class="name">{{ item.name }}</div>
            <p>{{ item.text }}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type Status = {
  角色名: string;
  状态描述: string;
  地点: string;
  心情: string;
  体力: string;
  精神: string;
  好感: string;
};

type ChatItem = {
  role: 'assistant' | 'user' | 'system';
  name: string;
  text: string;
};

const status = ref<Status>({
  角色名: '角色',
  状态描述: '等待状态同步',
  地点: '未知',
  心情: '平静',
  体力: '--',
  精神: '--',
  好感: '--',
});

const chat_preview = ref<ChatItem[]>([]);
const now = ref(new Date());

const now_time = computed(() => {
  const hh = String(now.value.getHours()).padStart(2, '0');
  const mm = String(now.value.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
});

function short_text(input: string, max = 80) {
  return input.length > max ? `${input.slice(0, max)}...` : input;
}

function derive_status_desc(favorability: number) {
  if (favorability >= 80) return '状态稳定, 明显亲近中';
  if (favorability >= 60) return '轻度依赖, 需要回应';
  if (favorability >= 40) return '保持关注, 情绪可控';
  if (favorability >= 20) return '敏感观察中, 建议安抚';
  return '情绪波动较大, 建议谨慎互动';
}

function refresh_status() {
  const message_id = getCurrentMessageId();
  const message_vars = getVariables({ type: 'message', message_id });
  const stat_data = message_vars?.stat_data as
    | {
        世界?: { 当前地点?: string };
        白娅?: { 依存度?: number; $依存度阶段?: string };
      }
    | undefined;

  const favorability = Number(stat_data?.白娅?.依存度 ?? Number.NaN);
  const favorability_text = Number.isFinite(favorability) ? String(Math.round(favorability)) : '--';

  status.value = {
    角色名: getChatMessages(message_id)[0]?.name ?? '角色',
    状态描述: stat_data?.白娅?.$依存度阶段 ?? derive_status_desc(Number.isFinite(favorability) ? favorability : 50),
    地点: stat_data?.世界?.当前地点 ?? '未知',
    心情: Number.isFinite(favorability) ? (favorability >= 60 ? '放松' : favorability >= 30 ? '警觉' : '紧绷') : '平静',
    体力: Number.isFinite(favorability) ? `${Math.max(20, 100 - Math.round(favorability * 0.6))}%` : '--',
    精神: Number.isFinite(favorability) ? `${Math.min(100, 35 + Math.round(favorability * 0.65))}%` : '--',
    好感: favorability_text,
  };
}

function refresh_chat_preview() {
  const message_id = getCurrentMessageId();
  const begin = Math.max(0, message_id - 6);
  const sliced = getChatMessages(`${begin}-${message_id}`)
    .filter(item => item.role === 'assistant' || item.role === 'user' || item.role === 'system')
    .slice(-4)
    .map(item => ({
      role: item.role,
      name: item.name || (item.role === 'user' ? '你' : item.role === 'assistant' ? '角色' : '系统'),
      text: short_text(item.message ?? ''),
    }));

  chat_preview.value =
    sliced.length > 0
      ? sliced
      : [
          { role: 'system', name: '系统', text: '暂无可展示聊天记录，等待新楼层同步。' },
          { role: 'assistant', name: status.value.角色名, text: '状态栏已就绪，正在等待互动。' },
        ];
}

function refresh_all() {
  now.value = new Date();
  refresh_status();
  refresh_chat_preview();
}

let timer = 0;

onMounted(() => {
  refresh_all();
  timer = window.setInterval(refresh_all, 2000);
});

onBeforeUnmount(() => {
  window.clearInterval(timer);
});
</script>

<style scoped lang="scss">
.stage {
  width: 100%;
  padding: 8px 0;
}

.phone {
  width: min(100%, 420px);
  margin: 0 auto;
  border: 3px solid #21313a;
  border-radius: 30px;
  padding: 8px;
  background: linear-gradient(145deg, #d6ecf2 0%, #b8d4df 100%);
  box-shadow: 0 10px 28px rgba(31, 54, 66, 0.25);
  aspect-ratio: 9 / 19.5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notch {
  width: 42%;
  height: 18px;
  margin: 0 auto;
  border-radius: 0 0 12px 12px;
  background: #19252c;
}

.screen {
  flex: 1;
  border-radius: 22px;
  border: 1px solid rgba(26, 45, 55, 0.35);
  padding: 10px;
  background:
    radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.75), transparent 35%),
    linear-gradient(180deg, #f5fcff 0%, #e8f3f8 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #21313a;
}

.sysbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.sys-icons {
  display: flex;
  gap: 8px;
}

.role-panel {
  border-radius: 14px;
  border: 1px solid #95b8c7;
  background: rgba(255, 255, 255, 0.75);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-main h2 {
  margin: 0;
  font-size: 17px;
}

.role-main p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #37515f;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips span {
  border-radius: 999px;
  padding: 3px 8px;
  background: #d9ecf4;
  font-size: 11px;
}

.chat-panel {
  flex: 1;
  border-radius: 14px;
  border: 1px solid #95b8c7;
  background: rgba(255, 255, 255, 0.84);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-title {
  font-size: 12px;
  font-weight: 700;
  color: #2d4552;
}

.bubble {
  max-width: 90%;
  border-radius: 12px;
  padding: 7px 10px;
  font-size: 12px;
  line-height: 1.42;
  animation: rise-in 0.45s ease both;
}

.bubble .name {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.85;
  margin-bottom: 2px;
}

.bubble p {
  margin: 0;
  word-break: break-word;
}

.bubble.user {
  margin-left: auto;
  background: #d3efe2;
  border: 1px solid #87bda2;
}

.bubble.assistant {
  margin-right: auto;
  background: #e8f0ff;
  border: 1px solid #9eb4de;
}

.bubble.system {
  margin: 0 auto;
  background: #f5f7da;
  border: 1px solid #c8cd97;
}

.fade-1 {
  animation: rise-in 0.3s ease both;
}

.fade-2 {
  animation: rise-in 0.45s ease both;
}

.fade-3 {
  animation: rise-in 0.6s ease both;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
