<script setup lang="ts">
</script>

<template>
<div id="spinner">
  <div id="dots-container">
    <div v-for="(val, idx) in new Array(5)" :style="`--index: ${idx}`" class="loading-dot wavy"></div>
  </div>
</div>
</template>

<style scoped>
#spinner {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 9000;
  background-color: #000000ec;
  /* opacity: 1.0; */
  display: flex;
  justify-content: center;
  align-items: center;
}

#dots-container {
  display: flex;
  gap: 64px;
}

.loading-dot {
  position: relative;
  width: 64px;
  height: 64px;
  background: #000;
  border-radius: 50%;
  outline: #6721ff 25px solid;
}

.wavy {
  animation: 1s ease-in-out 0s infinite alternate wavy;
  animation-delay: calc(var(--index) * -300ms);
}

@keyframes wavy {
  from {
    top: 16px;
  }
  to {
    top: -16px;
  }
}
</style>
