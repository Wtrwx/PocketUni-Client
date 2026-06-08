<template>
  <div class="notice-page">
    <el-dialog v-model="detailVisible" width="640px" align-center destroy-on-close class="soft-dialog">
      <template #header>
        <div class="dialog-heading">
          <span class="section-kicker">MESSAGE</span>
          <h3>{{ activeMessage?.title || '通知详情' }}</h3>
        </div>
      </template>
      <article v-if="activeMessage" class="message-detail">
        <time>{{ formatMessageTime(activeMessage) }}</time>
        <p>{{ activeMessage.content || activeMessage.summary || '暂无内容' }}</p>
      </article>
    </el-dialog>

    <section class="notice-hero glass-panel">
      <div>
        <span class="section-kicker">INBOX</span>
        <h2>通知公告流</h2>
        <p>集中查看校园通知。</p>
      </div>
      <div class="notice-counter">
        <strong>{{ messages.length }}</strong>
        <span>条通知</span>
      </div>
    </section>

    <section v-loading="loading" class="notice-list glass-panel">
      <button
        v-for="message in messages"
        :key="message.message_id || message.id || message.title"
        class="notice-card"
        type="button"
        @click="openMessage(message)"
      >
        <div class="notice-date">
          <span>{{ dateParts(message).day }}</span>
          <small>{{ dateParts(message).month }}</small>
        </div>
        <div class="notice-content">
          <h3>{{ message.title || '未命名通知' }}</h3>
          <p>{{ message.content || message.summary || '暂无内容' }}</p>
          <time>{{ formatMessageTime(message) }}</time>
        </div>
      </button>

      <el-empty v-if="!loading && !messages.length" description="暂无通知"></el-empty>

      <div class="pagination">
        <el-button @click="prevPage" :disabled="currentPage === 1 || loading">上一页</el-button>
        <span>第 {{ currentPage }} 页</span>
        <el-button @click="nextPage" :disabled="!hasNextPage || loading">下一页</el-button>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { useToast } from "vue-toastification";
import { getClassMessages, isClassSession } from "@/utils/api";
import { getMessage } from "@/utils/mobileapi";
import { formatTime } from "@/utils/utils";
import { safeList } from "@/utils/http";

const readUserData = () => {
  try {
    return JSON.parse(localStorage.getItem("userData") || "null");
  } catch (error) {
    console.error(error);
    return null;
  }
};

const toTimestamp = (message = {}) => {
  const value =
    message.created_at ||
    message.createdAt ||
    message.updatedAt ||
    message.sendTime ||
    message.time ||
    message.create_time;
  if (!value) return 0;
  if (typeof value === "number") return value > 100000000000 ? Math.floor(value / 1000) : value;
  if (/^\d+$/.test(String(value))) {
    const number = Number(value);
    return number > 100000000000 ? Math.floor(number / 1000) : number;
  }
  const parsed = Date.parse(String(value).replace(/-/g, "/"));
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
};

export default {
  setup() {
    const toast = useToast();
    const messages = ref([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const totalItems = ref(0);
    const detailVisible = ref(false);
    const activeMessage = ref(null);

    const hasNextPage = computed(() => {
      if (totalItems.value) return currentPage.value * pageSize.value < totalItems.value;
      return messages.value.length >= pageSize.value;
    });

    const goLogin = () => {
      window.location.hash = "#/login";
    };

    const ensureLoggedIn = () => {
      const loggedIn = localStorage.getItem("loggedIn");
      const userData = readUserData();
      const valid =
        loggedIn === "true" &&
        userData &&
        (isClassSession(userData) || (userData.oauth_token && userData.oauth_token_secret));

      if (!valid) {
        toast.error("未登录或 token 失效，请重新登录", { position: "top-center" });
        goLogin();
        return null;
      }
      return userData;
    };

    const normalizeClassMessage = (message) => ({
      ...message,
      message_id: message.id,
      title: message.title || message.name,
      content: message.content || message.body || message.desc,
      created_at: toTimestamp(message),
    });

    const fetchMessages = async () => {
      const userData = ensureLoggedIn();
      if (!userData) return;

      loading.value = true;
      try {
        if (isClassSession(userData)) {
          const response = await getClassMessages(userData, currentPage.value, 0, pageSize.value);
          const list = safeList(response).map(normalizeClassMessage);
          messages.value = list;
          totalItems.value = response?.total_count || list.length;
          return;
        }

        const response = await getMessage(
          userData.oauth_token,
          userData.oauth_token_secret,
          currentPage.value,
          "1"
        );
        const list = safeList(response);
        messages.value = list.map((message) => ({ ...message, created_at: toTimestamp(message) }));
        totalItems.value = response?.total_count || response?.content?.total_count || list.length;
      } catch (error) {
        toast.error("获取通知失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      } finally {
        loading.value = false;
      }
    };

    const openMessage = (message) => {
      activeMessage.value = message;
      detailVisible.value = true;
    };

    const formatMessageTime = (message) => {
      const timestamp = toTimestamp(message);
      return timestamp ? formatTime(timestamp) : "—";
    };

    const dateParts = (message) => {
      const timestamp = toTimestamp(message);
      if (!timestamp) return { day: "--", month: "未知" };
      const date = new Date(timestamp * 1000);
      return {
        day: String(date.getDate()).padStart(2, "0"),
        month: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`,
      };
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value -= 1;
        fetchMessages();
      }
    };

    const nextPage = () => {
      if (!hasNextPage.value) return;
      currentPage.value += 1;
      fetchMessages();
    };

    onMounted(fetchMessages);

    return {
      messages,
      loading,
      currentPage,
      hasNextPage,
      prevPage,
      nextPage,
      detailVisible,
      activeMessage,
      openMessage,
      formatMessageTime,
      dateParts,
    };
  },
};
</script>

<style scoped>
.notice-page {
  display: grid;
  gap: 22px;
}

.notice-hero,
.notice-list {
  padding: 26px;
}

.notice-hero {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  justify-content: space-between;
  overflow: hidden;
}

.notice-hero h2 {
  margin: 14px 0 6px;
  font-size: clamp(30px, 4.6vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.06em;
}

.notice-hero p,
.notice-content p,
.notice-content time,
.notice-date small,
.message-detail time,
.message-detail p,
.pagination {
  color: var(--muted);
  font-family: var(--font-ui);
}

.notice-hero p {
  max-width: 560px;
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}

.notice-counter {
  display: grid;
  min-width: 150px;
  min-height: 150px;
  place-items: center;
  color: white;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent),
    linear-gradient(135deg, var(--indigo), var(--jade));
  border-radius: 38px;
  box-shadow: var(--shadow-tight);
}

.notice-counter strong {
  margin-bottom: -46px;
  font-size: 58px;
  line-height: 1;
}

.notice-counter span {
  font-family: var(--font-ui);
}

.notice-list {
  display: grid;
  gap: 14px;
  min-height: 420px;
}

.notice-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  padding: 18px;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid var(--line);
  border-radius: 24px;
  transition: 0.2s ease;
}

.notice-card:hover {
  border-color: rgba(242, 106, 46, 0.28);
  box-shadow: var(--shadow-tight);
  transform: translateY(-2px);
}

.notice-date {
  display: grid;
  place-items: center;
  align-self: start;
  min-height: 88px;
  background: rgba(242, 106, 46, 0.1);
  border: 1px solid rgba(242, 106, 46, 0.16);
  border-radius: 20px;
}

.notice-date span {
  margin-bottom: -22px;
  color: var(--primary-deep);
  font-size: 34px;
  font-weight: 900;
}

.notice-content h3 {
  margin: 2px 0 8px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.notice-content p {
  display: -webkit-box;
  margin: 0 0 10px;
  overflow: hidden;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dialog-heading h3 {
  margin: 12px 0 0;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.message-detail {
  padding: 6px 2px;
}

.message-detail time {
  display: block;
  margin-bottom: 14px;
}

.message-detail p {
  margin: 0;
  color: var(--ink);
  line-height: 1.9;
  white-space: pre-wrap;
}

.pagination {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
}

@media (max-width: 760px) {
  .notice-hero,
  .notice-card {
    display: block;
  }

  .notice-counter {
    margin-top: 22px;
  }

  .notice-date {
    max-width: 110px;
    margin-bottom: 14px;
  }
}

@media (max-width: 640px) {
  .notice-page {
    gap: 14px;
  }

  .notice-hero,
  .notice-list {
    max-width: 100%;
    min-width: 0;
    padding: 16px;
    border-radius: 22px;
  }

  .notice-hero h2 {
    margin: 10px 0 6px;
    font-size: clamp(28px, 10vw, 38px);
    line-height: 1.1;
  }

  .notice-hero p {
    font-size: 12px;
    line-height: 1.65;
  }

  .notice-counter {
    display: inline-grid;
    min-width: 112px;
    min-height: 96px;
    margin-top: 16px;
    border-radius: 26px;
  }

  .notice-counter strong {
    margin-bottom: -30px;
    font-size: 42px;
  }

  .notice-list {
    min-height: auto;
    gap: 10px;
  }

  .notice-card {
    max-width: 100%;
    min-width: 0;
    padding: 14px;
    border-radius: 18px;
  }

  .notice-content,
  .message-detail {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .notice-date {
    display: inline-grid;
    min-width: 78px;
    min-height: 68px;
    margin-bottom: 12px;
    border-radius: 16px;
  }

  .notice-date span {
    margin-bottom: -18px;
    font-size: 28px;
  }

  .notice-content h3 {
    font-size: 19px;
    line-height: 1.25;
  }

  .notice-content p,
  .notice-content time,
  .message-detail p {
    font-size: 13px;
  }

  .dialog-heading h3 {
    font-size: 24px;
  }

  .pagination {
    gap: 8px;
    font-size: 12px;
  }
}
</style>
