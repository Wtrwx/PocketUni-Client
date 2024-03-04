<template>
  <el-dialog v-model="myQRVisible" title="我的二维码" width="30%" center>
    <div class="qrcode-container">
      <vue-qrcode
        v-if="myQRVisible"
        :value="qrcodeValue"
        :options="{ width: 200 }"
      ></vue-qrcode>
    </div>
    <p v-if="myQRVisible" class="countdown-text">二维码将在 {{ countdown }} 秒后失效</p>
  </el-dialog>

  <el-dialog v-model="myEventVisible" title="我的活动" width="50%" center>
    <el-table :data="eventList" stripe style="width: 100%">
      <el-table-column prop="id" label="ID"></el-table-column>
      <el-table-column prop="title" label="活动名称"></el-table-column>
      <el-table-column prop="credit" label="学分"></el-table-column>
      <el-table-column label="时间">
        <template #default="scope">
          <div v-if="scope.row.sTime">{{ formatTime(scope.row.sTime) }}</div>
          <div v-if="scope.row.eTime">{{ formatTime(scope.row.eTime) }}</div>
        </template>
      </el-table-column>

      <el-table-column prop="address" label="活动地点"></el-table-column>
    </el-table>

    <div class="pagination">
      <el-button @click="prevPage" :disabled="currentPage === 1">上一页</el-button>
      <span>第 {{ currentPage }} 页</span>
      <el-button @click="nextPage">下一页</el-button>
    </div>
  </el-dialog>
  <el-card class="user-profile" v-if="userProfile">
    <div>
      <h1>{{ userProfile.realname }}</h1>
      <p>学号: {{ userProfile.sno }}</p>
      <p>学院: {{ userProfile.yx }}</p>
      <p>专业: {{ userProfile.major }}</p>
      <p>年级: {{ userProfile.year }}</p>
      <p>班级: {{ userProfile.class }}</p>
      <p>诚信度: {{ userProfile.cx }}</p>
      <p>二课分: {{ userProfile.credit }}</p>
      <p>PU银豆: {{ userProfile.amount2 }}</p>
      <p>活动: {{ userProfile.event_count }}</p>
      <p>群组: {{ userProfile.group_count }}</p>
      <el-button @click="generateQRCode" type="primary">我的二维码</el-button>
      <el-button @click="getMyEvent" type="primary">我的活动</el-button>
      <el-button @click="logout()" type="danger">登出</el-button>
    </div>
  </el-card>
</template>

<script>
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { getPersonalBasicInfo, getMyEventList } from "@/utils/api";
import { getPersonalInfo } from "@/utils/mobileapi";
import { encrypt } from "@/utils/des";
import { formatTime } from "@/utils/utils";

export default {
  setup() {
    const toast = useToast();
    const userProfile = ref(null);
    const myQRVisible = ref(false);
    const myEventVisible = ref(false);
    const qrcodeValue = ref("");
    const countdown = ref(25);
    let countdownInterval;
    const eventList = ref([]);
    const currentPage = ref(1);
    const pageSize = ref(5);
    const totalItems = ref(0);

    const getMyEvent = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("userData"));
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;
        const response = await getMyEventList(
          oauthToken,
          oauthTokenSecret,
          currentPage.value,
          pageSize.value
        );
        if (response !== "") {
          eventList.value = response;
          totalItems.value = response.total_count;
          myEventVisible.value = true;
        } else {
          // 处理错误
          toast.error("获取活动列表失败", { position: "top-center" });
        }
      } catch (error) {
        // 处理错误
        if (error.response.data.message === "授权失败") {
          toast.error("未登录或token失效，请重新登录", { position: "top-center" });
          window.location.hash = "#/login";
        } else {
          toast.error("获取活动列表失败，请检查网络连接.", { position: "top-center" });
          console.error(error);
        }
      }
    };

    const startCountdown = () => {
      countdownInterval = setInterval(() => {
        if (countdown.value > 0) {
          countdown.value--;
        } else {
          clearInterval(countdownInterval);
          generateQRCode();
        }
      }, 1000);
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
        toast.error("未登录或token失效，请重新登录", { position: "top-center" });
        window.location.hash = "#/login";
        return;
      }

      try {
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;
        const response = await getPersonalBasicInfo(oauthToken, oauthTokenSecret);
        if (response.code === 0 && response.message === "success") {
          userProfile.value = response.content;
        } else {
          // 处理错误
          toast.error("获取个人信息失败", { position: "top-center" });
        }
      } catch (error) {
        // 处理错误
        if (error.response.data.message === "授权失败") {
          toast.error("未登录或token失效，请重新登录", { position: "top-center" });
          window.location.hash = "#/login";
        } else {
          toast.error("获取个人信息失败，请检查网络连接.", { position: "top-center" });
          console.error(error);
        }
      }
    };

    const generateQRCode = async () => {
      const userData = JSON.parse(localStorage.getItem("userData"));
      const oauthToken = userData.oauth_token;
      const oauthTokenSecret = userData.oauth_token_secret;
      const personalInfo = await getPersonalInfo(oauthToken, oauthTokenSecret);
      const time = Math.floor(Date.now() / 1000);
      const str =
        "xyhui://user/" +
        userData.user_info.uid +
        "/" +
        time +
        "/" +
        personalInfo.content.user_info.uname;

      qrcodeValue.value = encrypt(str);
      myQRVisible.value = true;
      countdown.value = 25;
      startCountdown();
    };

    const logout = async () => {
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("userData");
      toast.success("登出成功", { position: "top-center" });
      window.location.hash = "#/login";
    };

    onMounted(() => {
      fetchData();
    });

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
        getMyEvent();
      }
    };

    const nextPage = () => {
      currentPage.value++;
      getMyEvent();
    };

    return {
      toast,
      userProfile,
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
      formatTime,
    };
  },
};
</script>

<style scoped>
.user-profile {
  text-align: center;
  padding: 20px;
  max-width: auto;
  margin: 20px auto;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px; /* 调整高度 */
}

.countdown-text {
  text-align: center;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.pagination button {
  margin: 0 10px;
}
</style>