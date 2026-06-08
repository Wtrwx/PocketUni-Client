<template>
  <div class="event-page">
    <el-dialog
      v-model="detailDialogVisible"
      width="760px"
      align-center
      destroy-on-close
      class="soft-dialog"
    >
      <template #header>
        <div class="dialog-heading">
          <span class="section-kicker">ACTIVITY DETAIL</span>
          <h3>{{ detailInfo?.name || '活动详情' }}</h3>
        </div>
      </template>

      <div v-if="detailInfo" class="detail-shell">
        <div class="detail-hero">
          <div>
            <p class="detail-label">活动时间</p>
            <strong>{{ formatTime(detailInfo.startTime) }}</strong>
            <span>{{ formatTime(detailInfo.endTime) }}</span>
          </div>
          <div>
            <p class="detail-label">二课分</p>
            <strong>{{ displayValue(detailInfo.credit) }}</strong>
            <span>{{ detailInfo.location || '未填写地点' }}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item wide">
            <span>活动简介</span>
            <p>{{ detailInfo.descs || '暂无简介' }}</p>
          </div>
          <div class="detail-item">
            <span>报名时间</span>
            <strong>{{ formatTime(detailInfo.regStartTimeStr) }}</strong>
            <small>{{ formatTime(detailInfo.regEndTimeStr) }}</small>
          </div>
          <div class="detail-item">
            <span>参与人数</span>
            <strong>{{ detailInfo.joinNum }} / {{ detailInfo.joinNum + detailInfo.leftNum }}</strong>
            <small>剩余 {{ detailInfo.leftNum }} 人</small>
          </div>
          <div class="detail-item">
            <span>签到统计</span>
            <strong>{{ detailInfo.sign_in_num }} / {{ detailInfo.sign_out_num }}</strong>
            <small>签到 / 签退</small>
          </div>
          <div class="detail-item">
            <span>定位签到</span>
            <strong>{{ convert(detailInfo.is_gps_sign) }}</strong>
          </div>
          <div class="detail-item">
            <span>需要签退</span>
            <strong>{{ convert(detailInfo.is_need_sign_out) }}</strong>
          </div>
        </div>

        <section class="sign-panel">
          <div class="sign-panel-head">
            <div>
              <span class="section-kicker">CHECK-IN</span>
              <h4>签到信息</h4>
            </div>
          </div>

          <div class="sign-grid">
            <div>
              <span>活动 ID</span>
              <strong>{{ currentDetailId || '—' }}</strong>
            </div>
            <div>
              <span>签到方式</span>
              <strong>{{ signMethodText }}</strong>
            </div>
            <div>
              <span>签退要求</span>
              <strong>{{ convert(detailInfo.is_need_sign_out) }}</strong>
            </div>
            <div>
              <span>报名状态</span>
              <strong>{{ joinStatusText }}</strong>
            </div>
            <div>
              <span>可执行动作</span>
              <strong>{{ detailInfo.joinInfo?.name || '—' }}</strong>
            </div>
            <div>
              <span>签到状态</span>
              <strong>{{ userSignStatusText }}</strong>
            </div>
          </div>

          <div class="local-sign-box">
            <div class="local-sign-copy">
              <strong>本地签到接口</strong>
              <span v-if="canUseLocalSign">扫码/普通签到走 <code>/apis/activity/signIn</code>，GPS 定位签到走 <code>/apis/activity/signInGps</code>，两者已分开。</span>
              <span v-else>该接口需要新版 Class 登录；传统 Web 登录暂不支持本地签到。</span>
            </div>
            <el-input
              v-model="signAddress"
              clearable
              :disabled="!canSubmitGpsSign || signLoading"
              placeholder="GPS 签到地点 / 地址；扫码签到无需填写"
            ></el-input>
            <p v-if="signResultText" class="sign-result-text">{{ signResultText }}</p>
            <p v-if="lastActionMessage" class="sign-result-text">{{ lastActionMessage }}</p>
          </div>

          <div class="sign-panel-actions">
            <el-button @click="copySignInfo(detailInfo)">复制活动信息</el-button>
            <el-button
              :disabled="!canSubmitGpsSign || signLoading"
              :loading="locating"
              @click="fillCurrentLocation"
            >
              获取当前位置
            </el-button>
            <el-button
              type="primary"
              :disabled="!canUseLocalSign || !currentDetailId"
              :loading="signLoading && signAction === 'qr-in'"
              @click="submitLocalSign('qr-in')"
            >
              扫码签到（本人）
            </el-button>
            <el-button
              type="warning"
              plain
              :disabled="!canUseLocalSign || !currentDetailId"
              :loading="signLoading && signAction === 'qr-out'"
              @click="submitLocalSign('qr-out')"
            >
              扫码签退（本人）
            </el-button>
            <el-button
              type="primary"
              plain
              :disabled="!canSubmitGpsSign || locating"
              :loading="signLoading && signAction === 'gps-in'"
              @click="submitLocalSign('gps-in')"
            >
              GPS 定位签到
            </el-button>
            <el-button
              type="warning"
              plain
              :disabled="!canSubmitGpsSign || locating"
              :loading="signLoading && signAction === 'gps-out'"
              @click="submitLocalSign('gps-out')"
            >
              GPS 定位签退
            </el-button>
          </div>

          <div class="event-admin-box">
            <div class="local-sign-copy">
              <strong>成员列表 / 签到员设置</strong>
              <span v-if="canUseLocalSign">
                当前 Class 登录可查看成员列表；签到员/工作人员设置仍需旧版 Web 管理权限。
              </span>
              <span v-else-if="canUseLegacyEventAdmin">
                旧版 Web 官方接口，仅活动管理员或组织者有权限；目标必须是已报名成员 UID。
              </span>
              <span v-else>请先使用 Class 或旧版 Web 登录后查看成员列表。</span>
            </div>
            <div class="event-admin-form">
              <el-input
                v-model="managerTargetUid"
                clearable
                :disabled="!canUseLegacyEventAdmin || managerLoading"
                placeholder="成员 UID（不是学号）"
              ></el-input>
              <el-input
                v-model="memberKeyword"
                clearable
                :disabled="!canUseLegacyEventAdmin || memberListLoading"
                :placeholder="canUseLegacyEventAdmin ? '按姓名查询成员' : 'Class 成员列表暂不支持姓名过滤'"
              ></el-input>
              <el-button
                :disabled="!canViewEventMembers || !currentDetailId"
                :loading="memberListLoading"
                @click="loadEventMembers(1)"
              >
                查成员
              </el-button>
            </div>
            <p v-if="memberTotalText" class="sign-result-text">{{ memberTotalText }}</p>
            <div v-if="managerMembers.length" class="manager-member-list">
              <button
                v-for="member in managerMembers"
                :key="member.id || member.uid"
                type="button"
                @click="managerTargetUid = String(member.uid || '')"
              >
                {{ member.realname || '未命名' }} #{{ member.uid || '—' }}
                <small v-if="member.college">{{ member.college }}</small>
                <small v-if="member.class">{{ member.class }}</small>
                <span v-if="member.signName">{{ member.signName }}</span>
                <span v-if="String(member.is_sign_manager) === '1'">签到员</span>
                <span v-if="Number(member.is_organiser) === 1">组织者</span>
              </button>
            </div>
            <div class="member-pagination">
              <el-button
                size="small"
                :disabled="!memberHasPrev || memberListLoading"
                @click="loadEventMembers(memberPage - 1)"
              >
                上一页成员
              </el-button>
              <span>第 {{ memberPage }} 页</span>
              <el-button
                size="small"
                :disabled="!memberHasNext || memberListLoading"
                @click="loadEventMembers(memberPage + 1)"
              >
                下一页成员
              </el-button>
            </div>
            <div class="sign-panel-actions">
              <el-button
                type="primary"
                plain
                :disabled="!canUseLegacyEventAdmin || !managerTargetUid || !currentDetailId"
                :loading="managerLoading && managerAction === 'set-sign'"
                @click="submitLegacyManagerAction('set-sign')"
              >
                设为签到员
              </el-button>
              <el-button
                plain
                :disabled="!canUseLegacyEventAdmin || !managerTargetUid || !currentDetailId"
                :loading="managerLoading && managerAction === 'cancel-sign'"
                @click="submitLegacyManagerAction('cancel-sign')"
              >
                取消签到员
              </el-button>
              <el-button
                type="warning"
                plain
                :disabled="!canUseLegacyEventAdmin || !managerTargetUid || !currentDetailId"
                :loading="managerLoading && managerAction === 'set-organiser'"
                @click="submitLegacyManagerAction('set-organiser')"
              >
                设为工作人员
              </el-button>
              <el-button
                plain
                :disabled="!canUseLegacyEventAdmin || !managerTargetUid || !currentDetailId"
                :loading="managerLoading && managerAction === 'cancel-organiser'"
                @click="submitLegacyManagerAction('cancel-organiser')"
              >
                取消工作人员
              </el-button>
            </div>
          </div>
        </section>

        <section v-if="canUseLocalSign" class="activity-extra-box">
          <div class="activity-extra-head">
            <div>
              <span class="section-kicker">EXTENDED API</span>
              <h4>补充活动接口</h4>
            </div>
            <el-button
              size="small"
              :disabled="!currentDetailId"
              :loading="activityExtraLoading"
              @click="loadActivityExtras(currentDetailId)"
            >
              刷新补充信息
            </el-button>
          </div>
          <p class="extra-hint">
            已接入公告、评价、投票成员、报名资料、中途签到状态/记录等只读接口；不会自动执行发布、评价或中途签到。
          </p>
          <div class="extra-grid">
            <div>
              <span>公告</span>
              <strong>{{ activityNews.length }}</strong>
            </div>
            <div>
              <span>评价</span>
              <strong>{{ activityEvaluations.length }}</strong>
            </div>
            <div>
              <span>投票项</span>
              <strong>{{ activityVotePlayers.length }}</strong>
            </div>
            <div>
              <span>中途签到</span>
              <strong>{{ activityMidwayStatusText }}</strong>
            </div>
          </div>
          <p v-if="activityExtraMessage" class="sign-result-text">{{ activityExtraMessage }}</p>

          <div class="danger-action-box">
            <div class="local-sign-copy">
              <strong>写入操作</strong>
              <span>
                发布公告、提交评价、投票、中途签到都是真实写入；点击前会二次确认，权限由服务端判定。
              </span>
            </div>
            <div class="danger-action-grid">
              <el-input
                v-model="announceTitle"
                clearable
                :disabled="activityWriteLoading"
                placeholder="公告标题（activity/news/add 仅确认 title）"
              ></el-input>
              <el-button
                type="primary"
                plain
                :disabled="!currentDetailId || !announceTitle.trim()"
                :loading="activityWriteLoading && activityWriteAction === 'news'"
                @click="submitActivityWriteAction('news')"
              >
                发布公告
              </el-button>

              <el-input-number
                v-model="evaluationStar"
                :min="1"
                :max="5"
                :disabled="activityWriteLoading"
              ></el-input-number>
              <el-input
                v-model="evaluationPics"
                clearable
                :disabled="activityWriteLoading"
                placeholder="评价图片 pics，可空；正文 key 未确认不提交"
              ></el-input>
              <el-button
                type="warning"
                plain
                :disabled="!currentDetailId"
                :loading="activityWriteLoading && activityWriteAction === 'evaluate'"
                @click="submitActivityWriteAction('evaluate')"
              >
                提交评价
              </el-button>

              <el-input
                v-model="votePlayerId"
                clearable
                :disabled="activityWriteLoading"
                placeholder="投票项 playId，可点下方投票项自动填入"
              ></el-input>
              <el-button
                type="success"
                plain
                :disabled="!currentDetailId || !votePlayerId.trim()"
                :loading="activityWriteLoading && activityWriteAction === 'vote'"
                @click="submitActivityWriteAction('vote')"
              >
                投票
              </el-button>
              <el-button
                type="danger"
                plain
                :disabled="!currentDetailId"
                :loading="activityWriteLoading && activityWriteAction === 'midway'"
                @click="submitActivityWriteAction('midway')"
              >
                中途签到
              </el-button>
            </div>
          </div>

          <div v-if="activityJoinMaterial?.needMaterial" class="extra-list">
            <strong>报名资料要求</strong>
            <article v-for="field in activityJoinMaterial.list" :key="field.id || field.name">
              <span>{{ field.name || '未命名字段' }}</span>
              <small>{{ displayValue(field.type) }} · {{ readableFlag(field.required) }}</small>
            </article>
          </div>

          <div v-if="activityNews.length" class="extra-list">
            <strong>活动公告</strong>
            <article v-for="item in activityNews" :key="item.id || item.title">
              <span>{{ item.title || '未命名公告' }}</span>
              <small>{{ formatExtraTime(item.createTime) }} {{ item.realname || '' }}</small>
              <p v-if="item.content">{{ item.content }}</p>
            </article>
          </div>

          <div v-if="activityEvaluations.length" class="extra-list">
            <strong>活动评价</strong>
            <article v-for="item in activityEvaluations" :key="item.id || item.uid">
              <span>{{ item.realname || '匿名用户' }} · {{ displayValue(item.star) }} 星</span>
              <small>{{ formatExtraTime(item.createTime) }} {{ item.level ? `等级 ${item.level}` : '' }}</small>
              <p v-if="item.content">{{ item.content }}</p>
            </article>
          </div>

          <div v-if="activityVotePlayers.length" class="extra-list">
            <strong>投票 / 参赛项</strong>
            <article v-for="player in activityVotePlayers" :key="player.id || player.uid">
              <span>{{ player.title || player.realname || '未命名参赛项' }}</span>
              <small>票数 {{ displayValue(player.voteNum) }}</small>
              <el-button size="small" text @click="votePlayerId = String(player.id || '')">填入 playId</el-button>
            </article>
          </div>

          <div v-if="activityMidwayRecords.length" class="extra-list">
            <strong>中途签到记录</strong>
            <article v-for="record in activityMidwayRecords" :key="record.id || record.uid">
              <span>{{ record.realname || record.uid || '未知成员' }}</span>
              <small>{{ formatExtraTime(record.signTime) }}</small>
              <p v-if="record.signAddress">{{ record.signAddress }}</p>
            </article>
          </div>
        </section>

        <div class="detail-actions">
          <el-button
            :disabled="!currentDetailId"
            :loading="actionLoading"
            type="primary"
            @click="joinCurrentEvent(currentDetailId)"
          >
            报名活动
          </el-button>
          <el-button
            :disabled="!currentDetailId"
            :loading="actionLoading"
            type="danger"
            plain
            @click="cancelCurrentEvent(currentDetailId)"
          >
            取消报名
          </el-button>
        </div>
      </div>
    </el-dialog>

    <section class="event-console glass-panel">
      <div class="event-toolbar">
        <div>
          <span class="section-kicker">DISCOVER</span>
          <h2>活动检索台</h2>
          <p>浏览活动列表，支持按名称、地点或关键词检索。</p>
        </div>
        <form class="search-box" @submit.prevent="searchEvents">
          <el-input v-model="searchQuery" clearable placeholder="搜索活动名称、地点或关键词"></el-input>
          <el-button
            native-type="button"
            :disabled="!canUseLocalSign || loading"
            @click="fetchCanSignEvents"
          >
            可签到
          </el-button>
          <el-button
            native-type="button"
            :disabled="!canUseLocalSign || loading"
            @click="fetchMyClassEvents"
          >
            我的
          </el-button>
          <el-button
            native-type="button"
            :disabled="!canUseLocalSign || loading"
            @click="fetchManagedClassEvents"
          >
            管理
          </el-button>
          <el-button
            native-type="button"
            :disabled="!canUseLocalSign || loading"
            @click="fetchCollectedClassEvents"
          >
            收藏
          </el-button>
          <el-button type="primary" native-type="submit">搜索</el-button>
        </form>
      </div>

      <div class="event-stats">
        <article class="metric-card">
          <span class="metric-label">当前页</span>
          <div class="metric-value">{{ currentPage }}</div>
        </article>
        <article class="metric-card">
          <span class="metric-label">本页活动</span>
          <div class="metric-value">{{ events.length }}</div>
        </article>
        <article class="metric-card">
          <span class="metric-label">可报名</span>
          <div class="metric-value">{{ registerableCount }}</div>
        </article>
      </div>
    </section>

    <section v-loading="loading" class="activity-board glass-panel">
      <div v-if="events.length" class="activity-list">
        <button
          v-for="event in events"
          :key="activityIdOf(event) || event.title || event.name"
          class="activity-card"
          type="button"
          @click="handleRowClick(event)"
        >
          <div class="activity-main">
            <span class="activity-id">#{{ activityIdOf(event) || '—' }}</span>
            <h3>{{ event.title || event.name || '未命名活动' }}</h3>
            <p>{{ event.address || '未填写地点' }}</p>
          </div>
          <div class="activity-meta">
            <span :class="['status-pill', canRegister(event.startline, event.deadline) ? 'open' : 'closed']">
              {{ canRegister(event.startline, event.deadline) ? '可报名' : '未开放' }}
            </span>
            <span>{{ displayValue(event.credit) }} 分</span>
            <span>{{ event.category || event.statusName || '活动' }}</span>
          </div>
          <div class="activity-time">
            <span>{{ formatTime(event.sTime) }}</span>
            <span>{{ formatTime(event.eTime) }}</span>
          </div>
        </button>
      </div>

      <el-empty v-else-if="!loading" description="暂无活动，换个关键词试试。"></el-empty>

      <div class="pagination">
        <el-button @click="prevPage" :disabled="currentPage === 1 || loading">上一页</el-button>
        <span>第 {{ currentPage }} 页</span>
        <el-button @click="nextPage" :disabled="!hasNextPage || loading">下一页</el-button>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { useToast } from "vue-toastification";
import {
  cancelClassEvent,
  cancelEvent,
  cancelLegacyEventSignManager,
  changeLegacyEventOrganiser,
  getClassActivitySignResult,
  getClassActivityMembers,
  getClassActivityEvaluations,
  getClassActivityJoinMaterialInfo,
  getClassActivityMidwayRecords,
  getClassActivityMidwayStatus,
  getClassActivityNewsList,
  getClassActivityVotePlayers,
  getClassCanSignActivityList,
  getClassCollectedActivityList,
  getClassActivityDetail,
  getClassActivityList,
  getClassManagedActivityList,
  getClassMyActivityList,
  getLegacyEventMembers,
  isClassSession,
  joinClassEvent,
  joinEvent,
  newEventList,
  queryActivityDetailById,
  setLegacyEventSignManager,
  addClassActivityNews,
  signClassActivityMidway,
  signInClassActivityUserQr,
  signInClassActivityGps,
  signOutClassActivityUserQr,
  signOutClassActivityGps,
  submitClassActivityEvaluation,
  voteClassActivityPlayer,
} from "@/utils/api";
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

const successMessage = (payload, fallback) => payload?.msg || payload?.message || fallback;

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const getActivityId = (info = {}) => {
  const raw = info.raw || {};
  return firstValue(
    info.id,
    info.activityId,
    info.actiId,
    raw.id,
    raw.activityId,
    raw.actiId
  );
};

const isSuccessResponse = (payload) =>
  payload?.code === 0 ||
  String(payload?.code) === "0" ||
  payload?.status === 1 ||
  payload?.success === true ||
  payload?.message === "success" ||
  payload?.msg === "成功";

const readableFlag = (value) => {
  if (value === true) return "是";
  if (value === false) return "否";
  if (String(value) === "0") return "否";
  if (String(value) === "1") return "是";
  return displayValue(value);
};

const formatSignResult = (payload) => {
  const data = payload?.data || payload?.content;
  if (!data || typeof data !== "object") return successMessage(payload, "");

  const rows = [
    ["签到", firstValue(data.signInStatus, data.signIn, data.isSignIn, data.sign_in_status)],
    ["签退", firstValue(data.signOutStatus, data.signOut, data.isSignOut, data.sign_out_status)],
    ["签到人数", firstValue(data.signInNum, data.sign_in_num, data.signInCount)],
    ["签退人数", firstValue(data.signOutNum, data.sign_out_num, data.signOutCount)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  if (!rows.length) return successMessage(payload, "");
  return rows.map(([label, value]) => `${label}：${readableFlag(value)}`).join("；");
};

const describeGeoError = (error) => {
  if (error?.code === 1) return "定位权限被拒绝，请手动填写签到地点。";
  if (error?.code === 2) return "无法获取当前位置，请手动填写签到地点。";
  if (error?.code === 3) return "定位超时，请重试或手动填写签到地点。";
  return "获取当前位置失败，请手动填写签到地点。";
};

const formatExtraTime = (value) => {
  if (!value) return "";
  const text = String(value);
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    return formatTime(number > 100000000000 ? Math.floor(number / 1000) : number);
  }
  const parsed = Date.parse(text.replace(/-/g, "/"));
  return Number.isNaN(parsed) ? text : formatTime(Math.floor(parsed / 1000));
};

export default {
  setup() {
    const events = ref([]);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const totalItems = ref(0);
    const searchQuery = ref("");
    const toast = useToast();
    const loading = ref(false);
    const actionLoading = ref(false);
    const detailDialogVisible = ref(false);
    const detailInfo = ref(null);
    const signAddress = ref("");
    const signLoading = ref(false);
    const locating = ref(false);
    const signAction = ref("");
    const signResultText = ref("");
    const lastActionMessage = ref("");
    const managerTargetUid = ref("");
    const managerLoading = ref(false);
    const managerAction = ref("");
    const memberKeyword = ref("");
    const memberListLoading = ref(false);
    const managerMembers = ref([]);
    const memberPage = ref(1);
    const memberPageSize = ref(10);
    const memberPageInfo = ref(null);
    const activityExtraLoading = ref(false);
    const activityExtraMessage = ref("");
    const activityNews = ref([]);
    const activityEvaluations = ref([]);
    const activityVotePlayers = ref([]);
    const activityJoinMaterial = ref(null);
    const activityMidwayStatus = ref(null);
    const activityMidwayRecords = ref([]);
    const activityWriteLoading = ref(false);
    const activityWriteAction = ref("");
    const announceTitle = ref("");
    const evaluationStar = ref(5);
    const evaluationPics = ref("");
    const votePlayerId = ref("");

    const hasNextPage = computed(() => {
      if (totalItems.value) return currentPage.value * pageSize.value < totalItems.value;
      return events.value.length >= pageSize.value;
    });

    const canRegister = (start, end) => {
      const now = Math.floor(Date.now() / 1000);
      const startInt = Number.parseInt(start, 10);
      const endInt = Number.parseInt(end, 10);
      if (!startInt || !endInt) return false;
      return now >= startInt && now <= endInt;
    };

    const registerableCount = computed(
      () => events.value.filter((event) => canRegister(event.startline, event.deadline)).length
    );
    const currentDetailId = computed(() => getActivityId(detailInfo.value));
    const activityIdOf = (event) => getActivityId(event);
    const canUseLocalSign = computed(() => {
      const userData = readUserData();
      return localStorage.getItem("loggedIn") === "true" && isClassSession(userData);
    });
    const isGpsSignActivity = computed(
      () => String(detailInfo.value?.signType) === "2" || String(detailInfo.value?.is_gps_sign) === "1"
    );
    const canSubmitGpsSign = computed(
      () => canUseLocalSign.value && isGpsSignActivity.value
    );
    const canUseLegacyEventAdmin = computed(() => {
      const userData = readUserData();
      return (
        localStorage.getItem("loggedIn") === "true" &&
        !isClassSession(userData) &&
        Boolean(userData?.oauth_token && userData?.oauth_token_secret)
      );
    });
    const canViewEventMembers = computed(() => canUseLocalSign.value || canUseLegacyEventAdmin.value);
    const memberHasPrev = computed(() => memberPage.value > 1);
    const memberHasNext = computed(() => {
      const total = Number(memberPageInfo.value?.count || 0);
      if (total) return memberPage.value * memberPageSize.value < total;
      return managerMembers.value.length >= memberPageSize.value;
    });
    const memberTotalText = computed(() => {
      const total = memberPageInfo.value?.count;
      if (!total && !managerMembers.value.length) return "";
      return `成员：${total || managerMembers.value.length} 人`;
    });
    const signMethodText = computed(
      () =>
        detailInfo.value?.signTypeName ||
        (isGpsSignActivity.value ? "GPS 定位" : "扫码 / 普通签到")
    );
    const joinStatusText = computed(() => {
      const status = detailInfo.value?.joinStatus || {};
      if (status.name) return status.name;
      if (String(status.joinStatus) === "1") return "已报名";
      if (String(detailInfo.value?.userStatus?.hasJoin) === "1") return "已报名";
      return "未报名";
    });
    const userSignStatusText = computed(() => {
      const status = detailInfo.value?.userStatus || {};
      const parts = [];
      if (String(status.hasSignIn) === "1") parts.push("已签到");
      if (String(status.hasSignOut) === "1") parts.push("已签退");
      if (String(status.hasMidSign) === "1") parts.push("已中途签到");
      return parts.length ? parts.join(" / ") : "未签到";
    });
    const activityMidwayStatusText = computed(() => {
      const data = activityMidwayStatus.value?.data || activityMidwayStatus.value?.content || activityMidwayStatus.value;
      if (!data) return "未加载";
      if (typeof data === "string") return data;
      const status = firstValue(data.status, data.signStatus, data.hasSign, data.open);
      if (status !== undefined) return readableFlag(status);
      return successMessage(activityMidwayStatus.value, "已加载");
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

    const resetActivityExtras = () => {
      activityExtraMessage.value = "";
      activityNews.value = [];
      activityEvaluations.value = [];
      activityVotePlayers.value = [];
      activityJoinMaterial.value = null;
      activityMidwayStatus.value = null;
      activityMidwayRecords.value = [];
      activityWriteAction.value = "";
      announceTitle.value = "";
      evaluationStar.value = 5;
      evaluationPics.value = "";
      votePlayerId.value = "";
    };

    const resetSignPanel = (info = {}) => {
      signAddress.value = firstValue(info.location, info.address) || "";
      signResultText.value = "";
      signAction.value = "";
      lastActionMessage.value = "";
      managerTargetUid.value = "";
      managerAction.value = "";
      memberKeyword.value = "";
      managerMembers.value = [];
      memberPage.value = 1;
      memberPageInfo.value = null;
      resetActivityExtras();
    };

    const loadSignResult = async (actiId) => {
      const userData = readUserData();
      if (!actiId || !userData || !isClassSession(userData)) return;
      try {
        const response = await getClassActivitySignResult(userData, actiId);
        const text = formatSignResult(response);
        if (text) signResultText.value = text;
      } catch (error) {
        console.warn("sign result fetch failed", error);
      }
    };

    const loadActivityExtras = async (actiId = currentDetailId.value) => {
      const userData = readUserData();
      if (!actiId || !userData || !isClassSession(userData)) return;
      activityExtraLoading.value = true;
      activityExtraMessage.value = "";
      try {
        const [news, evaluations, votePlayers, material, midwayStatus, midwayRecords] =
          await Promise.allSettled([
            getClassActivityNewsList(userData, actiId, 1, 5),
            getClassActivityEvaluations(userData, actiId, 1, 5),
            getClassActivityVotePlayers(userData, actiId, 1, 5),
            getClassActivityJoinMaterialInfo(userData, actiId),
            getClassActivityMidwayStatus(userData, actiId),
            getClassActivityMidwayRecords(userData, actiId, 1, 5),
          ]);

        const usable = (result) =>
          result.status === "fulfilled" &&
          (result.value?.code === undefined || isSuccessResponse(result.value));
        const failedCount = [
          news,
          evaluations,
          votePlayers,
          material,
          midwayStatus,
          midwayRecords,
        ].filter((result) => !usable(result)).length;

        activityNews.value = usable(news) ? safeList(news.value) : [];
        activityEvaluations.value = usable(evaluations) ? safeList(evaluations.value) : [];
        activityVotePlayers.value = usable(votePlayers) ? safeList(votePlayers.value) : [];
        activityJoinMaterial.value = usable(material) ? material.value?.content || null : null;
        activityMidwayStatus.value = usable(midwayStatus) ? midwayStatus.value : null;
        activityMidwayRecords.value = usable(midwayRecords) ? safeList(midwayRecords.value) : [];
        activityExtraMessage.value = failedCount
          ? `${failedCount} 个补充接口当前不可用或无权限，已显示可读取的数据。`
          : "补充信息已刷新。";
      } catch (error) {
        activityExtraMessage.value = error?.message || "补充信息读取失败。";
        console.error(error);
      } finally {
        activityExtraLoading.value = false;
      }
    };

    const submitActivityWriteAction = async (action) => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      if (!isClassSession(userData)) {
        toast.error("活动写入接口需要新版 Class 登录。", { position: "top-center" });
        return;
      }
      const actiId = currentDetailId.value;
      if (!actiId) {
        toast.error("活动 ID 缺失，无法提交。", { position: "top-center" });
        return;
      }

      const labels = {
        news: "发布公告",
        evaluate: "提交评价",
        vote: "投票",
        midway: "中途签到",
      };
      const label = labels[action] || "提交操作";
      const checks = {
        news: () => announceTitle.value.trim(),
        evaluate: () => evaluationStar.value,
        vote: () => votePlayerId.value.trim(),
        midway: () => true,
      };
      if (!checks[action]?.()) {
        toast.error(`${label}参数不完整。`, { position: "top-center" });
        return;
      }

      try {
        await ElMessageBox.confirm(`确认对活动 ${actiId} 执行「${label}」？这是服务端真实写入操作。`, "写入确认", {
          type: "warning",
          center: true,
          customClass: "action-confirm-box",
          confirmButtonText: "确认提交",
          cancelButtonText: "取消",
          autofocus: false,
        });
      } catch (error) {
        return;
      }

      activityWriteLoading.value = true;
      activityWriteAction.value = action;
      try {
        let response;
        if (action === "news") {
          response = await addClassActivityNews(userData, actiId, announceTitle.value);
        } else if (action === "evaluate") {
          response = await submitClassActivityEvaluation(
            userData,
            actiId,
            evaluationStar.value,
            evaluationPics.value.trim()
          );
        } else if (action === "vote") {
          response = await voteClassActivityPlayer(userData, actiId, votePlayerId.value.trim());
        } else {
          response = await signClassActivityMidway(userData, actiId);
        }

        const message = successMessage(response, isSuccessResponse(response) ? `${label}成功` : `${label}失败`);
        lastActionMessage.value = message;
        if (isSuccessResponse(response)) {
          toast.success(message, { position: "top-center" });
          await loadActivityExtras(actiId);
          await refreshDetail(actiId);
        } else {
          toast.error(message, { position: "top-center" });
        }
      } catch (error) {
        lastActionMessage.value = error?.message || `${label}失败，请确认权限或活动状态。`;
        toast.error(lastActionMessage.value, { position: "top-center" });
        console.error(error);
      } finally {
        activityWriteLoading.value = false;
        activityWriteAction.value = "";
      }
    };

    const fetchData = async () => {
      const userData = ensureLoggedIn();
      if (!userData) return;

      loading.value = true;
      try {
        if (isClassSession(userData)) {
          const response = await getClassActivityList(
            userData,
            currentPage.value,
            searchQuery.value,
            pageSize.value
          );
          const list = safeList(response);
          events.value = list;
          totalItems.value = response?.total_count || list.length;
          return;
        }

        const response = await newEventList(
          userData.sid,
          searchQuery.value,
          "",
          currentPage.value,
          userData.oauth_token,
          userData.oauth_token_secret
        );
        const list = safeList(response);
        events.value = list;
        totalItems.value = response?.total_count || response?.content?.total_count || list.length;
      } catch (error) {
        if (error?.data?.message === "授权失败" || error?.response?.data?.message === "授权失败") {
          toast.error("未登录或 token 失效，请重新登录", { position: "top-center" });
          goLogin();
        } else {
          toast.error("获取活动信息失败，请检查网络连接。", { position: "top-center" });
          console.error(error);
        }
      } finally {
        loading.value = false;
      }
    };

    const fetchCanSignEvents = async () => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      if (!isClassSession(userData)) {
        toast.error("可签到活动列表需要新版 Class 登录。", { position: "top-center" });
        return;
      }

      loading.value = true;
      try {
        const response = await getClassCanSignActivityList(userData);
        const list = safeList(response);
        events.value = list;
        currentPage.value = 1;
        totalItems.value = list.length;
        searchQuery.value = "";
        toast.success(list.length ? "已加载可签到活动" : "当前暂无可签到活动", {
          position: "top-center",
        });
      } catch (error) {
        toast.error("获取可签到活动失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      } finally {
        loading.value = false;
      }
    };

    const fetchClassEventSource = async (loader, label, { clearSearch = true } = {}) => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      if (!isClassSession(userData)) {
        toast.error(`${label}需要新版 Class 登录。`, { position: "top-center" });
        return;
      }

      loading.value = true;
      try {
        const response = await loader(userData);
        const list = safeList(response);
        events.value = list;
        currentPage.value = 1;
        totalItems.value = response?.total_count || list.length;
        if (clearSearch) searchQuery.value = "";
        toast.success(list.length ? `已加载${label}` : `${label}暂无数据`, {
          position: "top-center",
        });
      } catch (error) {
        toast.error(`获取${label}失败，请检查权限或网络。`, { position: "top-center" });
        console.error(error);
      } finally {
        loading.value = false;
      }
    };

    const fetchMyClassEvents = () =>
      fetchClassEventSource(
        (userData) => getClassMyActivityList(userData, 1, pageSize.value, 1),
        "我的活动"
      );

    const fetchManagedClassEvents = () =>
      fetchClassEventSource(
        (userData) =>
          getClassManagedActivityList(userData, 1, searchQuery.value.trim(), pageSize.value, 0),
        "我管理的活动",
        { clearSearch: false }
      );

    const fetchCollectedClassEvents = () =>
      fetchClassEventSource(
        (userData) => getClassCollectedActivityList(userData, 1, pageSize.value),
        "收藏活动"
      );

    const ensureLegacyEventAdminSession = () => {
      const userData = ensureLoggedIn();
      if (!userData) return null;
      if (isClassSession(userData) || !userData.oauth_token || !userData.oauth_token_secret) {
        toast.error("该管理接口需要旧版 Web 登录；请在设置中切换 Web 通道后重新登录。", {
          position: "top-center",
        });
        return null;
      }
      return userData;
    };

    const loadEventMembers = async (page = 1) => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      const actiId = currentDetailId.value;
      if (!actiId) {
        toast.error("活动 ID 缺失，无法查询成员。", { position: "top-center" });
        return;
      }
      if (!isClassSession(userData) && !canUseLegacyEventAdmin.value) {
        toast.error("请使用 Class 或旧版 Web 登录后查看成员列表。", { position: "top-center" });
        return;
      }

      memberListLoading.value = true;
      try {
        const response = isClassSession(userData)
          ? await getClassActivityMembers(userData, actiId, page, memberPageSize.value)
          : await getLegacyEventMembers(
              userData.oauth_token,
              userData.oauth_token_secret,
              actiId,
              {
                page,
                status: 1,
                realname: memberKeyword.value.trim(),
              }
            );
        const list = safeList(response);
        managerMembers.value = list;
        memberPage.value = page;
        memberPageInfo.value =
          response?.pageInfo || response?.data?.pageInfo || response?.content?.pageInfo || null;
        toast.success(list.length ? "已加载成员列表" : "没有匹配成员", {
          position: "top-center",
        });
      } catch (error) {
        toast.error(error?.message || "查询成员失败，请确认当前账号有查看权限。", {
          position: "top-center",
        });
        console.error(error);
      } finally {
        memberListLoading.value = false;
      }
    };

    const submitLegacyManagerAction = async (action) => {
      const userData = ensureLegacyEventAdminSession();
      if (!userData) return;
      const actiId = currentDetailId.value;
      const uid = managerTargetUid.value.trim();
      if (!actiId) {
        toast.error("活动 ID 缺失，无法提交管理操作。", { position: "top-center" });
        return;
      }
      if (!uid) {
        toast.error("请先填写成员 UID。", { position: "top-center" });
        return;
      }

      const labels = {
        "set-sign": "设为签到员",
        "cancel-sign": "取消签到员",
        "set-organiser": "设为工作人员",
        "cancel-organiser": "取消工作人员",
      };
      const label = labels[action] || "提交管理操作";

      try {
        await ElMessageBox.confirm(
          `确认将成员 UID ${uid} ${label}？该操作仅活动管理员/组织者有权限。`,
          "活动管理确认",
          {
            type: "warning",
            center: true,
            customClass: "action-confirm-box",
            confirmButtonText: "确认提交",
            cancelButtonText: "取消",
            autofocus: false,
          }
        );
      } catch (error) {
        return;
      }

      managerLoading.value = true;
      managerAction.value = action;
      try {
        let response;
        if (action === "set-sign") {
          response = await setLegacyEventSignManager(
            userData.oauth_token,
            userData.oauth_token_secret,
            uid,
            actiId
          );
        } else if (action === "cancel-sign") {
          response = await cancelLegacyEventSignManager(
            userData.oauth_token,
            userData.oauth_token_secret,
            uid,
            actiId
          );
        } else {
          response = await changeLegacyEventOrganiser(
            userData.oauth_token,
            userData.oauth_token_secret,
            uid,
            actiId,
            action === "set-organiser"
          );
        }

        const message = successMessage(response, isSuccessResponse(response) ? `${label}成功` : `${label}失败`);
        lastActionMessage.value = message;
        if (isSuccessResponse(response)) {
          toast.success(message, { position: "top-center" });
          await loadEventMembers(memberPage.value);
        } else {
          toast.error(message, { position: "top-center" });
        }
      } catch (error) {
        lastActionMessage.value = error?.message || `${label}失败，请确认当前账号有活动管理权限。`;
        toast.error(lastActionMessage.value, { position: "top-center" });
        console.error(error);
      } finally {
        managerLoading.value = false;
        managerAction.value = "";
      }
    };

    const handleRowClick = async (row) => {
      const userData = ensureLoggedIn();
      if (!userData) return;

      try {
        const actiId = getActivityId(row);
        if (!actiId) throw new Error("活动 ID 缺失");
        if (isClassSession(userData)) {
          const response = await getClassActivityDetail(userData, actiId);
          detailInfo.value = response.content;
          resetSignPanel(response.content);
          detailDialogVisible.value = true;
          await loadSignResult(actiId);
          await loadActivityExtras(actiId);
          return;
        }

        const response = await queryActivityDetailById(
          actiId,
          userData.oauth_token,
          userData.oauth_token_secret
        );
        detailInfo.value = response.content;
        resetSignPanel(response.content);
        detailDialogVisible.value = true;
      } catch (error) {
        toast.error("获取详细信息失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      }
    };

    const searchEvents = () => {
      currentPage.value = 1;
      fetchData();
    };

    const refreshDetail = async (actiId) => {
      const userData = readUserData();
      if (!userData || !actiId) return;
      try {
        if (isClassSession(userData)) {
          const response = await getClassActivityDetail(userData, actiId);
          detailInfo.value = response.content;
          if (!signAddress.value) signAddress.value = firstValue(response.content?.location, response.content?.address) || "";
          await loadSignResult(actiId);
          await loadActivityExtras(actiId);
        } else {
          const response = await queryActivityDetailById(
            actiId,
            userData.oauth_token,
            userData.oauth_token_secret
          );
          detailInfo.value = response.content;
          if (!signAddress.value) signAddress.value = firstValue(response.content?.location, response.content?.address) || "";
        }
      } catch (error) {
        console.error(error);
      }
    };

    const joinCurrentEvent = async (actiId) => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      if (!actiId) {
        toast.error("活动 ID 缺失，无法报名。", { position: "top-center" });
        return;
      }

      try {
        await ElMessageBox.confirm("确认报名该活动？", "报名确认", {
          type: "warning",
          center: true,
          customClass: "action-confirm-box",
          confirmButtonText: "确认报名",
          cancelButtonText: "取消",
          autofocus: false,
        });
      } catch (error) {
        return;
      }

      actionLoading.value = true;
      try {
        if (isClassSession(userData)) {
          const response = await joinClassEvent(userData, actiId);
          if (isSuccessResponse(response)) {
            const message = successMessage(response, "报名成功，记得准时签到哦~");
            lastActionMessage.value = message;
            toast.success(message, { position: "top-center" });
            await refreshDetail(actiId);
            await fetchData();
          } else {
            const message = successMessage(response, "报名失败");
            lastActionMessage.value = message;
            toast.error(message, { position: "top-center" });
          }
          return;
        }

        const uid = firstValue(userData.user_info?.uid, userData.uid, userData.mid);
        if (!uid) {
          toast.error("用户 ID 缺失，无法生成报名签名。", { position: "top-center" });
          return;
        }

        const response = await joinEvent(
          uid,
          actiId,
          userData.oauth_token,
          userData.oauth_token_secret
        );
        if (isSuccessResponse(response)) {
          const message = successMessage(response, "报名成功，记得准时签到哦~");
          lastActionMessage.value = message;
          toast.success(message, { position: "top-center" });
          await refreshDetail(actiId);
          await fetchData();
        } else {
          const message = successMessage(response, "报名失败");
          lastActionMessage.value = message;
          toast.error(message, { position: "top-center" });
        }
      } catch (error) {
        lastActionMessage.value = error?.message || "报名活动失败，请检查网络连接。";
        toast.error(lastActionMessage.value, { position: "top-center" });
        console.error(error);
      } finally {
        actionLoading.value = false;
      }
    };

    const cancelCurrentEvent = async (actiId) => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      if (!actiId) {
        toast.error("活动 ID 缺失，无法取消报名。", { position: "top-center" });
        return;
      }

      try {
        await ElMessageBox.confirm("确认取消报名该活动？", "取消确认", {
          type: "warning",
          center: true,
          customClass: "action-confirm-box",
          confirmButtonText: "确认取消",
          cancelButtonText: "返回",
          autofocus: false,
        });
      } catch (error) {
        return;
      }

      actionLoading.value = true;
      try {
        if (isClassSession(userData)) {
          const response = await cancelClassEvent(userData, actiId);
          if (isSuccessResponse(response)) {
            const message = successMessage(response, "取消成功");
            lastActionMessage.value = message;
            toast.success(message, { position: "top-center" });
            await refreshDetail(actiId);
            await fetchData();
          } else {
            const message = successMessage(response, "取消失败");
            lastActionMessage.value = message;
            toast.error(message, { position: "top-center" });
          }
          return;
        }

        const response = await cancelEvent(
          actiId,
          userData.oauth_token,
          userData.oauth_token_secret
        );
        if (isSuccessResponse(response)) {
          const message = successMessage(response, "取消成功");
          lastActionMessage.value = message;
          toast.success(message, { position: "top-center" });
          await refreshDetail(actiId);
          await fetchData();
        } else {
          const message = successMessage(response, "取消失败");
          lastActionMessage.value = message;
          toast.error(message, { position: "top-center" });
        }
      } catch (error) {
        lastActionMessage.value = error?.message || "取消报名失败，请检查网络连接。";
        toast.error(lastActionMessage.value, { position: "top-center" });
        console.error(error);
      } finally {
        actionLoading.value = false;
      }
    };

    const fillCurrentLocation = async () => {
      if (!navigator.geolocation) {
        toast.error("当前环境不支持定位，请手动填写签到地点。", { position: "top-center" });
        return;
      }

      locating.value = true;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
        });
        const latitude = Number(position.coords.latitude).toFixed(6);
        const longitude = Number(position.coords.longitude).toFixed(6);
        const accuracy = Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : 0;
        const baseAddress = firstValue(detailInfo.value?.location, detailInfo.value?.address, "当前位置");
        signAddress.value = `${baseAddress}（经度 ${longitude}，纬度 ${latitude}${
          accuracy ? `，精度约 ${accuracy}m` : ""
        }）`;
        toast.success("已填入当前位置", { position: "top-center" });
      } catch (error) {
        toast.error(describeGeoError(error), { position: "top-center" });
        console.error(error);
      } finally {
        locating.value = false;
      }
    };

    const submitLocalSign = async (mode) => {
      const userData = ensureLoggedIn();
      if (!userData) return;
      if (!isClassSession(userData)) {
        toast.error("本地签到需要新版 Class 登录，请在设置中切换通道后重新登录。", {
          position: "top-center",
        });
        return;
      }

      const actiId = getActivityId(detailInfo.value);
      const address = signAddress.value.trim();
      const isGpsMode = mode.startsWith("gps-");
      const isOut = mode.endsWith("-out");
      const actionLabel = `${isGpsMode ? "GPS 定位" : "扫码/普通"}${isOut ? "签退" : "签到"}`;
      if (!actiId) {
        toast.error("活动 ID 缺失，无法提交签到。", { position: "top-center" });
        return;
      }
      if (isGpsMode && !canSubmitGpsSign.value) {
        toast.error("当前活动不是 GPS 定位签到，不能调用定位签到接口。", {
          position: "top-center",
        });
        return;
      }
      if (isGpsMode && !address) {
        toast.error("请先填写签到地点或获取当前位置。", { position: "top-center" });
        return;
      }

      try {
        await ElMessageBox.confirm(`确认以当前账号提交${actionLabel}？`, "签到确认", {
          type: "warning",
          center: true,
          customClass: "action-confirm-box",
          confirmButtonText: `确认${isOut ? "签退" : "签到"}`,
          cancelButtonText: "取消",
          autofocus: false,
        });
      } catch (error) {
        return;
      }

      signLoading.value = true;
      signAction.value = mode;
      try {
        let response;
        if (isGpsMode) {
          response = isOut
            ? await signOutClassActivityGps(userData, actiId, address)
            : await signInClassActivityGps(userData, actiId, address);
        } else {
          response = isOut
            ? await signOutClassActivityUserQr(userData, actiId)
            : await signInClassActivityUserQr(userData, actiId);
        }

        if (isSuccessResponse(response)) {
          const message = successMessage(response, `${actionLabel}提交成功`);
          signResultText.value = message;
          lastActionMessage.value = message;
          toast.success(message, { position: "top-center" });
          await refreshDetail(actiId);
          await fetchData();
        } else {
          const message = successMessage(response, `${actionLabel}失败`);
          signResultText.value = message;
          lastActionMessage.value = message;
          toast.error(message, { position: "top-center" });
        }
      } catch (error) {
        lastActionMessage.value = error?.message || `${actionLabel}失败，请检查网络连接。`;
        toast.error(lastActionMessage.value, { position: "top-center" });
        console.error(error);
      } finally {
        signLoading.value = false;
        signAction.value = "";
      }
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value -= 1;
        fetchData();
      }
    };

    const nextPage = () => {
      if (!hasNextPage.value) return;
      currentPage.value += 1;
      fetchData();
    };

    const convert = (inputValue) => {
      if (String(inputValue) === "0") return "否";
      if (String(inputValue) === "1") return "是";
      return "—";
    };

    const copySignInfo = async (info) => {
      const text = [
        `活动ID：${info?.actiId || info?.id || "—"}`,
        `活动名称：${info?.name || "—"}`,
        `签到方式：${info?.signTypeName || (String(info?.is_gps_sign) === "1" ? "GPS 定位" : "扫码 / 普通签到")}`,
        `需要签退：${convert(info?.is_need_sign_out)}`,
      ].join("\n");

      try {
        await navigator.clipboard.writeText(text);
        toast.success("已复制活动签到信息", { position: "top-center" });
      } catch (error) {
        console.error(error);
        toast.info(text, { position: "top-center", timeout: 6000 });
      }
    };

    onMounted(() => {
      fetchData();
    });
    onBeforeUnmount(() => {
      detailDialogVisible.value = false;
      detailInfo.value = null;
    });

    return {
      events,
      currentPage,
      searchQuery,
      searchEvents,
      fetchCanSignEvents,
      fetchMyClassEvents,
      fetchManagedClassEvents,
      fetchCollectedClassEvents,
      prevPage,
      nextPage,
      hasNextPage,
      formatTime,
      handleRowClick,
      detailDialogVisible,
      detailInfo,
      convert,
      joinCurrentEvent,
      cancelCurrentEvent,
      canRegister,
      registerableCount,
      currentDetailId,
      activityIdOf,
      loading,
      actionLoading,
      canUseLocalSign,
      canSubmitGpsSign,
      canUseLegacyEventAdmin,
      canViewEventMembers,
      signMethodText,
      joinStatusText,
      userSignStatusText,
      signAddress,
      signLoading,
      locating,
      signAction,
      signResultText,
      lastActionMessage,
      managerTargetUid,
      managerLoading,
      managerAction,
      memberKeyword,
      memberListLoading,
      managerMembers,
      memberPage,
      memberHasPrev,
      memberHasNext,
      memberTotalText,
      activityExtraLoading,
      activityExtraMessage,
      activityNews,
      activityEvaluations,
      activityVotePlayers,
      activityJoinMaterial,
      activityMidwayStatusText,
      activityMidwayRecords,
      activityWriteLoading,
      activityWriteAction,
      announceTitle,
      evaluationStar,
      evaluationPics,
      votePlayerId,
      loadActivityExtras,
      submitActivityWriteAction,
      loadEventMembers,
      submitLegacyManagerAction,
      fillCurrentLocation,
      submitLocalSign,
      displayValue,
      readableFlag,
      formatExtraTime,
      copySignInfo,
    };
  },
};
</script>

<style scoped>
.event-page {
  display: grid;
  gap: 22px;
}

.event-console,
.activity-board {
  padding: 26px;
}

.event-toolbar {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
  gap: 24px;
  align-items: end;
}

.event-toolbar h2 {
  margin: 14px 0 0;
  font-size: clamp(30px, 4.6vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.06em;
}

.event-toolbar p {
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  font-family: var(--font-ui);
  line-height: 1.8;
}

.search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(5, auto);
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid var(--line);
  border-radius: 22px;
}

.event-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.activity-board {
  min-height: 420px;
}

.activity-list {
  display: grid;
  gap: 14px;
}

.activity-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px 170px;
  gap: 20px;
  align-items: center;
  width: 100%;
  padding: 20px;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 10px 24px rgba(23, 32, 51, 0.06);
  transition: 0.2s ease;
}

.activity-card:hover {
  border-color: rgba(242, 106, 46, 0.26);
  box-shadow: var(--shadow-tight);
  transform: translateY(-2px);
}

.activity-id {
  color: var(--primary-deep);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.activity-main h3 {
  margin: 8px 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.activity-main p,
.activity-meta,
.activity-time,
.detail-label,
.detail-grid span,
.detail-grid small {
  color: var(--muted);
  font-family: var(--font-ui);
}

.activity-main p {
  margin: 0;
}

.activity-meta,
.activity-time {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.activity-time {
  flex-direction: column;
  align-items: flex-end;
  font-size: 13px;
}

.activity-meta span:not(.status-pill) {
  padding: 7px 10px;
  background: rgba(23, 32, 51, 0.05);
  border-radius: 999px;
}

.status-pill {
  padding: 7px 10px;
  font-weight: 800;
  border-radius: 999px;
}

.status-pill.open {
  color: var(--jade);
  background: rgba(27, 138, 122, 0.12);
}

.status-pill.closed {
  color: var(--muted);
  background: rgba(23, 32, 51, 0.06);
}

.pagination {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  color: var(--muted);
  font-family: var(--font-ui);
}

.dialog-heading h3 {
  margin: 12px 0 0;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.detail-shell {
  display: grid;
  gap: 18px;
}

.detail-hero {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-hero > div {
  padding: 22px;
  color: white;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent),
    linear-gradient(135deg, var(--indigo), var(--primary));
  border-radius: 24px;
}

.detail-hero strong,
.detail-hero span {
  display: block;
}

.detail-hero strong {
  margin-bottom: 8px;
  font-size: 22px;
}

.detail-hero span,
.detail-label {
  color: rgba(255, 255, 255, 0.76);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.detail-item {
  padding: 18px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.detail-item.wide {
  grid-column: 1 / -1;
}

.detail-item p {
  margin: 10px 0 0;
  color: var(--ink);
  font-family: var(--font-ui);
  line-height: 1.8;
  white-space: pre-wrap;
}

.detail-item strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}

.sign-panel {
  padding: 18px;
  background:
    linear-gradient(135deg, rgba(27, 138, 122, 0.1), rgba(242, 106, 46, 0.08)),
    rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(27, 138, 122, 0.16);
  border-radius: 20px;
}

.sign-panel-head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  justify-content: space-between;
}

.sign-panel h4 {
  margin: 10px 0 0;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.sign-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.sign-grid > div {
  padding: 12px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.sign-grid span {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
}

.sign-grid strong {
  font-size: 16px;
}

.local-sign-box {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px dashed rgba(27, 138, 122, 0.24);
  border-radius: 16px;
}

.event-admin-box {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px dashed rgba(242, 106, 46, 0.28);
  border-radius: 16px;
}

.event-admin-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 10px;
}

.manager-member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.manager-member-list button {
  padding: 7px 10px;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 12px;
  cursor: pointer;
  background: rgba(23, 32, 51, 0.05);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.manager-member-list small {
  margin-left: 6px;
  color: var(--muted);
}

.manager-member-list span {
  margin-left: 6px;
  color: var(--primary-deep);
  font-weight: 900;
}

.member-pagination {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
}

.activity-extra-box {
  display: grid;
  gap: 12px;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(88, 99, 255, 0.08), rgba(27, 138, 122, 0.08)),
    rgba(255, 255, 255, 0.68);
  border: 1px dashed rgba(88, 99, 255, 0.22);
  border-radius: 18px;
}

.activity-extra-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.activity-extra-head h4 {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.extra-hint {
  margin: 0;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
  line-height: 1.7;
}

.extra-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.extra-grid > div,
.extra-list article {
  padding: 12px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.extra-grid span,
.extra-list small {
  display: block;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
}

.extra-grid strong,
.extra-list > strong,
.extra-list span {
  font-weight: 900;
}

.extra-list {
  display: grid;
  gap: 8px;
}

.extra-list article {
  display: grid;
  gap: 5px;
}

.extra-list p {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.danger-action-box {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px dashed rgba(221, 74, 63, 0.28);
  border-radius: 16px;
}

.danger-action-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.danger-action-grid .el-input-number {
  width: 100%;
}

.local-sign-copy {
  display: grid;
  gap: 4px;
}

.local-sign-copy strong {
  font-size: 17px;
}

.local-sign-copy span,
.sign-result-text {
  margin: 0;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 12px;
  line-height: 1.6;
}

.sign-result-text {
  color: var(--primary-deep);
  font-weight: 800;
}

.sign-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 14px;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

@media (max-width: 980px) {
  .event-toolbar,
  .activity-card {
    grid-template-columns: 1fr;
  }

  .activity-time {
    align-items: flex-start;
  }

  .event-stats,
  .detail-hero,
  .detail-grid,
  .sign-grid,
  .extra-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .event-page {
    gap: 14px;
  }

  .event-console,
  .activity-board {
    padding: 16px;
    border-radius: 22px;
  }

  .event-toolbar {
    gap: 16px;
  }

  .event-toolbar h2 {
    margin: 10px 0 0;
    font-size: clamp(28px, 10vw, 38px);
    line-height: 1.1;
  }

  .event-toolbar p {
    font-size: 13px;
  }

  .search-box {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
    border-radius: 18px;
  }

  .search-box .el-button {
    width: 100%;
  }

  .event-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 16px;
  }

  .event-stats .metric-card {
    min-height: 82px;
    padding: 12px 10px;
  }

  .event-stats .metric-value {
    font-size: 22px;
  }

  .activity-board {
    min-height: auto;
  }

  .activity-list {
    gap: 10px;
  }

  .activity-card {
    gap: 14px;
    padding: 16px;
    border-radius: 18px;
  }

  .activity-main h3 {
    font-size: 19px;
    line-height: 1.25;
  }

  .activity-main p,
  .activity-meta,
  .activity-time {
    font-size: 12px;
  }

  .activity-time {
    flex-direction: row;
  }

  .activity-meta span:not(.status-pill),
  .status-pill {
    padding: 6px 8px;
  }

  .pagination {
    gap: 8px;
    font-size: 12px;
  }

  .dialog-heading h3 {
    font-size: 24px;
    line-height: 1.15;
  }

  .detail-shell {
    gap: 12px;
  }

  .detail-hero {
    gap: 10px;
  }

  .detail-hero > div,
  .detail-item,
  .sign-panel {
    padding: 14px;
    border-radius: 16px;
  }

  .detail-hero strong,
  .detail-item strong {
    font-size: 18px;
  }

  .detail-item p {
    font-size: 13px;
    line-height: 1.75;
  }

  .sign-panel-head {
    display: grid;
  }

  .activity-extra-head {
    display: grid;
  }

  .sign-panel h4 {
    font-size: 21px;
  }

  .sign-panel-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .event-admin-form {
    grid-template-columns: 1fr;
  }

  .danger-action-grid {
    grid-template-columns: 1fr;
  }

  .sign-panel-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .detail-actions {
    position: sticky;
    bottom: -18px;
    display: grid;
    grid-template-columns: 1fr;
    padding: 12px 0 0;
    background: linear-gradient(to top, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72), transparent);
  }

  .detail-actions .el-button {
    width: 100%;
    margin-left: 0;
  }
}
</style>
