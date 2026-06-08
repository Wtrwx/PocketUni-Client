<template>
  <div class="app-shell">
    <aside class="nav-rail glass-panel">
      <div class="brand">
        <div class="brand-mark">PU</div>
        <div>
          <div class="brand-title">口袋校园</div>
          <div class="brand-subtitle">Campus Console</div>
        </div>
      </div>

      <nav class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: normalizedPath === item.path }"
          @click="handleMenuClick(item.path)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>

    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <span class="section-kicker">{{ currentMeta.kicker }}</span>
          <h1>{{ currentMeta.title }}</h1>
        </div>
        <div class="topbar-card">
          <span>{{ todayText }}</span>
          <b>{{ currentMeta.label }}</b>
        </div>
      </header>

      <section class="view-frame">
        <component :is="currentView" :key="normalizedPath" />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import Home from "./views/HomePage.vue";
import Login from "./views/LoginPage.vue";
import Event from "./views/EventPage.vue";
import Notice from "./views/NoticePage.vue";
import Settings from "./views/SettingsPage.vue";
import NotFound from "./views/NotFound.vue";

const routes = {
  "/": Home,
  "/event": Event,
  "/notice": Notice,
  "/login": Login,
  "/settings": Settings,
};

const routeMeta = {
  "/": { title: "个人总览", label: "Profile", kicker: "DASHBOARD" },
  "/event": { title: "活动发现", label: "Activities", kicker: "EXPLORE" },
  "/notice": { title: "通知公告", label: "Inbox", kicker: "NOTICE" },
  "/login": { title: "账号登录", label: "Auth", kicker: "SECURE" },
  "/settings": { title: "设置", label: "Settings", kicker: "PREFERENCES" },
};

const navItems = [
  { path: "/", label: "主页", icon: "◒" },
  { path: "/event", label: "活动", icon: "✦" },
  { path: "/notice", label: "通知", icon: "✉" },
  { path: "/login", label: "登录", icon: "↗" },
  { path: "/settings", label: "设置", icon: "⚙" },
];

const currentPath = ref(window.location.hash || "#/");

const onHashChange = () => {
  currentPath.value = window.location.hash || "#/";
};

onMounted(() => {
  window.addEventListener("hashchange", onHashChange);
});
onUnmounted(() => {
  window.removeEventListener("hashchange", onHashChange);
});

const normalizedPath = computed(() => currentPath.value.slice(1) || "/");
const currentView = computed(() => routes[normalizedPath.value] || NotFound);
const currentMeta = computed(
  () => routeMeta[normalizedPath.value] || { title: "未找到", label: "404", kicker: "LOST" }
);
const todayText = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date())
);

const handleMenuClick = (path) => {
  window.location.hash = path;
};
</script>

<style scoped>
.app-shell {
  position: relative;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 28px;
  min-height: 100vh;
  padding: 28px;
}

.nav-rail {
  position: sticky;
  top: 28px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  padding: 24px;
}

.brand {
  display: flex;
  gap: 14px;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}

.brand-mark {
  display: grid;
  width: 58px;
  height: 58px;
  color: white;
  font-weight: 900;
  letter-spacing: -0.08em;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.24), transparent),
    linear-gradient(135deg, var(--indigo), var(--primary));
  border-radius: 18px;
  box-shadow: 0 18px 28px rgba(32, 43, 95, 0.22);
}

.brand-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.brand-subtitle {
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
}

.nav-list {
  display: grid;
  gap: 10px;
  margin-top: 28px;
}

.nav-item {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  color: var(--muted);
  font-size: 16px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 18px;
  transition: 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  color: var(--ink);
  background: rgba(242, 106, 46, 0.12);
  transform: translateX(4px);
}

.nav-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.workspace {
  min-width: 0;
}

.topbar {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}

.topbar h1 {
  margin: 12px 0 0;
  font-size: clamp(34px, 4.2vw, 56px);
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.06em;
}

.topbar-card {
  min-width: 150px;
  padding: 14px 18px;
  text-align: right;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 20px;
}

.topbar-card span {
  display: block;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
}

.topbar-card b {
  display: block;
  margin-top: 3px;
  font-size: 20px;
}

.view-frame {
  min-height: calc(100vh - 174px);
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .nav-rail {
    position: relative;
    top: 0;
    height: auto;
  }

  .nav-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .nav-item {
    justify-content: center;
    padding: 12px 8px;
  }

  .nav-icon {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-shell {
    display: block;
    min-height: 100dvh;
    padding: 12px 12px calc(92px + env(safe-area-inset-bottom));
  }

  .nav-rail {
    position: fixed;
    top: auto;
    right: 10px;
    bottom: max(10px, env(safe-area-inset-bottom));
    left: 10px;
    z-index: 30;
    height: auto;
    padding: 8px;
    border-radius: 24px;
    box-shadow: 0 18px 48px rgba(25, 35, 69, 0.2);
  }

  .brand {
    display: none;
  }

  .nav-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    margin-top: 0;
  }

  .nav-item {
    flex-direction: column;
    gap: 3px;
    justify-content: center;
    min-height: 58px;
    padding: 8px 4px;
    font-family: var(--font-ui);
    font-size: 12px;
    border-radius: 18px;
  }

  .nav-item:hover,
  .nav-item.active {
    transform: none;
  }

  .nav-icon {
    display: grid;
    width: 24px;
    height: 24px;
    font-size: 14px;
    border-radius: 8px;
  }

  .topbar {
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .topbar h1 {
    margin-top: 8px;
    font-size: clamp(30px, 10vw, 42px);
    letter-spacing: -0.06em;
  }

  .topbar-card {
    min-width: 92px;
    padding: 10px 12px;
    border-radius: 16px;
  }

  .topbar-card b {
    font-size: 15px;
  }

  .view-frame {
    min-height: auto;
  }
}

@media (max-width: 380px) {
  .topbar-card {
    display: none;
  }
}
</style>
