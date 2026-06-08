<template>
  <section class="not-found glass-panel">
    <span class="section-kicker">404 / LOST ROUTE</span>
    <h2>这页走丢了</h2>
    <p>当前地址没有对应的控制台页面。回到总览继续进行授权测试与兼容性验证。</p>
    <el-button type="primary" @click="goHome">回到主页</el-button>
  </section>
</template>

<script setup>
const goHome = () => {
  window.location.hash = "#/";
};
</script>

<style scoped>
.not-found {
  display: grid;
  min-height: 520px;
  padding: 46px;
  place-content: center;
  text-align: center;
}

.not-found h2 {
  margin: 18px 0 12px;
  font-size: clamp(44px, 8vw, 92px);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.1em;
}

.not-found p {
  max-width: 520px;
  margin: 0 auto 24px;
  color: var(--muted);
  font-family: var(--font-ui);
  line-height: 1.8;
}
</style>
