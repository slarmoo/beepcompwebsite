import { SignupDialogue } from "@beepcomp/core";
import EventEmitter from "eventemitter3";
import { computed, inject, provide, Ref, ref } from "vue";
import { RemovableRef, useStorage } from '@vueuse/core'
import { timeout } from "./time_based";
import { isParticipant, LastState, loadingThings, refreshState } from "./init";
import { API } from "./api";
export const DiscordAuth: RemovableRef<any> = useStorage("discord_token", {})
export const ParticipationCache: RemovableRef<any> = useStorage("already_participating", false)

export const isMobile = ref(false)

export enum SITE_MODES {
  NONE = -1,
  SIGN_UP,
  MAIN
}
export const currentMode: Ref<SITE_MODES> = ref(SITE_MODES.NONE)

export const SignUpMetadata: Ref<SignupDialogue[]> = ref([])
export const StartedUp: Ref<Boolean> = ref(false) // Not to be confused with the tournament starting

export enum DASH_MODES {
  ROUND,
  PARTICIPANTS,
  PICKS,
  MODIFIERS,
  ADMIN
}
export const currentDashMode: Ref<DASH_MODES> = ref(DASH_MODES.ROUND)
export const currentDashRound: Ref<Number> = ref(-1)
export const lastRequestedRound: Ref<Number> = ref(-1)

export const GeneralEvents = new EventEmitter()
export const TerminalEvents = new EventEmitter()

GeneralEvents.on("startup", () => {
  StartedUp.value = true
})

export const active_toasts: Ref<{id: number, text: string, color: string}[]> = ref([])
var toast_id = 0
export function Toast(text: string, color: string = "#7744ff") {
  let this_id = toast_id
  toast_id += 1

  active_toasts.value.push({id: this_id, text, color})

  timeout(() => {
    killToast(this_id)
  }, 5000)
}
export function killToast(id: number) {
  let remove_idx = active_toasts.value.findIndex(entry => entry.id == id)
  if (remove_idx != -1) {
    active_toasts.value.splice(remove_idx, 1) // bye bye 
  }
}

export const DiscordAccess = computed(() => {
  return DiscordAuth.value?.access_token
})

export const _DiscordJustLoggedIn = ref(false)
export const DiscordLoggedIn = computed(() => {
  return (_DiscordJustLoggedIn.value || DiscordAccess.value != null)
})

export function loginWithDiscord() {
  let popup = window.open(import.meta.env.VITE_DISCORD_AUTH, "_blank", "popup=true")

  return new Promise<{server_valid: boolean; logged_in: boolean}>((reso, rej) => {
    window.addEventListener("message", async e => {
      let { code } = JSON.parse(e.data)
      loadingThings.value["verifyingDiscord"] = true

      let res = await API.POST("/discord/identify", {code})
      print(res)

      loadingThings.value["verifyingDiscord"] = false

      if (res.access_token != null) {
        DiscordAuth.value = res
        // await (new Promise<void>((res, rej) => {setTimeout(() => res(), 10)}))

        let this_res = await API.GET("/discord_only_endpoint")
        await refreshState()

        if (DiscordLoggedIn.value) {
          Toast("Logged in with Discord!")
          _DiscordJustLoggedIn.value = true
          reso({server_valid: LastState.value.server_valid, logged_in: true})
          // if (!LastState.value.server_valid) {
          //   TerminalEvents.emit("missing_server")
          // }
        } else {
          Toast("Error Logging in with Discord...")
          reso({server_valid: LastState.value.server_valid, logged_in: false})
        }
      } else {
        Toast("Error Logging in with Discord...")
        reso({server_valid: LastState.value.server_valid, logged_in: false})
      }
    })
  })
}

export function logoutDiscord() {
  DiscordAuth.value = null
  _DiscordJustLoggedIn.value = false
  isParticipant.value = false
  ParticipationCache.value = false
}