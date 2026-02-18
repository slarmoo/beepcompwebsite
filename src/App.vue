<script setup lang="ts">
import { useSound } from '@vueuse/sound';
import { onMounted, provide, ref } from 'vue';

import Dashboard from './components/layers/Dashboard.vue';
import Popups from './components/layers/Popups.vue';
import SignUps from './components/layers/SignUps.vue';
import Background from './components/layers/Background.vue';
import Spinner from './components/layers/Spinner.vue';

import { API } from './modules/api';
import { active_toasts, currentMode, GeneralEvents, isMobile, killToast, SITE_MODES, StartedUp } from './modules/persists';
import { loadingThings } from './modules/init';
import { KeyEvents } from './modules/keys';

// loadingThings.value["test"] = true

API.GET("/").then((response) => {
    console.log(response);
}).catch((error) => {
    console.error("Error fetching API:", error);
});

import brainscan_preAudio from "./assets/sfx/BRAINSCAN_pre.flac"
import brainscan_mainAudio from "./assets/sfx/brainscan_main.flac"
import brainscan_postAudio from "./assets/sfx/brainscan_post.flac"
import printingAudio from "./assets/sfx/printing.flac"
const printingSFX = useSound(printingAudio, {
  interrupt: false,
  playbackRate: 3
})
provide("printingSFX", printingSFX)

import hoverAudio from "./assets/sfx/hover.flac"
import { useResizeObserver } from '@vueuse/core';
const hoverSFX = useSound(hoverAudio, {
  interrupt: false
})
provide("hoverSFX", hoverSFX)

function startup() {
  if (!StartedUp.value) {
    GeneralEvents.emit('startup')
  }
}

KeyEvents.on("any", () => {
  startup()
})
// function mobileCheck() {
//   if (isMobile.value) {
//     document.body.style.setProperty("--is-mobile", "1")
//     document.body.style.setProperty("--scr-width", (window.innerWidth * 2) + "px")
//     document.body.style.setProperty("--scr-height", (window.innerHeight * 2) + "px")
//     document.body.style.setProperty("zoom", "0.5")
//     document.body.style.setProperty("display", "standalone")
//     // window.scrollTo(0, 1);
//   } else {
//     document.body.style.setProperty("--is-mobile", "0")
//     document.body.style.setProperty("--scr-width", "100vw")
//     document.body.style.setProperty("--scr-height", "100vh")
//     document.body.style.setProperty("zoom", "1.0")
//     document.body.style.removeProperty("display")
//   }

//   // print("css: ", document.body.style)
// }
// onMounted(() => {
//   mobileCheck()
// })
// const bodyRef = ref(window.document.body)
// useResizeObserver(bodyRef, entries => {
//   // const entry = entries[0]
//   // const { width, height } = entry.contentRect
//   mobileCheck()
// })
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';

const dialog_visible = ref(false)
const dialog_header = ref("")
const dialog_content = ref("")

GeneralEvents.on("open_dialog", (content: string, header: string) => {
  dialog_visible.value = true
  dialog_header.value = header
  dialog_content.value = content
})

const image_dialog_visible = ref(false)
const image_dialog_header = ref("")
const image_dialog_src = ref("")

GeneralEvents.on("open_image_dialog", (src: string, header: string) => {
  image_dialog_visible.value = true
  image_dialog_header.value = header
  image_dialog_src.value = src
})
</script>

<template>
<Dialog v-model:visible="dialog_visible" modal :header="dialog_header" maximizable  :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
  <p v-for="line in dialog_content.split('\n')" v-twemoji>{{ line }}</p>
</Dialog>
<Dialog v-model:visible="image_dialog_visible" modal :header="image_dialog_header" maximizable  :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
  <img :src="image_dialog_src" style="display: flex; margin: auto; border-radius: 15px; width: 100%; height: 100%; object-fit: contain;" />
</Dialog>
<ConfirmDialog></ConfirmDialog>
<div id="startup-page" @click="startup()" v-if="!StartedUp">
  <p>Press Anything to Enter...</p>
</div>
<div id="toast-container">
  <TransitionGroup name="toasts">
  <div v-for="entry in active_toasts" class="toast" :key="entry.id" :style="`--toast-color: ${entry.color}`" @click="killToast(entry.id)">
    <p>{{ entry.text }}</p>
  </div>
  </TransitionGroup>
</div>
<Transition name="spinner" :duration="300">
    <Spinner class="spinner" v-show="Object.values(loadingThings).some(bool => bool)" /> <!-- LoadingSpinner -->
</Transition>
<Popups v-if="false" /> <!-- Popups -->
<Dashboard v-if="currentMode == SITE_MODES.MAIN"/> <!-- Main --> 
<SignUps v-if="currentMode == SITE_MODES.SIGN_UP"/> <!-- SignUps -->
<Background v-if="!isMobile"/> <!-- Background -->
</template>

<style scoped>
#startup-page {
  z-index: 5000;
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 30px;
  pointer-events: all;
  background: #000000ec;
  font-family: BakbakOne;
  font-size: 64px;
  color: white;
}

#toast-container {
  z-index: 500;
  position: absolute;
  top: 30px;
  right: 30px;
  width: 640px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
  pointer-events: none;
}

.toast {
  font-family: BakbakOne;
  font-size: 38px;
  color: white;
  background: var(--toast-color);
  border-radius: 15px;
  --padding: 15px;
  padding: var(--padding);
  width: calc(100% - (var(--padding) * 2));
  /* height: calc(80px - (var(--padding) * 2)); */
  pointer-events: all;
}

.toast > p {
  margin: 0px;
}

.toasts-move, /* apply transition to moving elements */
.toasts-enter-active,
.toasts-leave-active {
  transition: all 0.5s ease;
}

.toasts-enter-from,
.toasts-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.toasts-leave-active {
  position: absolute;
}

.spinner {
    opacity: 1.0;
    transition: opacity 200ms ease-in-out;
}

.spinner-enter-active,
.spinner-leave-active {
  opacity: 1.0;
}

.spinner-enter-from,
.spinner-leave-to {
  opacity: 0.0;
}
</style>
