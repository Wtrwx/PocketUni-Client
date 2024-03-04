<template>
  <el-dialog v-model="detailDialogVisible" title="活动详情" width="50%">
    <div v-if="detailInfo">
      <p>活动名称: {{ detailInfo.name }}</p>
      <p>
        报名对象:
        {{ detailInfo.allow_school ? detailInfo.allow_school.join(", ") : "" }}
        {{
          detailInfo.allow_year ? detailInfo.allow_year.filter(Boolean).join(", ") : ""
        }}
        {{
          detailInfo.allow_group ? detailInfo.allow_group.filter(Boolean).join(", ") : ""
        }}
      </p>
      <p>
        报名时间: {{ formatTime(detailInfo.regStartTimeStr) }} -
        {{ formatTime(detailInfo.regEndTimeStr) }}
      </p>
      <p>
        活动时间: {{ formatTime(detailInfo.startTime) }} -
        {{ formatTime(detailInfo.endTime) }}
      </p>
      <p>活动简介: {{ detailInfo.descs }}</p>
      <p>二课分: {{ detailInfo.credit }}</p>
      <p>活动位置: {{ detailInfo.location }}</p>
      <p>可参与人数: {{ detailInfo.joinNum + detailInfo.leftNum }}</p>
      <p>已报名人数: {{ detailInfo.joinNum }}</p>
      <p>已签到人数: {{ detailInfo.sign_in_num }}</p>
      <p>已签退人数: {{ detailInfo.sign_out_num }}</p>
      <p>是否支持定位签到: {{ convert(detailInfo.is_gps_sign) }}</p>
      <p>是否需要签退: {{ convert(detailInfo.is_need_sign_out) }}</p>
      <el-button @click="joinCurrentEvent(detailInfo.actiId)" type="primary"
        >报名</el-button
      >
      <el-button @click="cancelCurrentEvent(detailInfo.actiId)" type="danger"
        >取消报名</el-button
      >
      <el-button
        v-if="isGpsSignIn"
        @click="handleGpsSignIn(detailInfo.actiId)"
        type="success"
        >定位签到</el-button
      >
      <el-button
        v-if="isGpsSignIn"
        @click="handleGpsSignOut(detailInfo.actiId)"
        type="success"
        >定位签退</el-button
      >
    </div>
  </el-dialog>
  <el-dialog v-model="advancedDialogVisible" title="高级" width="50%">
    <el-checkbox v-model="isGpsSignIn" label="定位签到" @change="saveGpsSignInStatus" />
  </el-dialog>
  <div class="container">
    <div class="search-container">
      <el-input v-model="searchQuery" placeholder="搜索..."></el-input>
      <el-button @click="searchEvents" type="primary">搜索</el-button>
      <el-button @click="advancedDialogVisible = true" round>高级</el-button>
    </div>
    <el-table :data="events" style="width: 100%" @row-click="handleRowClick">
      <el-table-column prop="id" label="ID" width="90"></el-table-column>
      <el-table-column label="标题" v-slot="{ row }">
        <div :style="{ color: canRegister(row.startline, row.deadline) ? 'green' : '' }">
          {{ row.title }}
        </div>
        <el-icon v-if="row.is_outside === '1'"><Location /></el-icon>
      </el-table-column>
      <el-table-column label="活动时间" v-slot="{ row }" width="150">
        <div>{{ formatTime(row.sTime) }}<br />{{ formatTime(row.eTime) }}</div>
      </el-table-column>
      <el-table-column prop="address" label="地点"></el-table-column>
      <el-table-column prop="credit" label="二课分"></el-table-column>
      <el-table-column prop="category" label="类型" width="90"></el-table-column>
    </el-table>

    <div class="pagination">
      <el-button @click="prevPage" :disabled="currentPage === 1">上一页</el-button>
      <span>第 {{ currentPage }} 页</span>
      <el-button @click="nextPage">下一页</el-button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import {
  newEventList,
  queryActivityDetailById,
  joinEvent,
  cancelEvent,
} from "@/utils/api";
import { gpsSignInAndOut } from "@/utils/mobileapi";
import { formatTime } from "@/utils/utils";

export default {
  methods: {
    canRegister(start, end) {
      const now = Math.floor(Date.now() / 1000);
      const startInt = parseInt(start, 10);
      const endInt = parseInt(end, 10);
      return now >= startInt && now <= endInt;
    },
  },
  setup() {
    const events = ref([]);
    const currentPage = ref(1);
    const searchQuery = ref("");
    const toast = useToast(); // 使用useToast函数创建toast函数
    const detailDialogVisible = ref(false);
    const detailInfo = ref(null);
    const advancedDialogVisible = ref(false);
    const savedGpsSignInStatus = localStorage.getItem("gpsSignInStatus");
    const isGpsSignIn = ref(
      savedGpsSignInStatus ? JSON.parse(savedGpsSignInStatus) : false
    );

    const drawerVisible = ref(false);
    const toggleDrawerVisible = () => {
      drawerVisible.value = !drawerVisible.value;
    };

    const fetchData = async () => {
      // 检查本地存储中是否存在登录信息
      const loggedIn = localStorage.getItem("loggedIn");
      const userData = JSON.parse(localStorage.getItem("userData"));

      if (
        loggedIn !== "true" ||
        !userData ||
        !userData.oauth_token ||
        !userData.oauth_token_secret
      ) {
        toast.error("未登录或token失效，请重新登录", { position: "top-center" }); // 直接使用toast函数
        window.location.hash = "#/login";
        return;
      }
      try {
        const sid = userData.sid;
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;
        const response = await newEventList(
          sid,
          searchQuery.value,
          "",
          currentPage.value,
          oauthToken,
          oauthTokenSecret
        );

        events.value = response.content;
      } catch (error) {
        // 处理错误
        if (error.response.data.message === "授权失败") {
          toast.error("未登录或token失效，请重新登录", { position: "top-center" });
          window.location.hash = "#/login";
        } else {
          toast.error("获取活动信息失败，请检查网络连接.", { position: "top-center" });
          console.error(error);
        }
      }
    };

    const saveGpsSignInStatus = () => {
      localStorage.setItem("gpsSignInStatus", JSON.stringify(isGpsSignIn.value));
    };

    const handleGpsSignIn = async (actiId) => {
      try {
        const userData = JSON.parse(localStorage.getItem("userData"));
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;
        const response = await gpsSignInAndOut(
          "gpsSignin",
          actiId,
          oauthToken,
          oauthTokenSecret
        );
        if (response.status === 1) {
          toast.success("定位签到成功", { position: "top-center" });
        } else {
          toast.error(response.msg, { position: "top-center" });
        }
      } catch (error) {
        toast.error("定位签到失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      }
    };

    const handleGpsSignOut = async (actiId) => {
      try {
        const userData = JSON.parse(localStorage.getItem("userData"));
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;
        const response = await gpsSignInAndOut(
          "gpsSignout",
          actiId,
          oauthToken,
          oauthTokenSecret
        );
        if (response.status === 1) {
          toast.success("定位签退成功", { position: "top-center" });
        } else {
          toast.error(response.msg, { position: "top-center" });
        }
      } catch (error) {
        toast.error("定位签退失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      }
    };

    const handleRowClick = async (row) => {
      try {
        // 在此处获取userData
        const loggedIn = localStorage.getItem("loggedIn");
        const userData = JSON.parse(localStorage.getItem("userData"));

        if (
          loggedIn !== "true" ||
          !userData ||
          !userData.oauth_token ||
          !userData.oauth_token_secret
        ) {
          toast.error("未登录或token失效，请重新登录", { position: "top-center" });
          window.location.hash = "#/login";
          return;
        }

        const actiId = row.id;
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;

        const response = await queryActivityDetailById(
          actiId,
          oauthToken,
          oauthTokenSecret
        );
        detailInfo.value = response.content;
        detailDialogVisible.value = true;
      } catch (error) {
        toast.error("获取详细信息失败，请检查网络连接.", { position: "top-center" });
        console.error(error);
      }
    };

    const searchEvents = () => {
      currentPage.value = 1;
      fetchData();
    };

    const joinCurrentEvent = async (actiId) => {
      const userData = JSON.parse(localStorage.getItem("userData"));

      try {
        const response = await joinEvent(
          userData.user_info.uid,
          actiId,
          userData.oauth_token,
          userData.oauth_token_secret
        );
        // console.log(response);
        if (response.status === 1) {
          toast.success("报名成功，记得准时签到哦~", { position: "top-center" });
        } else {
          toast.error(response.msg, { position: "top-center" });
        }
      } catch (error) {
        toast.error("报名活动失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      }
    };

    const cancelCurrentEvent = async (actiId) => {
      const userData = JSON.parse(localStorage.getItem("userData"));

      try {
        const response = await cancelEvent(
          actiId,
          userData.oauth_token,
          userData.oauth_token_secret
        );
        console.log(response);
        if (response.status === 1) {
          toast.success("取消成功", { position: "top-center" });
        } else {
          toast.error(response.msg, { position: "top-center" });
        }
      } catch (error) {
        toast.error("报名活动失败，请检查网络连接。", { position: "top-center" });
        console.error(error);
      }
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
        fetchData();
      }
    };

    const nextPage = () => {
      currentPage.value++;
      fetchData();
    };

    onMounted(() => {
      fetchData();
    });

    const convert = (inputValue) => {
      if (inputValue === "0") {
        return "否";
      } else if (inputValue === "1") {
        return "是";
      }
    };

    return {
      events,
      currentPage,
      searchQuery,
      searchEvents,
      prevPage,
      nextPage,
      formatTime,
      handleRowClick,
      detailDialogVisible,
      detailInfo,
      advancedDialogVisible,
      convert,
      joinCurrentEvent,
      cancelCurrentEvent,
      isGpsSignIn,
      saveGpsSignInStatus,
      handleGpsSignIn,
      handleGpsSignOut,
      drawerVisible,
      toggleDrawerVisible,
    };
  },
};
</script>

<style scoped>
.container {
  max-width: auto;
  margin: 0 auto;
  padding: 20px;
}

.search-container {
  display: flex;
  margin-bottom: 20px;
}
.pagination {
  margin-top: 20px;
  text-align: center;
}

.pagination button {
  margin: 0 10px;
}
</style>
