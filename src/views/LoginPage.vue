<template>
  <div class="header-text">PU口袋校园</div>

  <div class="login-container">
    <form @submit.prevent="login" class="login-form">
      <div class="form-group">
        <el-select
          v-model="selectedSchool"
          filterable
          placeholder="选择学校"
          class="custom-select"
          :style="{ width: '100%' }"
        >
          <el-option
            v-for="school in schoolList"
            :key="school"
            :label="school.name"
            :value="school.email"
          >
          </el-option>
        </el-select>
      </div>
      <div class="form-group">
        <el-input v-model="username" placeholder="用户名" required></el-input>
      </div>
      <div class="form-group">
        <el-input
          v-model="password"
          placeholder="密码"
          type="password"
          required
        ></el-input>
      </div>
      <el-button type="primary" native-type="submit">登录</el-button>
    </form>
    <div class="qr-code-container">
      <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="二维码" />
      <p>使用PU口袋校园APP扫码登录</p>
    </div>
  </div>
</template>
<script>
import { getLoginQRCode, login, pollingLogin, getSchools } from "@/utils/api";
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
    };
  },

  async created() {
    if (document.visibilityState === "visible") {
      // 页面在前台，开始加载二维码和轮询
      await this.loadQRCodeAndStartPolling();
    } else {
      // 页面不在前台，添加可见性状态改变的事件监听器
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  },

  methods: {
    async handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        // 页面回到前台，移除事件监听器，并开始加载二维码和轮询
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        await this.loadQRCodeAndStartPolling();
      }
    },
    async loadQRCodeAndStartPolling() {
      await this.fetchSchools();
      try {
        const response = await getLoginQRCode();
        if (response.code === 0) {
          this.qrCodeUrl = response.content.dataUrl;
          this.pollingTimer = setInterval(async () => {
            // 检测当前URL是否为 #/login
            if (window.location.hash !== "#/login") {
              // 如果不是 #/login，则停止轮询
              clearInterval(this.pollingTimer);
              return;
            }

            try {
              const result = await pollingLogin(response.content.token);
              if (result.code === 0 && result.message === "success") {
                // 处理登录成功逻辑
                console.log("登录成功");
                this.toast.success("登录成功", { position: "top-center" });
                // 保存登录状态和用户信息到本地存储
                localStorage.setItem("loggedIn", "true");
                localStorage.setItem("userData", JSON.stringify(result.content));
                window.location.hash = "#/";
                clearInterval(this.pollingTimer);
              } else if (result.code === 2 && result.message === "token失效") {
                // 处理token失效逻辑
                console.log("token失效");
                location.reload();
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

    async fetchSchools() {
      try {
        const response = await getSchools();
        this.schoolList = response;
      } catch (error) {
        console.error(error);
        // 处理错误
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

        const usernameWithSchool = this.username + selectedSchool.email;
        const response = await login(
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
.login-form {
  width: 300px;
  padding: 30px;
  margin-top: 5%;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.form-group {
  margin-bottom: 15px;
}

button {
  width: 100%;
  padding: 1em;
  font-size: 1.125em;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.header-text {
  font-size: 2em;
  margin-top: 5%;
  margin-bottom: 0px;
  text-align: center;
}

.login-container {
  display: flex;
  justify-content: center;
  height: auto;
  margin-top: 1%;
}

.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40px;
}

.qr-code-container img {
  margin-bottom: 0px;
}
</style>
