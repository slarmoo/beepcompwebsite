import EventEmitter from "eventemitter3";
import { API } from "./api";
import { DiscordAuth, GeneralEvents, ParticipationCache, SITE_MODES, SignUpMetadata, currentMode } from "./persists";
import { State } from "@beepcomp/core";
import { Ref, ref } from "vue";

export const InitEvents = new EventEmitter()
export const isParticipant = ref(false)
export const loadingThings: Ref<{[index: string]: boolean}> = ref({})

export const LastState: Ref<State> = ref({
  serverTime: 0,
  started: false,
  server_valid: false,
  modifiers: [],
  admin: false
})

var initialState = true
export async function refreshState() {
  loadingThings.value["fetchingState"] = true
  let state: State = await API.GET("/state")

  print("state: ", state)

  LastState.value = state
  
  isParticipant.value = (state.user?.participant || false)

  if (state.user == null) {
    DiscordAuth.value = {}
  }

  if (initialState && !state.started && ParticipationCache.value == false) {
    DiscordAuth.value = {}
  }

  if (state.started != true && state.signupMeta != null) {
    currentMode.value = SITE_MODES.SIGN_UP
    SignUpMetadata.value = state.signupMeta
    InitEvents.emit("signup_init", state.signupMeta)
  } else {
    currentMode.value = SITE_MODES.MAIN
  }

  initialState = false
  loadingThings.value["fetchingState"] = false
}

GeneralEvents.on("startup", () => {
  refreshState()
})
