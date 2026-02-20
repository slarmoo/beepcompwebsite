<script setup lang="ts">
import { inject, ref, Ref, useTemplateRef } from 'vue';
import { TerminalEvents } from '../../modules/persists';
import { useSound } from '@vueuse/sound'
import { timeout } from '../../modules/time_based';

const props = defineProps<{
  type: "noun" | "verb" | "adjective"
}>()

const CanContinue = (inject("CanContinue") as Ref<boolean>)
const SignUpPayload = (inject("SignUpPayload") as Ref<{noun: string; verb: string; adjective: string;}>)

const textContent = defineModel({default: ""})
function check(e: Event) {
  SignUpPayload.value[props.type] = textContent.value
  CanContinue.value = (textContent.value.length > 0)
}

const mountedOnce = ref(false)
const inputElem = useTemplateRef("inputElem")
TerminalEvents.on("terminal_opened_"+props.type, () => {
  if (!mountedOnce.value) {
    CanContinue.value = false
  }
  // print(inputElem.value)
  timeout(() => {inputElem.value!.focus()}, 10)
})
TerminalEvents.on("terminal_submitted_"+props.type, () => {
  motherboardSFX.play()
})

import motherboardAudio from "../../assets/sfx/motherboard.flac"
const motherboardSFX = useSound(motherboardAudio, {
  interrupt: false
})
</script> 

<template>
<input class="terminal-input" @input="check" @change="check" ref="inputElem" v-model="textContent" style="--color: #7744ff" :placeholder="`Input ${props.type.toTitleCase()}...`" />
<p class="terminal-subtext"><slot></slot><span class="terminal-subtext-bold">Offensive and clear joke submissions will not be considered.</span></p>
</template>

<style scoped>

</style>
