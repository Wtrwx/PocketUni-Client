<template>
  <div class="settings-page">
    <section class="settings-hero glass-panel">
      <div class="hero-copy">
        <span class="section-kicker">PREFERENCES</span>
        <h2>设置</h2>
        <p>管理登录通道与客户端偏好。切换后会影响学校列表、扫码登录和后续请求。</p>
      </div>

      <div class="current-mode-card">
        <span>当前通道</span>
        <strong>{{ currentOption.label }}</strong>
        <small>{{ currentOption.description }}</small>
      </div>
    </section>

    <section class="api-settings glass-panel">
      <div class="settings-section-head">
        <div>
          <span class="section-kicker">API MODE</span>
          <h3>接口通道</h3>
        </div>
        <el-button type="primary" plain @click="resetApiMode">恢复智能匹配</el-button>
      </div>

      <div class="mode-grid">
        <button
          v-for="option in options"
          :key="option.value"
          :class="['mode-card', { active: apiMode === option.value }]"
          type="button"
          @click="chooseApiMode(option.value)"
        >
          <span class="mode-code">{{ option.shortLabel }}</span>
          <h4>{{ option.label }}</h4>
          <p>{{ option.description }}</p>
          <small>{{ modeHint(option.value) }}</small>
        </button>
      </div>
    </section>

    <section class="password-console glass-panel">
      <div class="settings-section-head">
        <div>
          <span class="section-kicker">PASSWORD</span>
          <h3>密码重置 / 安全自测</h3>
        </div>
      </div>

      <div class="password-grid">
        <article class="password-card">
          <span>当前账号改密</span>
          <h4>/apis/user/reset-passwd</h4>
          <p>需要已登录 Class 会话和原密码，只作用于当前账号。</p>
          <el-input
            v-model="passwordForm.originPassword"
            show-password
            type="password"
            placeholder="原密码"
          ></el-input>
          <el-input
            v-model="passwordForm.password"
            show-password
            type="password"
            placeholder="新密码"
          ></el-input>
          <el-input
            v-model="passwordForm.confirmPassword"
            show-password
            type="password"
            placeholder="确认新密码"
          ></el-input>
          <el-button
            type="danger"
            plain
            :disabled="!canUseClassSession || passwordLoading"
            :loading="passwordLoading && passwordAction === 'change'"
            @click="submitPasswordAction('change')"
          >
            修改当前账号密码
          </el-button>
        </article>

        <article class="password-card audit">
          <span>授权重置测试</span>
          <h4>/uc/user/send-code + /uc/user/reset-password</h4>
          <p>
            已开放 username / sid / phone 输入；只用在你有授权的测试账号，提交前会再次确认。
          </p>
          <el-input
            v-model="forgotForm.username"
            clearable
            placeholder="目标 username / 学号"
          ></el-input>
          <el-select
            v-model="forgotForm.sid"
            :loading="schoolLoading"
            allow-create
            clearable
            default-first-option
            filterable
            placeholder="选择学校或直接输入 sid"
          >
            <el-option
              v-for="school in schoolList"
              :key="school.key"
              :label="school.label"
              :value="school.sid"
            >
              <span>{{ school.name }}</span>
              <span v-if="school.platform" class="school-tag">{{ school.platform }}</span>
              <small class="school-sid">sid: {{ school.sid }}</small>
            </el-option>
          </el-select>
          <div class="password-actions compact">
            <el-button :disabled="!currentUsername" @click="fillCurrentPasswordTarget">
              填当前账号
            </el-button>
            <el-button :loading="schoolLoading" @click="fetchSchoolsForPassword">
              刷新学校
            </el-button>
          </div>
          <el-input
            v-model="forgotForm.password"
            show-password
            type="password"
            placeholder="忘记密码流程的新密码"
          ></el-input>
          <el-input
            v-model="forgotForm.confirmPassword"
            show-password
            type="password"
            placeholder="确认新密码"
          ></el-input>
          <div class="password-actions">
            <el-button
              :disabled="!canUseForgotPasswordApi || passwordLoading"
              :loading="passwordLoading && passwordAction === 'phone'"
              @click="submitPasswordAction('phone')"
            >
              查目标绑定手机号
            </el-button>
            <el-button
              :disabled="!canUseForgotPasswordApi || passwordLoading"
              :loading="passwordLoading && passwordAction === 'code'"
              @click="submitPasswordAction('code')"
            >
              给目标发验证码
            </el-button>
            <el-button
              type="warning"
              plain
              :disabled="!canUseForgotPasswordApi || passwordLoading"
              :loading="passwordLoading && passwordAction === 'forgot-reset'"
              @click="submitPasswordAction('forgot-reset')"
            >
              重置目标账号
            </el-button>
          </div>

          <h4>/apis/personal/send/code</h4>
          <p>旧版手机号验证码接口，字段只传 phone 和可选 type。</p>
          <el-input
            v-model="forgotForm.phone"
            clearable
            placeholder="任意手机号 phone"
          ></el-input>
          <el-input
            v-model="forgotForm.type"
            clearable
            placeholder="type，可留空"
          ></el-input>
          <div class="password-actions">
            <el-button
              type="danger"
              plain
              :disabled="!canUsePhoneCodeApi || passwordLoading"
              :loading="passwordLoading && passwordAction === 'personal-code'"
              @click="submitPasswordAction('personal-code')"
            >
              给手机号发验证码
            </el-button>
          </div>
          <p class="password-result">{{ passwordResultText || passwordAuditText }}</p>
        </article>
      </div>
    </section>

    <section class="settings-info-grid">
      <article class="settings-note glass-panel">
        <span>登录体验</span>
        <h4>学校列表会随通道变化</h4>
        <p>
          “传统 Web”和“新版 Class”会分别只展示对应平台学校；“智能匹配”会合并展示并自动判断。
        </p>
      </article>

      <article class="settings-note glass-panel">
        <span>当前会话</span>
        <h4>{{ sessionTitle }}</h4>
        <p>{{ sessionText }}</p>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  API_MODE_CHANGED_EVENT,
  API_MODE_OPTIONS,
  getApiMode,
  getApiModeOption,
  setApiMode,
} from "@/utils/apiMode";
import {
  changeClassPassword,
  getClassSchools,
  getClassForgotPasswordPhone,
  getClassSelfUsername,
  getSchoolSid,
  getSchools,
  isClassSession,
  resetClassForgotPassword,
  sendClassForgotPasswordCode,
  sendClassPersonalCode,
} from "@/utils/api";

const apiMode = ref(getApiMode());
const options = API_MODE_OPTIONS;
const passwordForm = ref({
  originPassword: "",
  password: "",
  confirmPassword: "",
});
const forgotForm = ref({
  username: "",
  sid: "",
  password: "",
  confirmPassword: "",
  phone: "",
  type: "",
});
const passwordLoading = ref(false);
const passwordAction = ref("");
const passwordResultText = ref("");
const schoolLoading = ref(false);
const schoolList = ref([]);

const readUserData = () => {
  try {
    return JSON.parse(localStorage.getItem("userData") || "null");
  } catch {
    return null;
  }
};

const currentOption = computed(() => getApiModeOption(apiMode.value));
const userData = computed(() => readUserData());
const loggedIn = computed(() => localStorage.getItem("loggedIn") === "true" && userData.value);
const currentUsername = computed(() => getClassSelfUsername(userData.value) || "");
const currentSid = computed(() => userData.value?.sid || "");
const canUseClassSession = computed(() => Boolean(loggedIn.value && isClassSession(userData.value)));
const targetUsername = computed(() => String(forgotForm.value.username || "").trim());
const targetSid = computed(() => String(forgotForm.value.sid || "").trim());
const targetPhone = computed(() => String(forgotForm.value.phone || "").trim());
const canUseForgotPasswordApi = computed(() => Boolean(targetUsername.value && targetSid.value));
const canUsePhoneCodeApi = computed(() => Boolean(canUseClassSession.value && targetPhone.value));
const passwordAuditText = computed(() => {
  if (!canUseClassSession.value) {
    return "忘记密码接口可填 username + sid 测试；旧版手机号发码需要先登录 Class 会话。";
  }
  return "已开放授权测试输入：忘记密码只传 username + sid；旧版手机号发码只传 phone + 可选 type。";
});
const sessionTitle = computed(() => {
  if (!loggedIn.value) return "尚未登录";
  return isClassSession(userData.value) ? "已登录新版 Class" : "已登录传统 Web";
});
const sessionText = computed(() => {
  if (!loggedIn.value) return "登录前可先选择通道，登录页会按当前设置刷新学校列表。";
  return "通道设置主要影响下一次登录与旧接口来源参数；如需更换平台，请重新登录。";
});

const modeHint = (mode) => {
  const hints = {
    auto: "推荐：优先保证可用性",
    web: "旧版学校 / 传统接口",
    class: "新平台学校 / Class 接口",
    ios: "实验：App 来源参数",
  };
  return hints[mode] || "";
};

const chooseApiMode = (mode) => {
  apiMode.value = setApiMode(mode);
};

const resetApiMode = () => {
  chooseApiMode("auto");
};

const normalizeClassSchool = (school) => ({
  ...school,
  go_id: school.id,
  is_go: 1,
  apiPlatform: "class",
});

const schoolPlatformLabel = (school) => {
  if (school.apiPlatform === "class") return "Class";
  if (school.apiPlatform === "web") return "Web";
  return "";
};

const toSchoolOption = (school) => {
  const sid = getSchoolSid(school);
  if (!Number.isFinite(sid) || sid <= 0) return null;
  return {
    key: `${school.name || "school"}:${sid}:${school.apiPlatform || ""}`,
    name: school.name || `学校 ${sid}`,
    label: `${school.name || `学校 ${sid}`}（sid: ${sid}）`,
    sid: String(sid),
    platform: schoolPlatformLabel(school),
  };
};

const fetchSchoolsForPassword = async () => {
  schoolLoading.value = true;
  try {
    const loadLegacySchools = apiMode.value !== "class";
    const loadClassSchools = apiMode.value !== "web" && apiMode.value !== "ios";
    const [legacyResult, classResult] = await Promise.allSettled([
      loadLegacySchools ? getSchools({ silent: true }) : Promise.resolve([]),
      loadClassSchools ? getClassSchools({ silent: true }) : Promise.resolve({ data: { list: [] } }),
    ]);
    const legacySchools = legacyResult.status === "fulfilled" && Array.isArray(legacyResult.value)
      ? legacyResult.value.map((school) => ({ ...school, apiPlatform: "web" }))
      : [];
    const classSchools =
      classResult.status === "fulfilled"
        ? (classResult.value?.data?.list || []).map(normalizeClassSchool)
        : [];

    const merged = new Map();
    const pushSchool = (school) => {
      const option = toSchoolOption(school);
      if (!option) return;
      const existing = merged.get(option.sid);
      if (!existing || option.platform === "Class") merged.set(option.sid, option);
    };

    if (apiMode.value === "class") {
      classSchools.forEach(pushSchool);
    } else if (apiMode.value === "web" || apiMode.value === "ios") {
      legacySchools.forEach(pushSchool);
    } else {
      legacySchools.forEach(pushSchool);
      classSchools.forEach(pushSchool);
    }

    schoolList.value = [...merged.values()].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN")
    );
  } catch (error) {
    ElMessage.error("获取学校列表失败，可直接手动输入 sid。");
    console.error(error);
  } finally {
    schoolLoading.value = false;
  }
};

const fillCurrentPasswordTarget = () => {
  forgotForm.value.username = currentUsername.value || "";
  forgotForm.value.sid = currentSid.value ? String(currentSid.value) : "";
};

const responseText = (response, fallback) => {
  const message = response?.msg || response?.message || response?.data?.msg || response?.data?.message;
  const code = response?.code ?? response?.data?.code;
  if (message) return code === undefined ? String(message) : `${message}（code: ${code}）`;
  if (code !== undefined) return `${fallback}（code: ${code}）`;
  return fallback;
};

const maskPhone = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
};

const phoneFromResponse = (response) => {
  const data = response?.data?.data || response?.data || response || {};
  return data.phone || data.mobile || data.tel || data.phoneNumber || data.bindPhone || "";
};

const confirmPasswordAction = (config) =>
  ElMessageBox.confirm(config.message, "密码接口确认", {
    type: config.type || "warning",
    center: true,
    confirmButtonText: config.confirmText || "确认执行",
    cancelButtonText: "取消",
    autofocus: false,
  });

const submitPasswordAction = async (action) => {
  if (action === "change" && !canUseClassSession.value) {
    const message = "当前账号改密需要先登录新版 Class 会话。";
    passwordResultText.value = message;
    ElMessage.warning(message);
    return;
  }
  if (["phone", "code", "forgot-reset"].includes(action) && !canUseForgotPasswordApi.value) {
    const message = "请先填写目标 username 和学校 sid。";
    passwordResultText.value = message;
    ElMessage.warning(message);
    return;
  }
  if (action === "personal-code" && !canUsePhoneCodeApi.value) {
    const message = canUseClassSession.value
      ? "请先填写手机号。"
      : "旧版手机号发码需要先登录新版 Class 会话。";
    passwordResultText.value = message;
    ElMessage.warning(message);
    return;
  }

  const configs = {
    change: {
      message: "确认修改当前登录账号密码？不会在界面回显密码。",
      confirmText: "确认改密",
      type: "error",
    },
    phone: {
      message: `确认查询目标账号 ${targetUsername.value} 的绑定手机号？结果会原样显示。`,
      confirmText: "确认查询",
    },
    code: {
      message: `确认给目标账号 ${targetUsername.value} 的绑定手机号发送忘记密码验证码？这会真实触发短信。`,
      confirmText: "发送验证码",
      type: "warning",
    },
    "forgot-reset": {
      message: `确认通过忘记密码流程重置目标账号 ${targetUsername.value}？`,
      confirmText: "重置目标",
      type: "error",
    },
    "personal-code": {
      message: `确认调用旧版接口给手机号 ${maskPhone(targetPhone.value)} 发送验证码？这会真实触发短信。`,
      confirmText: "发送短信",
      type: "error",
    },
  };
  const config = configs[action];
  if (!config) return;

  try {
    await confirmPasswordAction(config);
  } catch {
    return;
  }

  passwordLoading.value = true;
  passwordAction.value = action;
  passwordResultText.value = "";

  try {
    let response;
    if (action === "change") {
      response = await changeClassPassword(
        userData.value,
        passwordForm.value.originPassword,
        passwordForm.value.password,
        passwordForm.value.confirmPassword
      );
      passwordResultText.value = `当前账号改密返回：${responseText(response, "已提交改密")}`;
    } else if (action === "phone") {
      response = await getClassForgotPasswordPhone(targetUsername.value, targetSid.value);
      const phone = phoneFromResponse(response);
      passwordResultText.value = phone
        ? `目标账号绑定手机号：${phone}`
        : `绑定手机号查询返回：${responseText(response, "已提交查询")}`;
    } else if (action === "code") {
      response = await sendClassForgotPasswordCode(targetUsername.value, targetSid.value);
      passwordResultText.value = `验证码发送返回：${responseText(response, "已请求发送验证码")}`;
    } else if (action === "forgot-reset") {
      response = await resetClassForgotPassword(
        targetUsername.value,
        targetSid.value,
        forgotForm.value.password,
        forgotForm.value.confirmPassword
      );
      passwordResultText.value = `忘记密码重置返回：${responseText(response, "已提交重置")}`;
    } else if (action === "personal-code") {
      response = await sendClassPersonalCode(userData.value, targetPhone.value, forgotForm.value.type);
      passwordResultText.value = `手机号验证码发送返回：${responseText(response, "已请求发送验证码")}`;
    }
    ElMessage.success(passwordResultText.value);
  } catch (error) {
    passwordResultText.value = error?.message || "密码接口调用失败";
    ElMessage.error(passwordResultText.value);
    console.error(error);
  } finally {
    passwordLoading.value = false;
    passwordAction.value = "";
  }
};

const syncMode = (event) => {
  apiMode.value = event?.detail?.mode || getApiMode();
  fetchSchoolsForPassword();
};

onMounted(() => {
  window.addEventListener(API_MODE_CHANGED_EVENT, syncMode);
  fetchSchoolsForPassword();
});
onUnmounted(() => window.removeEventListener(API_MODE_CHANGED_EVENT, syncMode));
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 22px;
}

.settings-hero,
.api-settings,
.password-console,
.settings-note {
  padding: 26px;
}

.settings-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: end;
  overflow: hidden;
}

.hero-copy h2 {
  margin: 14px 0 8px;
  font-size: clamp(30px, 4.6vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.06em;
}

.hero-copy p,
.current-mode-card small,
.mode-card p,
.mode-card small,
.settings-note p {
  color: var(--muted);
  font-family: var(--font-ui);
}

.hero-copy p {
  max-width: 600px;
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
}

.current-mode-card {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 150px;
  padding: 22px;
  overflow: hidden;
  color: white;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent),
    linear-gradient(135deg, var(--indigo), var(--primary));
  border-radius: 28px;
  box-shadow: var(--shadow-tight);
}

.current-mode-card::after {
  position: absolute;
  right: -44px;
  bottom: -60px;
  width: 150px;
  height: 150px;
  content: "";
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 66%);
}

.current-mode-card span,
.current-mode-card small,
.current-mode-card strong {
  position: relative;
  z-index: 1;
}

.current-mode-card span {
  font-family: var(--font-ui);
  font-size: 12px;
  opacity: 0.78;
}

.current-mode-card strong {
  font-size: 30px;
  font-weight: 900;
}

.current-mode-card small {
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
}

.settings-section-head {
  display: flex;
  gap: 18px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.settings-section-head h3 {
  margin: 12px 0 0;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.mode-card {
  position: relative;
  display: grid;
  gap: 10px;
  min-height: 210px;
  padding: 18px;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 8px 22px rgba(23, 32, 51, 0.05);
  transition: 0.2s ease;
}

.mode-card:hover {
  border-color: rgba(242, 106, 46, 0.28);
  box-shadow: var(--shadow-tight);
  transform: translateY(-2px);
}

.mode-card.active {
  color: white;
  background:
    radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.24), transparent 30%),
    linear-gradient(135deg, var(--indigo), var(--jade));
  border-color: rgba(255, 255, 255, 0.68);
}

.mode-code {
  justify-self: start;
  padding: 7px 10px;
  color: var(--primary-deep);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  background: rgba(242, 106, 46, 0.12);
  border-radius: 999px;
}

.mode-card.active .mode-code {
  color: white;
  background: rgba(255, 255, 255, 0.16);
}

.mode-card h4 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.mode-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}

.mode-card small {
  align-self: end;
  font-size: 12px;
}

.mode-card.active p,
.mode-card.active small {
  color: rgba(255, 255, 255, 0.78);
}

.settings-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.password-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.password-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 8px 22px rgba(23, 32, 51, 0.05);
}

.password-card.audit {
  background:
    linear-gradient(135deg, rgba(242, 106, 46, 0.08), rgba(88, 99, 255, 0.08)),
    rgba(255, 255, 255, 0.66);
  border-color: rgba(242, 106, 46, 0.22);
}

.password-card span {
  color: var(--primary-deep);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.password-card h4 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.password-card p,
.password-result {
  margin: 0;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.75;
}

.password-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.password-result {
  color: var(--primary-deep);
  font-weight: 800;
}

.settings-note {
  min-height: 170px;
}

.settings-note span {
  color: var(--primary-deep);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.settings-note h4 {
  margin: 14px 0 8px;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.settings-note p {
  margin: 0;
  line-height: 1.75;
}

@media (max-width: 1120px) {
  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .settings-hero,
  .settings-info-grid,
  .password-grid {
    grid-template-columns: 1fr;
  }

  .settings-section-head {
    display: grid;
  }
}

@media (max-width: 640px) {
  .settings-page {
    gap: 14px;
  }

  .settings-hero,
  .api-settings,
  .password-console,
  .settings-note {
    padding: 16px;
    border-radius: 22px;
  }

  .hero-copy h2 {
    margin: 10px 0 6px;
    font-size: clamp(28px, 10vw, 38px);
    line-height: 1.1;
  }

  .hero-copy p,
  .settings-note p {
    font-size: 13px;
  }

  .current-mode-card {
    min-height: 124px;
    padding: 18px;
    border-radius: 22px;
  }

  .current-mode-card strong {
    font-size: 26px;
  }

  .settings-section-head h3 {
    font-size: 24px;
  }

  .mode-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .mode-card {
    min-height: auto;
    padding: 16px;
    border-radius: 18px;
  }

  .mode-card h4 {
    font-size: 20px;
  }

  .settings-note {
    min-height: auto;
  }

  .settings-note h4 {
    font-size: 21px;
  }

  .password-card {
    padding: 16px;
    border-radius: 18px;
  }

  .password-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .password-actions .el-button,
  .password-card > .el-button {
    width: 100%;
    margin-left: 0;
  }
}
</style>
