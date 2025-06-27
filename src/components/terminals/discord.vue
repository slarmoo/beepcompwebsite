<script setup lang="ts">
import { computed, ComputedRef, inject, onMounted, ref, Ref, triggerRef } from 'vue'
import { API } from '../../modules/api'
import { DiscordAccess, DiscordAuth, loginWithDiscord, TerminalEvents, Toast } from '../../modules/persists'
import { LastState, loadingThings, refreshState } from '../../modules/init'

const CanContinue = (inject("CanContinue") as Ref<boolean>)

const _DiscordJustLoggedIn = (inject("_DiscordJustLoggedIn") as Ref<boolean>)
const DiscordLoggedIn = (inject("DiscordLoggedIn") as ComputedRef<boolean>)

const mountedOnce = ref(false)
TerminalEvents.on("terminal_opened_discord", () => {
  if (!mountedOnce.value) {
    CanContinue.value = DiscordLoggedIn.value
    mountedOnce.value = true
  }
})

async function pressButton() {
  let {server_valid, logged_in} = await loginWithDiscord()

  CanContinue.value = logged_in
  
  if (!server_valid) {
    TerminalEvents.emit("missing_server")
  }
}
</script>

<template>
<button class="signup-button" :style="`--color: ${DiscordLoggedIn ? '#8cd612' : '#5865F2'}`" :logged-in="DiscordLoggedIn" @click="e => { if (!DiscordLoggedIn) {pressButton()} }">
  {{ DiscordLoggedIn ? "Already Logged In!" : "Log-In With Discord" }}
</button>
<p class="terminal-subtext">You must log-in with Discord to verify your identity. In addition, you must also be a member in the <span class="terminal-subtext-bold">BeepBox Discord</span> server (or partnering servers) in order to be a participant!</p>
</template>

<style scoped>
.signup-button {
  width: 450px;
  height: 64px;
  opacity: 1.0;
}
.signup-button[logged-in=true] {
  opacity: 0.5;
}
</style>
