<template>
  <div class="home-page">
    <el-dialog v-model="myQRVisible" width="420px" align-center destroy-on-close class="soft-dialog">
      <template #header>
        <div class="dialog-heading">
          <span class="section-kicker">IDENTITY QR</span>
          <h3>我的二维码</h3>
        </div>
      </template>
      <div class="qrcode-container">
        <vue-qrcode
          v-if="myQRVisible"
          :value="qrcodeValue"
          :options="{ width: 220, margin: 1 }"
        ></vue-qrcode>
      </div>
      <p v-if="myQRVisible" class="countdown-text">
        二维码将在 <strong>{{ countdown }}</strong> 秒后自动刷新
      </p>
      <p v-if="myQRVisible" class="qrcode-tip">
        动态身份码每 10 秒刷新一次；关闭弹窗后停止刷新。
      </p>
    </el-dialog>

    <el-dialog v-model="myEventVisible" width="78%" align-center destroy-on-close class="soft-dialog">
      <template #header>
        <div class="dialog-heading">
          <span class="section-kicker">MY ACTIVITIES</span>
          <h3>我的活动</h3>
        </div>
      </template>

      <div v-loading="eventLoading" class="event-dialog-body">
        <el-table v-if="eventList.length" :data="eventList" stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="92"></el-table-column>
          <el-table-column label="活动名称" min-width="220">
            <template #default="scope">
              <strong>{{ scope.row.title || scope.row.name || '未命名活动' }}</strong>
              <small>{{ scope.row.category || scope.row.statusName || '活动' }}</small>
            </template>
          </el-table-column>
          <el-table-column prop="credit" label="学分" width="88"></el-table-column>
          <el-table-column label="时间" min-width="180">
            <template #default="scope">
              <div>{{ formatTime(scope.row.sTime) }}</div>
              <div class="muted-line">{{ formatTime(scope.row.eTime) }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="address" label="活动地点" min-width="180"></el-table-column>
        </el-table>
        <el-empty v-else description="暂无活动记录"></el-empty>

        <div class="pagination">
          <el-button @click="prevPage" :disabled="currentPage === 1">上一页</el-button>
          <span>第 {{ currentPage }} 页</span>
          <el-button @click="nextPage" :disabled="!hasNextPage">下一页</el-button>
        </div>
      </div>
    </el-dialog>

    <div v-loading="loading" class="home-content">
      <section v-if="userProfile" class="profile-grid">
        <article class="profile-hero glass-panel">
          <div class="avatar-orb">
            <img
              v-if="avatarVisible"
              :src="avatarUrl"
              alt="头像"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="handleAvatarError"
            />
            <span v-else>{{ initials }}</span>
          </div>

          <div class="profile-copy">
            <span class="section-kicker">{{ platformLabel }}</span>
            <h2>{{ displayName }}</h2>
            <p>
              {{ userProfile.yx || '未获取学院' }} · {{ userProfile.major || '未获取专业' }}
            </p>
          </div>

          <div class="profile-actions">
            <el-button type="primary" @click="generateQRCode">10s 二维码</el-button>
            <el-button @click="getMyEvent">我的活动</el-button>
            <el-button type="danger" plain @click="logout">登出</el-button>
          </div>
        </article>

        <div class="metrics-grid">
          <article v-for="metric in metricCards" :key="metric.label" class="metric-card">
            <span class="metric-label">{{ metric.label }}</span>
            <div class="metric-value">{{ metric.value }}</div>
            <small>{{ metric.hint }}</small>
          </article>
        </div>
      </section>

      <section v-if="userProfile" class="info-board glass-panel">
        <div class="board-header">
          <div>
            <span class="section-kicker">STUDENT DOSSIER</span>
            <h3>学习档案</h3>
          </div>
          <p>查看你的基础资料、二课分与活动记录。</p>
        </div>

        <div class="field-grid">
          <div v-for="field in profileFields" :key="field.label" class="field-tile">
            <span>{{ field.label }}</span>
            <strong>{{ field.value }}</strong>
          </div>
        </div>
      </section>

      <el-empty
        v-if="!loading && !userProfile"
        class="empty-state glass-panel"
        description="尚未加载个人信息，请先登录。"
      >
        <el-button type="primary" @click="goLogin">去登录</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import {
  getClassMyActivityList,
  getClassPersonalProfile,
  getMyEventList,
  getPersonalBasicInfo,
  isClassSession,
  normalizeAvatarUrl,
} from "@/utils/api";
import { getPersonalInfo } from "@/utils/mobileapi";
import { encrypt } from "@/utils/des";
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

const displayValue = (value) => (value === undefined || value === null || value === "" ? "—" : value);
const QR_REFRESH_SECONDS = 10;

export default {
  setup() {
    const toast = useToast();
    const userProfile = ref(null);
    const avatarLoadFailed = ref(false);
    const loading = ref(false);
    const eventLoading = ref(false);
    const myQRVisible = ref(false);
    const myEventVisible = ref(false);
    const qrcodeValue = ref("");
    const countdown = ref(QR_REFRESH_SECONDS);
    const eventList = ref([]);
    const currentPage = ref(1);
    const pageSize = ref(5);
    const totalItems = ref(0);
    let countdownInterval = null;

    const activeUserData = computed(() => readUserData());
    const isClassUser = computed(() => isClassSession(activeUserData.value));
    const platformLabel = computed(() => (isClassUser.value ? "CLASS PLATFORM" : "LEGACY WEB"));
    const displayName = computed(() => displayValue(userProfile.value?.realname));
    const initials = computed(() => String(displayName.value || "PU").trim().slice(0, 1).toUpperCase());
    const avatarUrl = computed(() => {
      const profile = userProfile.value || {};
      const userData = activeUserData.value || {};
      return normalizeAvatarUrl(
        profile.avatar,
        profile.avatarUrl,
        profile.avatorName,
        profile.user_info?.avatar,
        userData.classUserInfo?.avatorName,
        userData.classUserInfo?.avatar,
        userData.baseUserInfo?.avatar,
        userData.user_info?.avatar
      );
    });
    const avatarVisible = computed(() => Boolean(avatarUrl.value) && !avatarLoadFailed.value);
    const hasNextPage = computed(() => {
      if (totalItems.value) return currentPage.value * pageSize.value < totalItems.value;
      return eventList.value.length >= pageSize.value;
    });

    const metricCards = computed(() => [
      { label: "二课分", value: displayValue(userProfile.value?.credit), hint: "Second classroom" },
      { label: "诚信度", value: displayValue(userProfile.value?.cx), hint: "Credit standing" },
      { label: "PU银豆", value: displayValue(userProfile.value?.amount2), hint: "Campus balance" },
      {
        label: "活动 / 群组",
        value: `${displayValue(userProfile.value?.event_count)} / ${displayValue(userProfile.value?.group_count)}`,
        hint: "Participation",
      },
    ]);

    const profileFields = computed(() => [
      { label: "姓名", value: displayName.value },
      { label: "学号", value: displayValue(userProfile.value?.sno) },
      { label: "学院", value: displayValue(userProfile.value?.yx) },
      { label: "专业", value: displayValue(userProfile.value?.major) },
      { label: "年级", value: displayValue(userProfile.value?.year) },
      { label: "班级", value: displayValue(userProfile.value?.class) },
    ]);

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

    const fetchData = async () => {
      const userData = ensureLoggedIn();
      if (!userData) return;

      loading.value = true;
      try {
        if (isClassSession(userData)) {
          const response = await getClassPersonalProfile(userData);
          userProfile.value = response.content;
          avatarLoadFailed.value = false;
          return;
        }

        const response = await getPersonalBasicInfo(
          userData.oauth_token,
          userData.oauth_token_secret
        );
        if (response.code === 0 && response.message === "success") {
          userProfile.value = response.content;
          avatarLoadFailed.value = false;
        } else {
          toast.error("获取个人信息失败", { position: "top-center" });
        }
      } catch (error) {
        if (error?.data?.message === "授权失败" || error?.response?.data?.message === "授权失败") {
          toast.error("未登录或 token 失效，请重新登录", { position: "top-center" });
          goLogin();
        } else {
          toast.error("获取个人信息失败，请检查网络连接。", { position: "top-center" });
          console.error(error);
        }
      } finally {
        loading.value = false;
      }
    };

    const getMyEvent = async () => {
      const userData = ensureLoggedIn();
      if (!userData) return;

      eventLoading.value = true;
      try {
        if (isClassSession(userData)) {
          const response = await getClassMyActivityList(
            userData,
            currentPage.value,
            pageSize.value,
            1
          );
          const list = safeList(response);
          eventList.value = list;
          totalItems.value = response?.total_count || list.length;
          myEventVisible.value = true;
          return;
        }

        const response = await getMyEventList(
          userData.oauth_token,
          userData.oauth_token_secret,
          currentPage.value,
          pageSize.value
        );
        const list = safeList(response);
        eventList.value = list;
        totalItems.value = response?.total_count || response?.content?.total_count || list.length;
        myEventVisible.value = true;
      } catch (error) {
        if (error?.data?.message === "授权失败" || error?.response?.data?.message === "授权失败") {
          toast.error("未登录或 token 失效，请重新登录", { position: "top-center" });
          goLogin();
        } else {
          toast.error("获取活动列表失败，请检查网络连接。", { position: "top-center" });
          console.error(error);
        }
      } finally {
        eventLoading.value = false;
      }
    };

    const clearCountdown = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    const startCountdown = () => {
      clearCountdown();
      countdownInterval = setInterval(() => {
        if (!myQRVisible.value) {
          clearCountdown();
          return;
        }
        if (countdown.value > 0) {
          countdown.value -= 1;
        } else {
          generateQRCode();
        }
      }, 1000);
    };

    const generateQRCode = async () => {
      const userData = ensureLoggedIn();
      if (!userData) return;

      try {
        let uid;
        let username;
        if (isClassSession(userData)) {
          const identity = userData.classUserInfo || userData.baseUserInfo || {};
          uid = identity.uid || identity.id || userData.user_info?.uid;
          username = identity.username || identity.uname || userData.user_info?.uname;
        } else {
          const personalInfo = await getPersonalInfo(userData.oauth_token, userData.oauth_token_secret);
          uid = userData.user_info?.uid;
          username = personalInfo.content?.user_info?.uname;
        }

        if (!uid || !username) throw new Error("二维码身份信息不完整");
        const time = Math.floor(Date.now() / 1000);
        qrcodeValue.value = encrypt(`xyhui://user/${uid}/${time}/${username}`);
        myQRVisible.value = true;
        countdown.value = QR_REFRESH_SECONDS;
        startCountdown();
      } catch (error) {
        toast.error("生成二维码失败。", { position: "top-center" });
        console.error(error);
      }
    };

    const logout = () => {
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("userData");
      clearCountdown();
      toast.success("登出成功", { position: "top-center" });
      goLogin();
    };

    const handleAvatarError = () => {
      avatarLoadFailed.value = true;
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value -= 1;
        getMyEvent();
      }
    };

    const nextPage = () => {
      if (!hasNextPage.value) return;
      currentPage.value += 1;
      getMyEvent();
    };

    watch(myQRVisible, (visible) => {
      if (!visible) clearCountdown();
    });

    onMounted(fetchData);
    onUnmounted(clearCountdown);

    return {
      userProfile,
      loading,
      eventLoading,
      logout,
      myQRVisible,
      generateQRCode,
      qrcodeValue,
      countdown,
      myEventVisible,
      eventList,
      getMyEvent,
      currentPage,
      prevPage,
      nextPage,
      hasNextPage,
      formatTime,
      metricCards,
      profileFields,
      displayName,
      initials,
      avatarUrl,
      avatarVisible,
      handleAvatarError,
      platformLabel,
      goLogin,
    };
  },
};
</script>

<style scoped>
.home-page {
  display: grid;
  gap: 22px;
}

.home-content {
  min-height: 520px;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(360px, 1fr);
  gap: 22px;
}

.profile-hero {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 22px;
  align-items: center;
  min-height: 300px;
  padding: 30px;
  overflow: hidden;
}

.profile-hero::after {
  position: absolute;
  right: -120px;
  bottom: -160px;
  width: 360px;
  height: 360px;
  content: "";
  background: radial-gradient(circle, rgba(242, 106, 46, 0.2), transparent 65%);
}

.avatar-orb {
  position: relative;
  z-index: 1;
  display: grid;
  width: 132px;
  height: 132px;
  place-items: center;
  overflow: hidden;
  color: white;
  font-size: 56px;
  font-weight: 900;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.22), transparent),
    linear-gradient(135deg, var(--indigo), var(--jade));
  border: 8px solid rgba(255, 255, 255, 0.7);
  border-radius: 42px;
  box-shadow: var(--shadow-tight);
}

.avatar-orb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-copy {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.profile-copy h2 {
  margin: 18px 0 8px;
  font-size: clamp(42px, 7vw, 82px);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.1em;
}

.profile-copy p {
  max-width: 420px;
  margin: 0;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 15px;
  line-height: 1.8;
}

.profile-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.metric-card small {
  position: relative;
  z-index: 1;
  color: var(--muted);
  font-family: var(--font-ui);
}

.info-board {
  padding: 28px;
  margin-top: 22px;
}

.board-header {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.board-header h3,
.dialog-heading h3 {
  margin: 12px 0 0;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.board-header p {
  max-width: 420px;
  margin: 0;
  color: var(--muted);
  font-family: var(--font-ui);
  line-height: 1.7;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.field-tile {
  padding: 18px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.field-tile span,
.muted-line,
.countdown-text,
.qrcode-tip {
  color: var(--muted);
  font-family: var(--font-ui);
}

.field-tile strong {
  display: block;
  margin-top: 8px;
  font-size: 18px;
}

.qrcode-container {
  display: grid;
  place-items: center;
  min-height: 250px;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(135deg, var(--primary), var(--jade)) border-box;
  border: 10px solid transparent;
  border-radius: 28px;
}

.countdown-text {
  margin: 16px 0 0;
  text-align: center;
}

.countdown-text strong {
  color: var(--primary-deep);
  font-size: 22px;
}

.qrcode-tip {
  margin: 8px 0 0;
  font-size: 12px;
  text-align: center;
}

.event-dialog-body {
  min-height: 220px;
}

.pagination {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  margin-top: 22px;
  color: var(--muted);
  font-family: var(--font-ui);
}

.empty-state {
  padding: 70px 20px;
}

@media (max-width: 1120px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .profile-hero,
  .board-header {
    display: block;
  }

  .profile-copy {
    margin-top: 18px;
  }

  .profile-actions {
    margin-top: 22px;
  }

  .metrics-grid,
  .field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home-page {
    gap: 14px;
  }

  .home-content {
    min-height: auto;
  }

  .profile-grid {
    gap: 14px;
  }

  .profile-hero {
    min-height: auto;
    padding: 20px;
    border-radius: 22px;
  }

  .profile-hero::after {
    right: -150px;
    bottom: -190px;
  }

  .avatar-orb {
    width: 92px;
    height: 92px;
    font-size: 40px;
    border-width: 6px;
    border-radius: 30px;
  }

  .profile-copy h2 {
    margin-top: 14px;
    font-size: clamp(36px, 15vw, 58px);
  }

  .profile-copy p {
    font-size: 13px;
  }

  .profile-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .profile-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .metrics-grid {
    gap: 10px;
  }

  .info-board {
    padding: 18px;
    margin-top: 14px;
  }

  .board-header {
    padding-bottom: 16px;
  }

  .board-header h3,
  .dialog-heading h3 {
    font-size: 24px;
  }

  .board-header p {
    margin-top: 10px;
    font-size: 13px;
  }

  .field-grid {
    gap: 10px;
    margin-top: 16px;
  }

  .field-tile {
    padding: 14px;
    border-radius: 16px;
  }

  .qrcode-container {
    min-height: 230px;
    border-width: 8px;
    border-radius: 22px;
  }

  .event-dialog-body {
    overflow-x: auto;
  }

  .pagination {
    gap: 8px;
    font-size: 12px;
  }
}
</style>
