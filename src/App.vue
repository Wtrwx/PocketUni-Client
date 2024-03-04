<template>
  <div class="container">
    <el-menu mode="horizontal" @select="handleMenuClick">
      <el-menu-item index="/">主页</el-menu-item>
      <el-menu-item index="/event">活动</el-menu-item>
      <el-menu-item index="/notice">通知</el-menu-item>
      <el-menu-item index="/login">登录</el-menu-item>
    </el-menu>

    <component :is="currentView" />
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from "vue";
import Home from "./views/HomePage.vue";
import Login from "./views/LoginPage.vue";
import Event from "./views/EventPage.vue";
import Notice from "./views/NoticePage.vue";
import NotFound from "./views/NotFound.vue";

const debounce = (callback, delay) => {
  let tid;
  return function (...args) {
    const ctx = this;
    tid && clearTimeout(tid);
    tid = setTimeout(() => {
      callback.apply(ctx, args);
    }, delay);
  };
};

const _ResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
  constructor(callback) {
    callback = debounce(callback, 20);
    super(callback);
  }
};

const routes = {
  "/": Home,
  "/event": Event,
  "/notice": Notice,
  "/login": Login,
};

const currentPath = ref(window.location.hash);

watchEffect(() => {
  window.addEventListener("hashchange", () => {
    currentPath.value = window.location.hash;
  });
});

const currentView = computed(() => {
  return routes[currentPath.value.slice(1) || "/"] || NotFound;
});

const handleMenuClick = (index) => {
  window.location.hash = index;
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
</style>
