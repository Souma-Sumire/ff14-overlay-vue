<script setup lang="ts">
interface UserInfo {
  id: string
  name: string
  job: string
  flags: number
  waymarkIndex: number
  isAnonymous: boolean
  isIdHidden: boolean
  isWaymarkEnabled: boolean
  isInitiator: boolean
  world?: string
  hasResponded?: boolean
  isQueried?: boolean
}

interface Props {
  user: UserInfo
  blurMode?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="user-card" :class="{ 'not-responded': user.isQueried && !user.hasResponded, 'pre-query': !user.isQueried, 'blur-mode': blurMode }">
    <div class="user-header">
      <div class="user-info">
        <div class="user-name">
          <span :class="{ 'blurred-text': blurMode }">{{ user.name }}</span>
          <span v-if="!user.isQueried" class="status-badge pre" title="尚未查询">尚未查询</span>
          <template v-else>
            <span v-if="user.hasResponded" class="status-badge" title="正在使用 BBY">BBY</span>
            <span v-else class="status-badge unused" title="未使用 BBY">未使用</span>
          </template>
        </div>
        <div class="user-meta">
          <span v-if="user.job" class="user-job">{{ user.job }}</span>
          <span v-if="user.world" class="user-world">{{ user.world }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 设计系统变量
$color-primary: #3b82f6;
$color-primary-light: #60a5fa;
$color-success: #10b981;
$color-danger: #ef4444;
$color-neutral: #475569;

$color-bg-card: rgba(30, 41, 59, 0.7);
$color-bg-card-hover: rgba(30, 41, 59, 0.9);
$color-bg-card-inactive: rgba(15, 23, 42, 0.4);

$color-text-primary: #f8fafc;
$color-text-secondary: #e2e8f0;
$color-text-muted: #94a3b8;

$border-color-primary: rgba(59, 130, 246, 0.3);
$border-color-inactive: rgba(255, 255, 255, 0.08);

$shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
$shadow-md: 0 4px 12px rgba(0, 0, 0, 0.25);
$shadow-glow: 0 0 20px rgba(59, 130, 246, 0.3);

$transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);

.user-card {
    background: $color-bg-card;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(59, 130, 246, 0.6); // 默认蓝色
    border-radius: 6px;
    padding: 6px 8px;
    transition: all $transition-base;
    box-shadow: $shadow-sm;
    position: relative;
    overflow: hidden;
    cursor: default;

    // 左侧装饰条
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 2px;
        height: 100%;
        background: linear-gradient(180deg, $color-primary 0%, $color-primary-light 100%);
        opacity: 0.9;
        transition: all $transition-base;
    }

    // 悬停光晕效果
    &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
        transform: translate(-50%, -50%) scale(0);
        transition: transform $transition-base;
        pointer-events: none;
    }

    &.pre-query {
        border-color: rgba(71, 85, 105, 0.3);

        &::before {
            background: $color-neutral;
            opacity: 0.5;
        }
    }

    &.not-responded {
        opacity: 0.85; // 未使用的人现在稍微显眼一点（蓝色）
        border-color: rgba(59, 130, 246, 0.4);
        background: $color-bg-card-inactive;

        &::before {
            background: $color-primary;
            opacity: 0.8;
            width: 2px;
        }

        &:hover {
            opacity: 1;
            transform: translateY(-1px);
        }
    }

    // 已使用 BBY 的卡片样式（警告红）
    &:not(.pre-query):not(.not-responded) {
        border-color: rgba(239, 68, 68, 0.6);
        background: rgba(45, 15, 15, 0.8);

        &::before {
            background: linear-gradient(180deg, $color-danger 0%, #ff6b6b 100%);
            width: 3px;
        }

        &:hover {
            box-shadow: $shadow-md, 0 0 20px rgba(239, 68, 68, 0.4);
            border-color: $color-danger;
        }
    }

    &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-md, $shadow-glow;
        background: $color-bg-card-hover;
    }
}

.user-header {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.user-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.user-name {
    font-weight: 600;
    font-size: 12px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    color: $color-text-secondary;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    letter-spacing: -0.2px;
}

.status-badge {
    font-size: 8px;
    color: white;
    padding: 1px 4px;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.3px;
    flex-shrink: 0;
    transition: all $transition-base;
    position: relative;

    &.pre {
        background: linear-gradient(135deg, $color-neutral 0%, #64748b 100%);
        box-shadow: 0 2px 4px rgba(71, 85, 105, 0.3);
        opacity: 0.85;
    }

    // BBY 使用中徽章
    &:not(.pre):not(.unused) {
        background: linear-gradient(135deg, $color-danger 0%, #dc2626 100%);
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 2px 4px rgba(0, 0, 0, 0.2);
        animation: danger-glow 2s ease-in-out infinite;

        &::before {
            content: '●';
            margin-right: 2px;
            font-size: 6px;
            animation: pulse-dot 1.5s ease-in-out infinite;
        }
    }

    &.unused {
        background: linear-gradient(135deg, $color-primary 0%, #2563eb 100%);
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5), 0 2px 4px rgba(0, 0, 0, 0.2);
    }
}

@keyframes danger-glow {
    0%, 100% {
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    50% {
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0, 0, 0, 0.2);
    }
}

@keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

.user-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 10px;
    color: $color-text-muted;
}

.user-job {
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;
    font-weight: 500;
    color: $color-primary-light;
    background: rgba(59, 130, 246, 0.1);
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.user-world {
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;

    &::before {
        content: '@';
        opacity: 0.5;
        font-size: 10px;
    }
}

// 模糊模式样式
.blurred-text {
    filter: blur(5px);
    user-select: none;
    transition: filter 0.2s ease;
}

.user-card.blur-mode {
    cursor: context-menu;

    &:hover .blurred-text {
        filter: blur(3px);
    }
}
</style>
