<template>
  <div>
    <el-card v-for="message in messages" :key="message.message_id" class="box-card">
      <template v-slot:header>
        <div class="clearfix">
          <span>{{ message.title }} {{ formatTime(message.created_at) }}</span>
        </div>
      </template>
      <div>{{ message.content }}</div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { getMessage } from "@/utils/mobileapi";
import { formatTime } from "@/utils/utils";

export default {
  setup() {
    const messages = ref([]);

    onMounted(async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("userData"));
        const oauthToken = userData.oauth_token;
        const oauthTokenSecret = userData.oauth_token_secret;

        const page = 1;
        const type = "1";

        const response = await getMessage(oauthToken, oauthTokenSecret, page, type);
        messages.value = response.content;
      } catch (error) {
        console.error(error);
      }
    });

    return {
      messages,
      formatTime,
    };
  },
};
</script>

<style scoped>
.box-card {
  margin-top: 20px;
  margin-bottom: 20px;
}
</style>
