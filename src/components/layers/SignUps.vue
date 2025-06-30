<script setup lang="ts">
import { computed, ComputedRef, DefineComponent, inject, onMounted, provide, ref, render, triggerRef, unref, useTemplateRef, type Ref } from 'vue';
import { API } from '../../modules/api';
import { InitEvents, isParticipant, LastState, loadingThings } from '../../modules/init';
import { _DiscordJustLoggedIn, DiscordAccess, DiscordAuth, DiscordLoggedIn, isMobile, logoutDiscord, ParticipationCache, SignUpMetadata, TerminalEvents, Toast } from '../../modules/persists';
import { CharObj, getLineChars, SignupButton, SignupDialogue, State } from '@beepcomp/core';

import { ReturnedValue, useSound } from '@vueuse/sound'

const VOL = 0.5

import brainscan_preAudio from "../../assets/sfx/BRAINSCAN_pre.flac"
const brainscan_preSFX = useSound(brainscan_preAudio, {onload: () => {
    (brainscan_preSFX.sound.value as any).loop(true)
    brainscan_preSFX.play()
  },
  volume: VOL
})
import brainscan_mainAudio from "../../assets/sfx/brainscan_main.flac"
const brainscan_mainSFX = useSound(brainscan_mainAudio, {onload: () => {
    (brainscan_mainSFX.sound.value as any).loop(true) 
    brainscan_mainSFX.play()
  },
  volume: 0
})
import brainscan_postAudio from "../../assets/sfx/brainscan_post.flac"
const brainscan_postSFX = useSound(brainscan_postAudio, {onload: () => {
    (brainscan_postSFX.sound.value as any).loop(true) 
    brainscan_postSFX.play()
  },
  volume: 0
})

function switchTo(mode: string) {
  const map: {[index: string]: ReturnedValue} = {
    "pre": brainscan_preSFX,
    "main": brainscan_mainSFX,
    "post": brainscan_postSFX
  }
  
  Object.keys(map).forEach(this_mode => {
    print(this_mode, map[this_mode].sound.value)
    if (map[mode].sound.value == null) { return }
    print(this_mode, map[this_mode].sound.value.volume())
    if (this_mode == mode) {
      if (map[this_mode].sound.value.volume() != VOL) {
        map[this_mode].sound.value.fade(0, VOL, 1000)
      }
    } else {
      if (map[this_mode].sound.value.volume() > 0) {
        map[this_mode].sound.value.fade(map[this_mode].sound.value.volume(), 0, 1000)
      }
    }
  })
}

// import printingAudio from "../../assets/sfx/printing.flac"
const printingSFX: ReturnedValue = (inject("printingSFX") as ReturnedValue)

// import hoverAudio from "../../assets/sfx/hover.flac"
// const hoverSFX = useSound(hoverAudio, {
//   interrupt: false
// })
const hoverSFX: ReturnedValue = (inject("hoverSFX") as ReturnedValue)

const SignUpPayload = ref({
  noun: "",
  verb: "",
  adjective: "",
})
provide("SignUpPayload", SignUpPayload)


provide("_DiscordJustLoggedIn", _DiscordJustLoggedIn)
provide("DiscordLoggedIn", DiscordLoggedIn)

const CurrentDialogue: Ref<SignupDialogue | null> = ref(null)

const terminalVisible = ref(false)
const linesVisible = ref(true)
const buttonsVisible = ref(false)
const navVisible = ref(false)

onMounted(() => {
  if (SignUpMetadata.value.length == 0) {
    InitEvents.on("signup_init", (metadata: SignupDialogue[]) => {
      processMetadata()
    })
  } else {
    processMetadata()
  }
})

function processMetadata() {
  gotoDialogue("home")
}

const toggle = ref(0)

// document.addEventListener("mousedown", e => { toggle.value += 1; if (toggle.value == 4) { toggle.value = 0 } })

const linesContRef = useTemplateRef("signups-lines-cont")

const ButtonFilter: Ref<(button: SignupButton, index?: number) => boolean> = ref(() => true )
const ButtonIntercepts: Ref<{[index: string]: () => void}> = ref({
  signup_confirm_yes: async () => {
    print("I'm boss.", SignUpPayload.value)

    loadingThings.value["signingUp"] = true
    await API.POST("/signup", SignUpPayload.value)
    loadingThings.value["signingUp"] = false

    isParticipant.value = true
    ParticipationCache.value = true
    Toast("Successfully signed up to tournament!")
    gotoDialogue("signup_complete")
  },
  withdraw_yes: async () => {
    print("I'm boss.")
    // Loading Wheel?...
    logoutDiscord()

    loadingThings.value["deletingUser"] = true
    let res = await API.DELETE("/users/@me")
    loadingThings.value["deletingUser"] = false

    print("DELETE res: ", res)
    Toast("Withdrawed from Tournament!")
    gotoDialogue("home")
  },
  missing_server_join_manual: async () => {
    print("I'm boss.")
    // Loading Wheel?...

    // Logging Out To Reset Identity Verify
    DiscordAuth.value = {}
    _DiscordJustLoggedIn.value = false
    isParticipant.value = false
    ParticipationCache.value = false

    window.open("https://discord.gg/beepbox")
    gotoDialogue("waiting_to_join_server")
  },
  missing_server_cancel: async () => {
    // Toasts here announcing that you cancelled the signup process

    // Logging Out Just To Be Safe
    DiscordAuth.value = {}
    _DiscordJustLoggedIn.value = false
    isParticipant.value = false
    ParticipationCache.value = false

    gotoDialogue("home")
  },
})
const ContinueIntercepts: Ref<{[index: string]: () => void}> = ref({
})

const lastLine = ref(false)
async function gotoDialogue(id: string) {
  let thisDialogue: SignupDialogue = JSON.parse(JSON.stringify(SignUpMetadata.value.find(entry => entry.id == id)))

  ButtonFilter.value = () => true
  // Intercepts for various things
  switch (thisDialogue?.id) {
    case "home":
      setTitle("WELCOME TO MINDCORP")
      if (isParticipant.value) {
        switchTo("post")
      } else {
        switchTo("pre")
      }
      ButtonFilter.value = (button) => {
        let res = true
        if (!isParticipant.value && button.id == "home_withdraw") { res = false }
        if (isParticipant.value && button.id == "home_signup") { res = false }
        return res
      }

      if (isParticipant.value) {
        thisDialogue.lines = ["[wavy]Welcome back, ${DISCORD_USER}![/wavy] What are you looking to do?..."]
      }
    break;
    case "modifier_introduction":
      if (isParticipant.value) {
        gotoDialogue("already_verified")
        return
      }
    break;
    case "verify_identity":
      setTitle("Picking your brain...")
      switchTo("main")
      if (isParticipant.value) {
        gotoDialogue("already_verified")
        return
      }
    break;
    case "input_noun":
      switchTo("post")
    break;
  }


  if (thisDialogue) {
    CurrentDialogue.value = thisDialogue

    renderedLines.value = []
    visibleLines.value = []
    renderedButtons.value = []
    // print("RESET HERE!!")

    terminalVisible.value = false
    navVisible.value = false

    lastLine.value = false

    // Lines
    if (thisDialogue.lines.length > 0) {
      await sayLine(thisDialogue.lines[0])
    }

    lastLine.value = true

    // print("done printing lines??...")

    renderedButtons.value = thisDialogue.buttons

    let continue_action = thisDialogue.continue_action
    if (typeof continue_action == "string") {
      ContinueAction.value = () => interpretButtonAction(continue_action)
    }

    let continue_label = thisDialogue.continue_override
    if (typeof continue_label == "string") {
      ContinueLabel.value = continue_label
    }

    if (thisDialogue.terminal_id != null) {
      TerminalEvents.emit("terminal_opened_" + thisDialogue.terminal_id)
      terminalVisible.value = true
      navVisible.value = true

    } else if (thisDialogue.buttons.length > 0) {
      navVisible.value = false
    } else {
      navVisible.value = true
    }
  }
}

TerminalEvents.on("missing_server", () => {
  gotoDialogue("missing_server")
})

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function injectVars(line: string) {
  let currentLine = line

  let MAP: {[index: string]: string} = {
    "DISCORD_USER": (LastState.value.user?.username || "oops..."),
    "DISCORD_DISPLAY_NAME": ((LastState.value.user?.global || LastState.value.user?.username) || "oops..."),
    "NOUN_STRING": SignUpPayload.value.noun,
    "VERB_STRING": SignUpPayload.value.verb,
    "ADJECTIVE_STRING": SignUpPayload.value.adjective,
  }

  Object.keys(MAP).forEach((key: string) => {
    currentLine = replaceAll(currentLine, `\$\{${key}\}`, MAP[key])
  })

  return currentLine
}

const renderedLines: Ref<CharObj[][][]> = ref([]) // lines => words => chars
const visibleLines: Ref<string[]> = ref([]) // lines => words => chars

const renderingLineIdx = ref(-1)
const lineID: Ref<number> = ref(0)
const lineSkipped = ref(false)
const currentlyRendering = ref(false)
// const currentLine = ref(0)
async function sayLine(line: string) {
  lineID.value = Date.now()
  let thisID = Date.now()
  // print("INTERVAL DIES HERE!!")
  clear_timeout_channel("rendering_chars")

  return new Promise<void>(async (res, rej) => {
    lineSkipped.value = false
    currentlyRendering.value = true

    let lineIdx = renderedLines.value.length
    renderingLineIdx.value = lineIdx
    let lastLine = ((renderedLines.value.length + 1) == CurrentDialogue.value?.lines.length)
    // visibleLines.value.push([[]]) // line with an empty word

    let injectedLine = injectVars(line)
    let words = getLineChars(injectedLine)
    // print(words)
    renderedLines.value.push(words)
    let wordIdx = 0
    let charIdx = 0
    if (lastLine) { finished() }

    const DELAYS: {[index: string]: number} = {
      ",": 60,
      ".?!": 180,
    }

    // const 

    function getDelay(this_char: string) {
      let delay = 20
      Object.keys(DELAYS).forEach(key => {
        if (key.includes(this_char)) {
          delay = DELAYS[key]
        }
      })

      return delay
    }

    const loop = () => {
      if (lineID.value != thisID) { return }

      let adding_word = false
      // print(words[wordIdx].length, charIdx)
      if (charIdx == words[wordIdx].length) {
        adding_word = true
        wordIdx += 1
        charIdx = 0
      }
      
      if (wordIdx == words.length || lineSkipped.value) {
        // clear_interval(lineInt)
        if (!lastLine) { finished() }
        currentlyRendering.value = false
      } else {
        // print(wordIdx, charIdx, words)
        let this_delay = getDelay(words[wordIdx][charIdx].char)
        timeout(loop, this_delay, "rendering_chars")
      }
      // if (adding_word) { visibleLines.value[lineIdx].push([]) }

      printingSFX.play()
      visibleLines.value.push(`${lineIdx}-${wordIdx}-${charIdx}`)

      // let charElem = document.createElement("span")

      // charElem.className = "signup-lines-char-enter-active"
      // elem.appendChild(charElem)
      // charElem.outerHTML = lineCharHTML[charIdx].html

      charIdx += 1
    }
    loop()
    if (isMobile.value) { skipLines() }

    async function finished() {
      if (!lastLine) {
        navVisible.value = true

        await (new Promise<void>((res, rej) => {
          setContinue(res)
        }))

        if (CurrentDialogue.value != null) {
          await sayLine(CurrentDialogue.value.lines[lineIdx+1])
        } else {
          print('idk man..')
        }
      }

      res()
    }
  })
}

const renderedButtons: Ref<SignupButton[]> = ref([])
function interpretButtonAction(action: string, id?: string) {
  if (CurrentDialogue.value?.terminal_id) { TerminalEvents.emit(`terminal_submitted_${CurrentDialogue.value?.terminal_id}`) }
  if (id != null && Object.keys(ButtonIntercepts.value).includes(id)) {
    ButtonIntercepts.value[id]()
  } else {
    let foundDialogue = SignUpMetadata.value.find(entry => entry.id == action)
    if (foundDialogue != null) {
      gotoDialogue(action)
    } else {
      window.open(action)
    }
  }
}

import discord_terminal from "../terminals/discord.vue"
import noun_terminal from "../terminals/noun.vue"
import verb_terminal from "../terminals/verb.vue"
import adjective_terminal from "../terminals/adjective.vue"
import { clear_interval, clear_interval_channel, clear_timeout_channel, interval, timeout, wait } from '../../modules/time_based';
import { lerp } from '../../modules/maths';
import { KeyEvents } from '../../modules/keys';
import { setTitle } from '../../modules/title';
// import { switchTo } from '../../modules/music';
const Terminals: any = {
  discord: discord_terminal,
  noun: noun_terminal,
  verb: verb_terminal,
  adjective: adjective_terminal,
}
const CurrentTerminal: ComputedRef<DefineComponent | null> = computed(() => {
  if (CurrentDialogue.value?.terminal_id == null ) {
    return null
  } else {
    return Terminals[CurrentDialogue.value?.terminal_id]
  }
})

const ContinueLabel: Ref<string> = ref("CONTINUE")
const ContinueAction: Ref<() => void> = ref(() => null)
const CanContinue: Ref<boolean> = ref(true)
  provide("CanContinue", CanContinue)
function setContinue(func: () => void, label: string = "CONTINUE") {
  print("setting continue...", label, func)
  ContinueAction.value = func
  ContinueLabel.value = label
}

const charsElems = useTemplateRef("char")
const avgHeight = ref(0)
const frame = ref(0)
function advanceFrame() {
  // print(charsElems)
  if (charsElems.value == null) { requestAnimationFrame(advanceFrame); return }
  let chars = (charsElems.value as unknown as HTMLParagraphElement[])

  let sum = 0
  let count = 0
  chars.forEach((char: (HTMLParagraphElement)) => {
    if (char != null) {
      count += 1
      sum += char.getBoundingClientRect().height
    }
  })

  let thisAvgHeight = (sum / count)
  if (thisAvgHeight > 0 && avgHeight.value == 0) {avgHeight.value = thisAvgHeight}
  
  let linesCont = linesContRef.value
  if (linesCont) {
    if (Math.abs(linesCont.scrollTop - Math.abs(linesCont.clientHeight - linesCont.scrollHeight)) > 2.0) {
      print(linesCont.scrollTop, linesCont.clientHeight - linesCont.scrollHeight)
      linesCont.scrollTop = lerp(linesCont.scrollTop, Math.abs(linesCont.clientHeight - linesCont.scrollHeight), 0.1)
    } else {
      linesCont.scrollTop = linesCont.scrollHeight
    }
  }

  frame.value += 1
  requestAnimationFrame(advanceFrame)
}
advanceFrame()

function pressContinue() {
  if (CanContinue.value) {
    if (CurrentDialogue != null && lastLine && Object.keys(ContinueIntercepts).includes(CurrentDialogue.value?.id || "")) { 
      ContinueIntercepts.value[(CurrentDialogue.value?.id || "")]()
    } else {
      ContinueAction.value()
    }
  }
}

function skipLines() {
  // print("HELLOOOOOO????", renderingLineIdx.value, renderedLines.value)
  renderedLines.value[renderingLineIdx.value].forEach((chars, wordIdx) => {
    chars.forEach((char, charIdx) => {
      visibleLines.value.push(`${renderingLineIdx.value}-${wordIdx}-${charIdx}`)
    })
  })

  lineSkipped.value = true // :) you better work or I'm showing up at.... someone's house EVERYONES HOUSE. md.
}

KeyEvents.on("enter", () => {
  print("Bro pressed Enter?....")
  if (currentlyRendering.value) {
    skipLines()
  } else {
    pressContinue()
  }
})

KeyEvents.on("click", () => {
  print("Bro Clicked?....")
  if (currentlyRendering.value) {
    skipLines()
  }
})

</script>

<template>
<div id="signups" class="layer">
  <Transition name="cont">
    <div ref="signups-lines-cont" id="signups-lines-cont" class="signup-cont" v-show="linesVisible"> <!-- Lines Container -->
      <div v-for="(line, lineIdx) in renderedLines" class="rendered-line" :mobile="isMobile" :key="`${CurrentDialogue?.id || '_'}:${lineIdx}`">
        <TransitionGroup name="line">
          <div v-for="(word, wordIdx) in line" class="line-word" :key="`${CurrentDialogue?.id || '_'}:${lineIdx}:${wordIdx}`">
            <div v-for="(charObj, charIdx) in word" class="line-char-cont" :wavy="charObj.tags.map(tag => tag.tag).includes('wavy')" :style="`--height: ${avgHeight}px; --index: ${visibleLines.indexOf(`${lineIdx}-${wordIdx}-${charIdx}`)}`">
              <p ref="char" v-html="charObj.html" class="line-char-ref" :key="`${CurrentDialogue?.id || '_'}:${lineIdx}:${wordIdx}:${charIdx}`"></p>
              <Transition name="char">
                <p v-show="visibleLines.includes(`${lineIdx}-${wordIdx}-${charIdx}`)" class="line-char" v-html="charObj.html" :key="`${CurrentDialogue?.id || '_'}:${lineIdx}:${wordIdx}:${charIdx}`"></p>
              </Transition>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Transition>
  <Transition name="cont">
    <div ref="signups-buttons-cont" id="signups-buttons-cont" class="signup-cont" v-show="renderedButtons.length > 0"> <!-- Button Container -->
      <button v-for="signupButton in renderedButtons.filter(ButtonFilter)" class="signup-button" :style="`--color: ${signupButton.color}`" @mouseenter="(_e: MouseEvent) => { hoverSFX.play() }" @click="interpretButtonAction(signupButton.action, signupButton.id)">{{ signupButton.text }}</button>
    </div>
  </Transition>
  <Transition name="cont">
    <div ref="signups-terminal-cont" id="signups-terminal-cont" class="signup-cont" v-show="terminalVisible"> <!-- Terminal Container -->
      <div class="terminal-like" id="terminal-outer">
      <div class="terminal-like" id="terminal-middle">
        <div class="terminal-like" id="terminal">
          <component v-if="CurrentTerminal != null" :is="CurrentTerminal"></component>
        </div>
      </div>
      </div>
    </div>
  </Transition>
  <Transition name="cont">
    <div ref="signups-nav-cont" id="signups-nav-cont" class="signup-cont" v-show="navVisible"> <!-- Navigation Button Container -->
      <p id="continue-button" @click="e => {pressContinue()}" :can-continue="CanContinue">{{ ContinueLabel }}</p>    </div>
  </Transition>
</div>
</template>

<style scoped>
#signups {
  display: flex;
  flex-direction: column;
  gap: 15px;
  --padding: 30px;
  padding: var(--padding);
  width: calc(var(--scr-width) - (var(--padding) * 2));
  height: calc(var(--scr-height) - (var(--padding) * 2));
  transition: all 100ms cubic-bezier(0.215, 0.610, 0.355, 1);
}

.signup-cont {
  width: 100%;
  height: 100%;
  /* -webkit-backdrop-filter: opacity(1%); */
  /* background: none; */
}

.cont-enter-active {
  transition: height 0.4s cubic-bezier(0.33, 1, 0.68, 1); /* transition the transform/translate down and up- yeah... */
}
.cont-leave-active {
  transition: height 0.4s cubic-bezier(0.33, 1, 0.68, 1);
}

.cont-enter-from,
.cont-leave-to {
  height: 0% !important;
}

#signups-lines-cont {
  /* background: rgb(255 0 0 / 10%);  */
  display: flex;  
  flex-direction: column;
  justify-content: center;
  align-content: center;
  gap: 50px;
  --padding: 60px;
  /* width: calc(100% - (var(--padding) * 2)); */
  width: 100%;
  padding-left: var(--padding);
  padding-right: var(--padding);
  overflow-y: hidden;
  /* scrollbar-width: none; */
}

.rendered-line {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  font-family: BakbakOne;
  color: white;
  font-size: 48px;
  text-align: center;
  margin: 0px;
  opacity: 0.1;
  gap: 15px;
  transition: 0.5s ease;
  transition-property: opacity, transform;
}
.rendered-line[mobile=true] { transition: none; transition-property: none }

.rendered-line:last-child {
  opacity: 1.0;
}

.line-word {
  display: flex;
  /* flex-wrap: wrap;
  justify-content: center; */
  margin: 0px;
  transition: 1.0s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* transition-property: transform; */
}

.word-move,
.word-enter-active,
.word-leave-active {
  transition: 1.0s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-property: transform;
}
.word-enter-from,
.word-leave-to {
  transition: 1.0s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-property: transform;
}
.word-leave-to,
.word-leave-active {
  display: none;
}

.line-char-cont {
  position: relative;
  --height: 0px;
  margin: 0px;
  height: var(--height);
}

.line-char-cont[wavy=true] {
  animation: 1s ease-in-out 0s infinite alternate wavy;
  animation-delay: calc(var(--index) * -300ms);
}

.line-char {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  position: relative;
  /* display: inline-block; */
  white-space: break-spaces;
  margin: 0px;
  /* transform: translateY(0px); */
  top: calc(var(--height) * -1);
  opacity: 1;
  /* top: calc((var(--height) * -1) + var(--top) + var(--float)); */
  transition: 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-property: opacity, top;
}

.line-char-ref {
  /* display: inline-block; */
  white-space: break-spaces;
  margin: 0px;
  /* transform: translateY(0px); */
  opacity: 0.0;
  top: 0px;
}

.char-move,
.char-enter-active,
.char-leave-active {
  position: relative;
  /* animation: none; */
  /* transition: opacity 0.1s cubic-bezier(0.33, 1, 0.68, 1); */
}
.char-enter-from,
.char-leave-to {
  /* transform: translateY(15px); */
  opacity: 0;
  top: calc((var(--height) * -1) + 15px);
}
.char-leave-to,
.char-leave-active {
  display: none;
}

@keyframes wavy {
  from {
    top: 3px;
  }
  to {
    top: -3px;
  }
}

#signups-buttons-cont {
  display: flex;
  flex-direction: column;
  gap: 35px;
  --inverse-mobile: calc(1 - var(--is-mobile));
  --padding: calc(200px - (150px * var(--is-mobile)));
  padding-left: var(--padding);
  padding-right: var(--padding);
  /* width: calc(100% - (var(--padding) * 2)); */
  width: 100%;
}

#signups-terminal-cont {
  /* background: rgb(0 255 0 / 10%); */
}

.terminal-like {
  /* position: absolute; */
  --border-radius: 80px;
}

#terminal-outer {
  z-index: 8;
  --margin: 15px;
  --border-width: 0px;
  margin: var(--margin);
  padding: var(--margin);
  /* width: 100%; */
  width: calc(100% - (var(--margin) * 2));
  /* height: 100%; */
  height: calc(100% - (var(--margin) * 2));
  background: #7744ff;
  border-radius: calc(var(--border-radius) - (var(--margin) * 0));
}

#terminal-middle {
  z-index: 9;
  /* --margin: 20px; */
  /* --border-width: 0px; */
  /* margin: var(--margin); */
  padding: var(--margin);
  /* width: 100%; */
  width: calc(100% - (var(--margin) * 0));
  /* height: 100%; */
  height: calc(100% - (var(--margin) * 0));
  background: #000;
  border-radius: calc(var(--border-radius) - (var(--margin) * 1));
}

#terminal {
  --inner-padding: 25px;
  z-index: 10;
  width: calc(100% - (var(--inner-padding) * 0) );
  /* width: 100%; */
  height: calc(100% - (var(--inner-padding) * 0) );
  /* height: 100%; */
  padding: var(--inner-padding);
  background: #151515;
  border-radius: calc(var(--border-radius) - (var(--margin) * 2));
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

#signups-nav-cont {
  height: 120px;
  /* background: rgb(0 0 255 / 10%); */
  display: flex;
  justify-content: end;
}

#continue-button {
  font-family: BakbakOne;
  font-size: 64px;
  color: white;
  margin: 0px;
  cursor: pointer;
}
#continue-button[can-continue=false] {
  opacity: 0.1;
}
#continue-button[can-continue=true] {
  animation: 0.4s ease-in-out 0s infinite alternate flashing;
  filter: brightness(1.0);
}

@keyframes flashing {
  from {
    filter: brightness(1.0);
  }
  to {
    filter: brightness(0.2);
  }
}
</style>