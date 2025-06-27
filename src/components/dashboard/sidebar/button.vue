<script setup lang="ts">
import { templateRef } from '@vueuse/core';
import { onMounted, ref } from 'vue';
import toggleArrowSVG from "../../../assets/svg/toggle_arrow.svg"

const props = defineProps<{ label: string; click?: (MouseEvent) => any; icon?: string }>();

const toggleable = ref(false)
const toggleState = ref(false)

const subButtonContainer = templateRef("subButtonContainer")
onMounted(() => {
  toggleable.value = (subButtonContainer.value.childElementCount > 0)
})

function processClick(e: MouseEvent) {
  if (toggleable.value) {
    toggleState.value = (!toggleState.value)
  } else {
    if (props.click) { props.click(e) }
  }
}
</script>

<template>
<button class="sidebar-button" @click="processClick">
  <div class="inner-siderbar-button">
    <img class="sidebar-button-icon"  :src="props.icon || ''" :style="`opacity: ${props.icon != null ? 1 : 0};`" />
    <p>{{ props.label }}</p>
    <img class="sidebar-toggle-arrow" :src="toggleArrowSVG" :style="`opacity: ${toggleable ? 1 : 0}; rotate: ${toggleState ? -90 : 0}deg`"/>
  </div>
</button>
<div class="sub-buttons" ref="subButtonContainer" v-show="toggleState">
  <slot></slot>
</div>
</template>

<style scoped>
.sidebar-button {
  width: 100%;
  padding-left: 15px;
  padding-right: 15px;
  color: white;
  font-family: BakbakOne;
  font-size: 20px;
  background: #343434;
  border: none;
  border-radius: 8px;
  padding-top: 5px;
  padding-bottom: 5px;
  margin-bottom: 8px;
  /* opacity: 0.5; */
  transition: filter 100ms linear;
  filter: brightness(1.0);
}

.sidebar-button:hover {
  filter: brightness(1.5);
}

.inner-siderbar-button {
  display: flex;
  justify-content: space-between;
}

.inner-siderbar-button > p {
  margin: 0px;
}

.sidebar-button-icon {
  width: 28px;
  height: 28px;
}

.sidebar-toggle-arrow { 
  transition: rotate 150ms ease-out;
}

.sub-buttons {
  margin-left: 60px;
}
</style>
