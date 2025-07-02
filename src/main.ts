// import "./lib/Blob.js"
// import "./lib/FileSaver.min.js"
// import "./lib/riffwave.js"
// import "./lib/animalese.js"

import "./extends/print"
import "./extends/string"
import "./extends/animalese"

import "./modules/keys"

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import VueMobileDetection from "vue-mobile-detection";
import ConfirmationService from 'primevue/confirmationservice';
import DialogService from 'primevue/dialogservice'

import { createApp, ref, inject, Plugin } from 'vue';
import './style.css'
import App from './App.vue'
import { isMobile } from "./modules/persists";


export const app = createApp(App)
app.use((PrimeVue as any), {
    // Default theme configuration
    theme: {
        preset: Aura,
        options: {
            prefix: 'p',
            darkModeSelector: 'system',
            cssLayer: false
        }
    }
 });
// app.use((PrimeVue as any), { unstyled: true })
// app.use((PrimeVue as Plugin<[]>), { unstyled: true })
app.use(VueMobileDetection)
app.use(DialogService);
app.use(ConfirmationService)

let accessRefreshKey = ref(0)
app.provide("accessRefreshKey", accessRefreshKey)

function mobileCheck() {
  isMobile.value = (app.config.globalProperties as any).$isMobile()
  if (isMobile.value) {
    document.body.style.setProperty("--is-mobile", "1")
    document.body.style.setProperty("--scr-width", (window.innerWidth * 2) + "px")
    document.body.style.setProperty("--scr-height", (window.innerHeight * 2) + "px")
    document.body.style.setProperty("zoom", "0.5")
    document.body.style.setProperty("display", "standalone")
    // window.scrollTo(0, 1);
  } else {
    document.body.style.setProperty("--is-mobile", "0")
    document.body.style.setProperty("--scr-width", "100vw")
    document.body.style.setProperty("--scr-height", "100vh")
    document.body.style.setProperty("zoom", "1.0")
    document.body.style.removeProperty("display")
  }

  // print("css: ", document.body.style)
}
mobileCheck()
window.addEventListener("DOMContentLoaded", e => {
  mobileCheck()
})
window.addEventListener("resize", e => {
  mobileCheck()
})

app.mount('#app')