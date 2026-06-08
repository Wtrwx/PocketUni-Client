<template>
  <div class="login-page glass-panel">
    <section class="login-hero">
      <span class="section-kicker">AUTHORIZED ACCESS</span>
      <h2>PU 口袋校园</h2>
      <p>登录后查看活动、通知与个人资料。</p>
      <div class="login-badges">
        <span>账号登录</span>
        <span>扫码登录</span>
        <span>校园服务</span>
      </div>
    </section>

    <section class="login-card">
      <form @submit.prevent="login" class="login-form">
        <div class="login-mode-note">
          <div>
            <span>当前通道</span>
            <strong>{{ apiModeOption.label }}</strong>
          </div>
          <button type="button" @click="goSettings">设置</button>
        </div>

        <label>学校</label>
        <el-select
          v-model="selectedSchool"
          filterable
          placeholder="选择学校"
          class="custom-select"
          :style="{ width: '100%' }"
          @change="handleSchoolChange"
        >
          <el-option
            v-for="school in schoolList"
            :key="school.email || school.go_id || school.id"
            :label="school.name"
            :value="school.email"
          >
            <span>{{ school.name }}</span>
            <span v-if="schoolPlatformLabel(school)" class="school-tag">
              {{ schoolPlatformLabel(school) }}
            </span>
          </el-option>
        </el-select>

        <label>账号</label>
        <el-input v-model="username" placeholder="请输入学号 / 用户名" required></el-input>

        <label>密码</label>
        <el-input
          v-model="password"
          placeholder="请输入密码"
          type="password"
          show-password
          required
        ></el-input>

        <el-button class="login-submit" type="primary" native-type="submit">
          登录控制台
        </el-button>
      </form>

      <div class="qr-code-container">
        <div class="qr-frame">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="二维码" />
          <span v-else>QR</span>
        </div>
        <p>{{ qrCodeUrl ? "使用PU口袋校园APP扫码登录" : "选择学校后可扫码登录" }}</p>
      </div>
    </section>
  </div>
</template>
<script>
import {
  classLogin,
  getClassSchools,
  getClassLoginQRCode,
  getLoginQRCode,
  getSchools,
  getSchoolSid,
  isGoSchool as apiIsGoSchool,
  login as legacyLogin,
  pollingClassLogin,
  pollingLogin,
} from "@/utils/api";
import { API_MODE_CHANGED_EVENT, getApiMode, getApiModeOption } from "@/utils/apiMode";
import { useToast } from "vue-toastification";
import { ElSelect, ElOption, ElInput, ElButton } from "element-plus";

export default {
  components: {
    ElSelect,
    ElOption,
    ElInput,
    ElButton,
  },

  setup() {
    const toast = useToast();
    return { toast };
  },

  data() {
    return {
      username: "",
      password: "",
      error: "",
      qrCodeUrl: "",
      pollingTimer: null,
      selectedSchool: "",
      schoolList: [],
      apiMode: getApiMode(),
    };
  },

  computed: {
    selectedSchoolInfo() {
      return this.schoolList.find((school) => school.email === this.selectedSchool);
    },
    apiModeOption() {
      return getApiModeOption(this.apiMode);
    },
  },

  async created() {
    // Always load schools immediately. Headless/Electron background windows may
    // report a non-visible document state, and delaying this request leaves the
    // login form without selectable schools.
    await this.fetchSchools();
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener(API_MODE_CHANGED_EVENT, this.handleApiModeSync);
  },

  beforeUnmount() {
    this.clearPolling();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener(API_MODE_CHANGED_EVENT, this.handleApiModeSync);
  },

  methods: {
    isGoSchool(school) {
      return this.shouldUseClassApi(school);
    },

    shouldUseClassApi(school) {
      if (this.apiMode === "class") return true;
      if (this.apiMode === "web" || this.apiMode === "ios") return false;
      return apiIsGoSchool(school);
    },

    schoolPlatformLabel(school) {
      if (this.shouldUseClassApi(school)) return "Class";
      if (this.apiMode === "web" || this.apiMode === "ios") return "Web";
      return "";
    },

    goSettings() {
      window.location.hash = "#/settings";
    },

    async handleApiModeSync(event) {
      const nextMode = event?.detail?.mode || getApiMode();
      if (nextMode === this.apiMode) return;
      this.apiMode = nextMode;
      this.selectedSchool = "";
      this.schoolList = [];
      this.qrCodeUrl = "";
      this.clearPolling();
      await this.fetchSchools();
    },

    async handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (!this.schoolList.length) await this.fetchSchools();
        if (this.selectedSchool) await this.startQRCodePolling();
      }
    },
    async loadQRCodeAndStartPolling() {
      await this.fetchSchools();
      await this.startQRCodePolling();
    },

    getSelectedSchool() {
      return this.schoolList.find((school) => school.email === this.selectedSchool);
    },

    async handleSchoolChange() {
      await this.startQRCodePolling();
    },

    clearPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    },

    async startQRCodePolling() {
      this.clearPolling();
      this.qrCodeUrl = "";
      const selectedSchool = this.getSelectedSchool();
      if (!selectedSchool) return;

      try {
        const classSchool = this.shouldUseClassApi(selectedSchool);
        const response = classSchool
          ? await getClassLoginQRCode(getSchoolSid(selectedSchool))
          : await getLoginQRCode();

        if (response.code === 0) {
          this.qrCodeUrl = classSchool
            ? `data:image/png;base64,${response.data.url}`
            : response.content.dataUrl;
          const token = classSchool ? response.data.qrcodeId : response.content.token;
          this.pollingTimer = setInterval(async () => {
            // 检测当前URL是否为 #/login
            if (window.location.hash !== "#/login") {
              // 如果不是 #/login，则停止轮询
              this.clearPolling();
              return;
            }

            try {
              const result = classSchool
                ? await pollingClassLogin(token, selectedSchool)
                : await pollingLogin(token);
              if (
                result.code === 0 &&
                (result.message === "success" || result.msg === "成功" || result.content)
              ) {
                // 处理登录成功逻辑
                console.log("登录成功");
                this.toast.success("登录成功", { position: "top-center" });
                // 保存登录状态和用户信息到本地存储
                localStorage.setItem("loggedIn", "true");
                localStorage.setItem("userData", JSON.stringify(result.content));
                window.location.hash = "#/";
                this.clearPolling();
              } else if (result.code === 2 && result.message === "token失效") {
                // 处理token失效逻辑
                console.log("token失效");
                await this.startQRCodePolling();
              }
            } catch (error) {
              console.error(error);
            }
          }, 1500);
        } else {
          console.error(response.message);
          this.toast.error("获取二维码失败，请重试。", { position: "top-center" });
        }
      } catch (error) {
        console.error(error);
        this.toast.error("获取二维码失败，请检查网络连接。", { position: "top-center" });
      }
    },

    normalizeClassSchool(school) {
      return {
        ...school,
        email: `class:${school.id}`,
        go_id: school.id,
        is_go: 1,
        apiPlatform: "class",
      };
    },

    async fetchSchools() {
      try {
        const loadLegacySchools = this.apiMode !== "class";
        const loadClassSchools = this.apiMode !== "web" && this.apiMode !== "ios";
        const [legacyResult, classResult] = await Promise.allSettled([
          loadLegacySchools ? getSchools({ silent: true }) : Promise.resolve([]),
          loadClassSchools ? getClassSchools() : Promise.resolve({ data: { list: [] } }),
        ]);
        const legacySchools = legacyResult.status === "fulfilled" && Array.isArray(legacyResult.value)
          ? legacyResult.value.map((school) => ({ ...school, apiPlatform: "web" }))
          : [];
        const classSchools =
          classResult.status === "fulfilled"
            ? (classResult.value?.data?.list || []).map(this.normalizeClassSchool)
            : [];

        let schools = [];
        if (this.apiMode === "class") {
          schools = classSchools;
        } else if (this.apiMode === "web" || this.apiMode === "ios") {
          schools = legacySchools;
        } else {
          const merged = new Map();
          legacySchools.forEach((school) => {
            merged.set(`${school.name}:${school.email || school.id || ""}`, school);
          });
          classSchools.forEach((school) => {
            const legacyMatch = [...merged.values()].find((item) => item.name === school.name);
            if (legacyMatch) {
              legacyMatch.go_id = legacyMatch.go_id || school.id;
              legacyMatch.is_go = legacyMatch.is_go ?? 1;
              return;
            }
            merged.set(`${school.name}:${school.id}`, school);
          });
          schools = [...merged.values()];
        }

        this.schoolList = schools.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN")
        );
        if (!this.schoolList.length) {
          throw new Error("学校列表为空");
        }
      } catch (error) {
        console.error(error);
        this.toast.error("获取学校列表失败，请检查网络连接。", { position: "top-center" });
      }
    },

    async login() {
      try {
        const selectedSchool = this.schoolList.find(
          (school) => school.email === this.selectedSchool
        );
        if (!selectedSchool) {
          this.toast.error("请选择学校", { position: "top-center" });
          return;
        }

        if (this.shouldUseClassApi(selectedSchool)) {
          const response = await classLogin(
            this.username,
            this.password,
            getSchoolSid(selectedSchool),
            selectedSchool
          );

          if (response.code === 0) {
            console.log("登录成功");
            this.toast.success("登录成功", { position: "top-center" });
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("userData", JSON.stringify(response.content));
            window.location.hash = "#/";
          } else {
            this.toast.error(response.msg || response.message || "登录失败", {
              position: "top-center",
            });
          }
          return;
        }

        const usernameWithSchool = this.username + selectedSchool.email;
        const response = await legacyLogin(
          usernameWithSchool,
          "pc",
          this.password,
          this.username,
          "",
          selectedSchool.email
        );

        if (response.message === "success") {
          console.log("登录成功");
          this.toast.success("登录成功", { position: "top-center" });
          localStorage.setItem("loggedIn", "true");
          localStorage.setItem("userData", JSON.stringify(response.content));
          window.location.hash = "#/";
        } else {
          console.log(response.message);
          this.toast.error(response.message, { position: "top-center" });
        }
      } catch (error) {
        console.error(error);
        this.toast.error("登录失败，请检查用户名和密码。", { position: "top-center" });
      }
    },
  },
};
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
  gap: 28px;
  min-height: 620px;
  padding: 24px;
  overflow: hidden;
}

.login-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 560px;
  padding: 34px;
  color: white;
  overflow: hidden;
  background:
    linear-gradient(160deg, rgba(20, 28, 62, 0.98), rgba(32, 43, 95, 0.8)),
    radial-gradient(circle at 20% 20%, rgba(242, 106, 46, 0.6), transparent 30%);
  border-radius: 26px;
}

.login-hero::before {
  position: absolute;
  inset: -30% -20% auto auto;
  width: 360px;
  height: 360px;
  content: "";
  background: conic-gradient(from 120deg, var(--primary), transparent, var(--jade));
  border-radius: 50%;
  filter: blur(6px);
  opacity: 0.55;
}

.login-hero h2 {
  position: relative;
  max-width: 420px;
  margin: 16px 0 10px;
  font-size: clamp(32px, 4.2vw, 52px);
  font-weight: 900;
  line-height: 1.04;
  letter-spacing: -0.06em;
}

.login-hero p {
  position: relative;
  max-width: 440px;
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.7;
}

.login-badges {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.login-badges span {
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.86);
  font-family: var(--font-ui);
  font-size: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}

.login-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-content: center;
  padding: 34px;
}

.login-form {
  display: grid;
  gap: 12px;
}

.login-mode-note {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 4px;
  background: rgba(23, 32, 51, 0.04);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.login-mode-note span {
  display: block;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
}

.login-mode-note strong {
  display: block;
  margin-top: 3px;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.login-mode-note button {
  flex: 0 0 auto;
  padding: 8px 12px;
  color: var(--primary-deep);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  background: rgba(242, 106, 46, 0.12);
  border: 1px solid rgba(242, 106, 46, 0.18);
  border-radius: 999px;
}

.login-form label {
  margin-top: 6px;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 700;
}

.school-tag {
  float: right;
  padding: 2px 8px;
  color: var(--primary-deep);
  font-size: 12px;
  background: rgba(242, 106, 46, 0.12);
  border-radius: 999px;
}

.login-submit {
  width: 100%;
  height: 48px;
  margin-top: 18px;
  font-size: 16px;
  font-weight: 900;
}

.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.54);
  border: 1px solid var(--line);
  border-radius: 24px;
}

.qr-frame {
  display: grid;
  width: 190px;
  height: 190px;
  place-items: center;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(135deg, var(--primary), var(--jade)) border-box;
  border: 10px solid transparent;
  border-radius: 28px;
}

.qr-frame img {
  width: 160px;
  height: 160px;
  border-radius: 12px;
}

.qr-frame span {
  color: rgba(23, 32, 51, 0.22);
  font-size: 46px;
  font-weight: 900;
  letter-spacing: -0.12em;
}

.qr-code-container p {
  margin: 14px 0 0;
  color: var(--muted);
  font-family: var(--font-ui);
}

@media (max-width: 1000px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-hero {
    min-height: 320px;
  }
}

@media (max-width: 640px) {
  .login-page {
    gap: 14px;
    min-height: auto;
    padding: 12px;
    overflow: visible;
  }

  .login-hero {
    min-height: 230px;
    padding: 22px;
    border-radius: 22px;
  }

  .login-hero::before {
    width: 240px;
    height: 240px;
    opacity: 0.42;
  }

  .login-hero h2 {
    max-width: 300px;
    margin: 12px 0 8px;
    font-size: clamp(28px, 10vw, 38px);
    line-height: 1.08;
    letter-spacing: -0.06em;
  }

  .login-hero p {
    font-size: 12px;
    line-height: 1.65;
  }

  .login-badges {
    gap: 6px;
    margin-top: 16px;
  }

  .login-badges span {
    padding: 6px 9px;
    font-size: 11px;
  }

  .login-card {
    gap: 16px;
    padding: 8px 2px 0;
  }

  .login-form {
    padding: 16px;
    background: rgba(255, 255, 255, 0.58);
    border: 1px solid var(--line);
    border-radius: 20px;
  }

  .login-mode-note {
    padding: 10px 12px;
    border-radius: 16px;
  }

  .login-mode-note strong {
    font-size: 16px;
  }

  .login-submit {
    height: 46px;
    margin-top: 10px;
  }

  .qr-code-container {
    padding: 16px;
    border-radius: 20px;
  }

  .qr-frame {
    width: 150px;
    height: 150px;
    border-width: 8px;
    border-radius: 24px;
  }

  .qr-frame img {
    width: 126px;
    height: 126px;
  }

  .qr-frame span {
    font-size: 38px;
  }

  .qr-code-container p {
    font-size: 12px;
    text-align: center;
  }
}
</style>
