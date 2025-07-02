<script setup lang="ts">
import { templateRef } from '@vueuse/core';
import { inject, onMounted, ref } from 'vue';
import toggleArrowSVG from "../../../assets/svg/toggle_arrow.svg"
import { ReturnedValue } from '@vueuse/sound';

const hoverSFX: ReturnedValue = (inject("hoverSFX") as ReturnedValue)

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
<button class="sidebar-button" @click="processClick" @mouseenter="(_e: MouseEvent) => { hoverSFX.play() }">
  <div class="inner-siderbar-button">
    <img class="sidebar-button-icon"  :src="props.icon || ''" :style="`opacity: ${props.icon != null ? 1 : 0};`" />
    <p>{{ props.label }}</p>
    <img class="sidebar-toggle-arrow" :src="toggleArrowSVG" :style="`opacity: ${toggleable ? 1 : 0}; rotate: ${toggleState ? -90 : 0}deg`"/>
  </div>
</button>
<Transition name="sub-buttons">
  <div class="sub-buttons" ref="subButtonContainer" v-show="toggleState">
    <slot></slot>
  </div>
</Transition>
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
  transition: filter 100ms linear, scale 500ms ease;
  filter: brightness(1.0);
  scale: 1.0;
}

.sidebar-button:hover {
  filter: brightness(1.5);
  scale: 1.1;
  transition: filter 100ms linear, scale 100ms linear;
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

.sub-buttons-enter-active {
  overflow: hidden;
  transition: height 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease;
}

.sub-buttons-leave-active {
  /* position: fixed; */
  /* max-width: calc(100% - 360px); */
  overflow: hidden;
  transition: height 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease;
}

.sub-buttons-enter-to,
.sub-buttons-leave-from {
  height: 100%;
  opacity: 1;
}

.sub-buttons-enter-from,
.sub-buttons-leave-to {
  height: 0%;
  opacity: 0;
}
</style>
