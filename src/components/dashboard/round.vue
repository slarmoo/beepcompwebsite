<script setup lang="ts">
import { computed, inject, nextTick, onMounted, reactive, ref, Ref, toRaw, triggerRef, useTemplateRef, watch } from 'vue';
import { currentDashMode, currentDashRound, DASH_MODES, DiscordLoggedIn, GeneralEvents, lastRequestedRound, loginWithDiscord, openDialog, pauseBGM, resumeBGM, switchToVoting, Toast } from '../../modules/persists';
import { LastState, loadingThings, refreshState } from '../../modules/init';
import { API } from '../../modules/api';
import { Round, SimpleModifier, SimpleUser, Submission, User } from '@beepcomp/core';
import moment from "moment"
import { clear_timeout, clear_timeout_channel, timeout } from '../../modules/time_based';

import { Form } from '@primevue/forms';
import { yupResolver } from '@primevue/forms/resolvers/yup';
// import { zodResolver } from '@primevue/forms/resolvers/zod';
// import * as yup from 'yup';
import { Interfacer, SubmissionSchema, SubmissionRequest } from "@beepcomp/core"

import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import AutoComplete from 'primevue/autocomplete';
import Select from 'primevue/select';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import MultiSelect from 'primevue/multiselect';

const hoverSFX: ReturnedValue = (inject("hoverSFX") as ReturnedValue)

function switchTo(mode: string) {
  GeneralEvents.emit("dashboard-music-change", mode)
}

const LOADING_ROUND: Round = {
  prompt: "loading...",
  desc: "loading...",
  id: 0,
  start: 0,
  curr: 0,
  next: 0,
  current_state: 'NONE',
  vote: 0,
  end: 0
}

const currentRoundObj: Ref<Round> = ref(LOADING_ROUND)

const ROUND_STATE_METADATA: {[index: string]: {color: string; button_text: string; time_header: string, click: (e: MouseEvent) => void}} = {
  "NONE": {
    color: "#4c4c4c",
    button_text: "no access",
    time_header: "",
    click: e => {}
  },
  "OPEN": {
    color: "#95FF00",
    button_text: "SUBMIT!",
    time_header: "SUBMISSION DEADLINE",
    click: e => {openSubmissionForm()}
  },
  "VOTE": {
    color: "#FF9752",
    button_text: "VOTE!",
    time_header: "VOTING DEADLINE",
    click: e => {switchToVoting()}
  },
  "DONE": {
    color: "#7744FF",
    button_text: "RESULTS!",
    time_header: "",
    click: e => {currentDashMode.value = DASH_MODES.RESULTS}
  },
  "LOGIN": {
    color: "#5865F2",
    button_text: "LOGIN WITH DISCORD!",
    time_header: "",
    click: async e => {
      await loginWithDiscord()
    }
  },
  // "WRONG_SERVER": {
  //   color: "#e03c28",
  //   button_text: "Join Beepcord to Vote!",
  //   time_header: "",
  //   click: async e => {
  //     // ... open invite link?
  //   }
  // },
  // "CANT_SUBMIT": {
  //   color: "#e03c28",
  //   button_text: "Must be a Participant!",
  //   time_header: "",
  //   click: async e => {
  //     // ... 
  //   }
  // },
}

const durationTillNext = ref(moment.duration(moment(Date.now()).diff(currentRoundObj.value.next)))

async function newRound(skipState = false) {
  if (currentDashRound.value == -1 && LastState.value.currentRound != null) {
    currentDashRound.value = LastState.value.currentRound
  }

  clear_timeout_channel("round_refresh")
  loadingThings.value["newRoundPage"] = true
  await refreshRoundInfo(skipState)
  await nextTick()
  loadingThings.value["newRoundPage"] = false

  switchTo(String(currentDashRound.value))
}

GeneralEvents.on('change-round', (round_num: number) => {
  currentDashRound.value = round_num
  print("NEW ROUND PAGE: ", round_num)
  if (currentDashRound.value == -1 || lastRequestedRound.value != currentDashRound.value) {
    lastRequestedRound.value = currentDashRound.value
    newRound()
  }
})

// var mounted = false
onMounted(async () => {
  print("Mounted!")
  newRound(true)
})

function resolveSimpleUser(id) {
  let user = usernames.value.find(entry => entry.id == id)
  if (user) {
    return {id, username: (user.username ?? user.id)}
  } else {
    return null
  }
}

const alreadySubmitted: Ref<boolean> = ref(false)
const incoming_requests: Ref<any> = ref([])
const usernames: Ref<User[]> = ref([])
const modifiers: Ref<SimpleModifier[]> = ref([])
const filteredModifiers: Ref<SimpleModifier[]> = ref([]);

const modifierSearch = event => {
  if (!event.query.trim().length) {
      filteredModifiers.value = [...modifiers.value];
  } else {
      filteredModifiers.value = modifiers.value.filter((modifier) => {
          return modifier.text.toLowerCase().startsWith(event.query.toLowerCase());
      });
  }
}

const committed = ref(false)

async function refreshRoundInfo(skipState = false) {
  print("Round: ", currentDashRound.value)

  if (!skipState) { await refreshState() }
  if (LastState.value.rounds == undefined) { return }


  // let proms = await Promise.all([
  //   API.GET(`/rounds/${currentDashRound.value}`), // state.rounds: {...Round, submissions: Submission[], modifiers: Modifier[], requests: Requests[]}[]
  //   API.GET(`/submit/${currentDashRound.value}`), // state.rounds.submissions: Submission[]
  //   API.GET("/users"), // state.users: User[]
  //   API.GET("/modifiers"), // state.rounds.modifiers: Modifier[]
  //   API.GET(`/requests/${currentDashRound.value}`), // state.rounds.requests: Request[]
  // ])
  // print(proms)

  let round_idx = Number(currentDashRound.value) - 1
  print("round_idx: ", round_idx)
  let round = LastState.value.rounds[round_idx]
  currentRoundObj.value = round
  durationTillNext.value = moment.duration(moment(Date.now()).diff(currentRoundObj.value.next))

  // print("Round Obj: ", currentRoundObj.value)
  usernames.value = (LastState.value.other_users || [])
  modifiers.value = LastState.value.modifiers.map(entry => ({id: entry.id, text: entry.text}))

  incoming_requests.value = LastState.value.rounds[round_idx].requests.incoming
  print("LastState.value.rounds[round_idx].requests.incoming: ", LastState.value.rounds[round_idx].requests.incoming)

  alreadySubmitted.value = false
  if (LastState.value.rounds[round_idx].submission?.title != null) {
    alreadySubmitted.value = true

    submissionInit.value = BLANK_SUBMISSION_INIT

    let submission: Submission = LastState.value.rounds[round_idx].submission
    print("Submission Obj: ", submission)
    submissionInit.value.title = submission.title
    submissionInit.value.link = submission.link
    submissionInit.value.desc = submission.desc
    // requestType.value = (submission.challenger || submission.authors.length > 1 ? (submission.challenger ? "battle" : "collab") : "")
    // requestValue.value = (requestType.value != "" ? (requestType.value == "battle" ? submission.challenger : submission.authors.find(user => user.id != )))
    
    committed.value = false
    
    if (LastState.value.rounds[round_idx].requests.outgoing != null) {
      submissionInit.value.request_type = LastState.value.rounds[round_idx].requests.outgoing.type
      submissionInit.value.request_receivingId = LastState.value.rounds[round_idx].requests.outgoing.receivingId
    } else {
      let other_author_id = (submission.authors as any[]).find((entry: any) => entry.userId != LastState.value?.user?.id)
      if (submission.challenger) {
        committed.value = true
        submissionInit.value.request_type = "battle"
        requestType.value = "battle"
        submissionInit.value.request_receivingId = submission.challenger
        requestType.value = submission.challenger
      } else if (other_author_id) {
        committed.value = true
        submissionInit.value.request_type = "collab"
        requestType.value = "collab"
        submissionInit.value.request_receivingId = other_author_id.userId
        requestType.value = other_author_id.userId
      }
    }

    // if (submissionInit.value.request_type != null) { submissionInit.value.request_type = "Collab" }
    // if (submissionInit.value.request_receivingId != null) { submissionInit.value.request_receivingId = "planet_bluto_3" }
    // if (collab != "") { collabValue.value = resolveSimpleUser(collab) }
    // else (battle != "") { battleValue.value = resolveSimpleUser(battle) }

    // submissionInit.value.collaborator = (collab.length > 0 ? collabValue.value.username : "")
    // submissionInit.value.challenger = (battle.length > 0 ? battleValue.value.username : "")
    
    modifierValue.value = submission.modifiers.map((thisEntry: any) => modifiers.value.find(entry => entry.id == thisEntry.modifierId))
    submissionInit.value.modifiers = modifierValue.value

  }

  print("submissionInit: ", submissionInit.value)

  timeout(refreshRoundInfo, 60000, "round_refresh")
}

GeneralEvents.on("discord_login", () => {
  refreshRoundInfo()
})

const stateFlags: Ref<Set<string>> = ref(new Set())

const currentState = computed(() => {
  stateFlags.value = new Set()
  
  let state: string = (currentRoundObj?.value?.current_state || "NONE")

  if (!LastState.value.user?.participant) { stateFlags.value.add("NOT_PARTICIPANT") }
  if (!LastState.value.server_valid) { stateFlags.value.add("WRONG_SERVER") }
  let bracket_key: string = `round_${currentRoundObj.value.id}_bracket`

  if ((!DiscordLoggedIn.value) && ["OPEN", "VOTE"].includes(state)) {
    state = "LOGIN"
  } else if (state == "OPEN") { // Logged in... but you ain't doin' shit right
    if (!LastState.value.user?.participant) { stateFlags.value.add("HARD_NOT_PARTICIPANT"); stateFlags.value.add("CANT_SUBMIT") }
    if (currentRoundObj.value.id >= 5 && (LastState.value.user ? LastState.value.user[bracket_key] == 0 : false)) { stateFlags.value.add("ELIMINATED"); stateFlags.value.add("CANT_SUBMIT") }
  } else if (state == "VOTE") {
    if (!LastState.value.server_valid) { stateFlags.value.add("HARD_WRONG_SERVER"); stateFlags.value.add("CANT_SUBMIT") }
  }

  // state = "WRONG_SERVER"
  // state = "CANT_SUBMIT"
  print(stateFlags)

  return state
})

const FLAG_DESCRIPTIONS = {
  "HARD_NOT_PARTICIPANT": "You are not a participant, so you can not submit beeps to this tournament",
  "ELIMINATED": "You were eliminated and can no longer submit beeps! You can still vote however and your votes still count as a participant vote!",
  "WRONG_SERVER": "During voting, you must be in the correct servers to vote on submissions",
}

// watch(currentDashRound, () => {
//   refreshRoundInfo()
// })

const validAlerts = computed(() => {
  return (Object.keys(FLAG_DESCRIPTIONS).filter(key => stateFlags.value.has(key)).map(key => FLAG_DESCRIPTIONS[key]))
})

const editions = ref([ // << API Content
  "https://ultraabox.github.io/"
])

//// SUBMISSIONS
import { useConfirm } from "primevue/useconfirm";
import { isAssertEntry } from 'typescript';
import { ReturnedValue, useSound } from '@vueuse/sound';

const confirm = useConfirm();


const submitConfirm = (value: SubmissionRequest) => {
    confirm.require({
        message: 'Are you sure you want to submit?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Submit'
        },
        accept: async () => {
          closeSubmissionForm()
          loadingThings.value["submittingBeep"] = true
          let res: any = await API.POST(`/rounds/${currentDashRound.value}/submit`, value)
          loadingThings.value["submittingBeep"] = false

          print("SubmissionRequest Result: ", res)

          if (res.error) {
            Toast(`Error: ${res.error}`, "#e03c28")
          } else {
            refreshRoundInfo()
            Toast(alreadySubmitted.value ? "Beep Successfully Updated!" : "Beep Successfully Submitted!")
          }
        },
        reject: () => {
            // ... idk
        }
    });
};

const submissionVisible = ref(false)
const onSubmissionSubmit = ({valid, values}) => {
  print("pre: ", values)
  values["modifiers"] = toRaw(values["modifiers"]).map(entry => entry.id)

  if (values["artwork"] && values["artwork"] == "") { values["artwork"] = null }
  if (values["audio"] && values["audio"] == "") { values["audio"] = null }

  // Imgur to Direct URL
  if (values["artwork"] && values["artwork"].startsWith("https://imgur.com")) {
    values["artwork"] = `https://i.imgur.com/${values["artwork"].split("/")[3]}.png`
  }

  requestType.value = submissionInit.value.request_type
  requestValue.value = submissionInit.value.request_receivingId

  // if (requestType.value) {
  //   values[requestType.value] = requestType.value
  // }
  // values["modifiers"] = values["modifiers"].map(modifier => {
  //   return modifiers.value.find((entry: any) => entry.text == modifier)?.id
  // })

  print(valid)
  if (valid) {
    print("post: ", values)
    submitConfirm(values)
  }
}

Interfacer["resolveUsers"] = () => usernames.value
Interfacer["resolveModifiers"] = () => modifiers.value
Interfacer["resolveEditions"] = () => editions.value
const submissionResolver = ref(yupResolver(SubmissionSchema))
const BLANK_SUBMISSION_INIT = {
  title: "",
  request_type: "",
  request_receivingId: "",
  link: "",
  desc: "",
  modifiers: [],
  artwork: "",
  audio: ""
}
const submissionInit: Ref<any> = ref(BLANK_SUBMISSION_INIT)

const modifierValue: Ref<any[]> = ref([])
const requestType = ref("")
const requestValue = ref("")

function openSubmissionForm() {
  // modifierValue.value = []
  // collabValue.value = {id: "", username: ""}
  // battleValue.value = {id: "", username: ""}
  
  submissionVisible.value = true
}

function closeSubmissionForm() {
  submissionVisible.value = false
}

const requestTypeOptions = [
  {name: "Collab", value: "collab"},
  {name: "Battle", value: "battle"},
]

function generateHTML(request) {
  let html = `<span style="color: ${request.type == "collab" ? "#25F3FF" : "#E03C28"}">${request.type == "collab" ? "Collab" : "Battle"} Request!</span> from ${resolveSimpleUser(request.sendingId)?.username}`
  return html
}

const collabOverwriteConfirm = (reso: (boolean) => any) => {
    confirm.require({
        message: 'If you accept this collab, it will DELETE your current submission! Would you still like to continue?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Accept & Delete Submission'
        },
        accept: async () => {
          reso(true)
        },
        reject: () => {
          reso(false)
        }
    });
};

const collabCleanUpConfirm = (reso: (boolean) => any) => {
    confirm.require({
        message: 'If you accept this collab, it will remove your outgoing requests',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Accept & Delete Submission'
        },
        accept: async () => {
          reso(true)
        },
        reject: () => {
          reso(false)
        }
    });
};

async function acceptRequest(request) {
  loadingThings.value["processingRequest"] = true
  print("request: ", request)
  if (alreadySubmitted.value && request.type == "collab") {
    // ... Confirm prompt
    let confirmed: boolean = await new Promise<boolean>((reso, rej) => {
      collabOverwriteConfirm(reso)
    })

    print("bro. ", confirmed)

    if (!confirmed) { loadingThings.value["processingRequest"] = false; return }
  }

  let round_idx = Number(currentDashRound.value) - 1
  if ((LastState.value.rounds || [])[round_idx]?.requests?.outgoing != null) {
    // ... Confirm prompt
    let confirmed: boolean = await new Promise<boolean>((reso, rej) => {
      collabOverwriteConfirm(reso)
    })

    if (!confirmed) { loadingThings.value["processingRequest"] = false; return }
  }

  let res = await API.POST(`/requests/accept/${request.id}`)

  await refreshRoundInfo()

  loadingThings.value["processingRequest"] = false

  if (res && !res.error) {
    Toast(`Successfully accepted ${request.type == "collab" ? "Collab" : "Battle"} Request!`)
  } else {
    Toast(`Error: ${res.error}`, "#e03c28")
  }

  return res
}
async function declineRequest(request) {
  loadingThings.value["processingRequest"] = true
  let res = await API.POST(`/requests/decline/${request.id}`)

  await refreshRoundInfo()

  loadingThings.value["processingRequest"] = false

  if (res) {
    Toast(`Successfully declined ${request.type == "collab" ? "Collab" : "Battle"} Request!`)
  } else {
    Toast(`Error Processing Request... Try again`)
  }

  return res
}

const rendered_requests = computed(() => {
  return incoming_requests.value.filter(request => {
    if (!alreadySubmitted.value) {
      return request.type == "collab"
    } else {
      return true
    }
  })
})

const artworkValue = ref("")
const audioValue = ref("")

const viewAllBrackets = ref(false)
const BRACKETS = computed(() => {
  let to_return = {};
  (LastState.value.other_users || []).concat(LastState.value.user ? [LastState.value.user] : []).forEach(user => {
    if (user[`round_${currentDashRound.value}_bracket`] == 0) { return }
    if (to_return[`bracket_${user[`round_${currentDashRound.value}_bracket`]}`] == null) { to_return[`bracket_${user[`round_${currentDashRound.value}_bracket`]}`] = [] }
    to_return[`bracket_${user[`round_${currentDashRound.value}_bracket`]}`].push(user)
  })

  return to_return
})
</script>

<template>
<div id="whole">
  <Dialog v-model:visible="submissionVisible" modal :header="`ROUND ${currentDashRound} SUBMISSION`">
    <Form v-slot="$form" :initialValues="submissionInit" :resolver="submissionResolver" @submit="onSubmissionSubmit" class="form">
      <p>TITLE:</p>
      <InputText name="title" type="text" />

      <p>LINK: <span style="opacity: 0.5;">(Unshortened URL)</span></p>
      <InputText name="link" type="text" />

      <p><span style="color: #25F3FF">COLLAB</span> or <span style="color: #E03C28">BATTLE</span>:  </p>
      <div class="collab-battle-cont">
        <SelectButton name="request_type" :options="requestTypeOptions" option-label="name" option-value="value" v-model="requestType" :disabled="committed"/>
        <Select name="request_receivingId" option-label="username" option-value="id" :options="usernames.map(entry => resolveSimpleUser(entry.id))" :editable="true" @change="e => requestValue = e.value" :disabled="requestType == null || committed" />
      </div>
      
      <p>CHOOSE MODIFIERS:</p>
      <!-- <MultiSelect name="modifiers" optionLabel="text" :suggestions="filteredModifiers" @complete="modifierSearch" :multiple="true" @input="e => modifierValue = e.target.value" /> -->
      <MultiSelect name="modifiers" :options="modifiers" optionLabel="text" :show-clear="true" :selectionLimit="3" @input="e => modifierValue = e.target.value" />

      <p>DESC / CONTEXT:</p>
      <Textarea name="desc" rows="5" cols="30" />

      <div style="height: 32px;"></div>
      
      <div style="display: flex; gap: 15px;">
        <img style="width: 150px; height: 150px; object-fit: contain; border-radius: 8px; background-color: #08080b;" title="Artwork Preview" :src="artworkValue" />
        <div>
          <p>ARTWORK LINK: <span style="opacity: 0.5;">(Direct <a target="_blank" href="https://imgur.com/upload?beta">Imgur</a> or <a target="_blank" href="https://filegarden.com/">File Garden</a> URL)</span> <span @click="openDialog('Artwork Link Help', 'You can upload your artworks to Imgur or File Garden and provide the URL from those services here to submit your artwork!\n\nFor Imgur, you can either use the link that\'s given when pressing the \'Copy Link\' button on the website- or the direct \'i.imgur.com\' url\n\nFor File Garden, simply upload the image to File Garden and put the direct link here\n\nSupported Types: png, jpeg, gif, webp')" style="color: #7744ff; cursor: pointer;">[Help]</span></p>
          <InputText style="width: 100%" name="artwork" type="text" @input="e => {if (e.target) {artworkValue = (e.target as HTMLInputElement).value}}" />
        </div>
      </div>

      <p>AUDIO EXPORT LINK: <span style="opacity: 0.5;">(Direct <a target="_blank" href="https://filegarden.com/">File Garden</a> URL)</span> <span @click="openDialog('Audio Export Link Help', 'You can upload a direct audio url (from file garden) of your Beep to embed for people voting or future playback to ensure that it sounds how it sounds for you or if your song is very intensive for some computers, this option would be immensily useful.\nIt\'s preferred that you don\'t do any changes after exporting the audio directly from beepbox for the sake of competitiveness.\n\nOn File Garden, simply upload the exported audio from beepbox to File Garden and put the direct link here\n\nSupported Types: wav, mp3, flac, ogg')" style="color: #7744ff; cursor: pointer;">[Help]</span></p>
      <InputText name="audio" type="text" @input="e => {if (e.target) {audioValue = (e.target as HTMLInputElement).value}}" />
      <audio :src="audioValue" controls @play="pauseBGM()" @pause="resumeBGM()" style="width: 100%" title="Audio Export Preview"></audio>

      <div style="height: 32px;"></div>

      <button type="submit" style="font-size: 32px">{{(alreadySubmitted ? 'Update!' : 'Submit!')}}</button>
    </Form>
  </Dialog>

  <div id="incoming-requests">
    <div v-for="request in rendered_requests" class="incoming-request-cont">
      <img class="incoming-request-pfp" :src="`https://cdn.discordapp.com/avatars/${request.sendingId}/${usernames.find(entry => entry.id == request.sendingId)?.avatar}.png?size=64`" />
      <div>
        <p v-html="generateHTML(request)"></p>
        <!-- <p v-html="`<span style="color: ${request.type == "collab" ? "#25F3FF" : "#E03C28"}">${request.type == "collab" ? "Collab" : "Battle"} Request</span> from ${resolveSimpleUser(request.sendingId)?.username}`"></p> -->
        <div class="request-button-cont">
          <button class="request-button accept" @click="acceptRequest(request)">Accept</button>
          <button class="request-button decline" @click="declineRequest(request)">Decline</button>
        </div>
      </div>
    </div>
  </div>

  <div :style="`--current-color: ${ROUND_STATE_METADATA[currentState].color}; --current-real-color: ${ROUND_STATE_METADATA[currentRoundObj.current_state].color};`" id="inner">
    <button id="main_button" :style="`opacity: ${(currentState == 'OPEN' && alreadySubmitted) ? 0.4 : 0.8};`" @click="ROUND_STATE_METADATA[currentState].click" @mouseenter="(_e: MouseEvent) => { hoverSFX.play() }" v-if="!stateFlags.has('CANT_SUBMIT')">{{ (currentState == "OPEN" && alreadySubmitted ? "EDIT SUBMISSION..." : ROUND_STATE_METADATA[currentState].button_text) }}
      <p id="main_button_label_fill">{{ (currentState == "OPEN" && alreadySubmitted ? "EDIT SUBMISSION..." : ROUND_STATE_METADATA[currentState].button_text) }}</p>
    </button>

    <div id="alert-div">
      <div class="alerts" v-for="desc in validAlerts">
        <img class="alert-icon" src="../../assets/gif/alert.gif"/>
        <p class="alert-text">{{ desc }}</p>
      </div>
    </div>

    <p id="round-header">{{ `ROUND ${currentDashRound}: ` }}<span style="color: #25F3FF">{{ currentRoundObj.prompt || LOADING_ROUND.prompt }}</span></p>
    <div id="time-cont" v-if="currentRoundObj.current_state != 'DONE'">
      <p id="time-header">{{ROUND_STATE_METADATA[currentRoundObj.current_state].time_header}}</p>
      <div id="timestamp">
        <p>{{ `${["days", "hours", "minutes"].filter((unit: any) => Math.abs(durationTillNext.get(unit)) > 0).map((unit: any) => Math.abs(durationTillNext.get(unit)) + " " + unit).join(", ")}` }}</p>
        <p id="timestamp_label_fill" :title="moment(currentRoundObj.next).format('dddd, MMMM Do YYYY, h:mm:ss a')">{{ `${["days", "hours", "minutes"].filter((unit: any) => Math.abs(durationTillNext.get(unit)) > 0).map((unit: any) => Math.abs(durationTillNext.get(unit)) + " " + unit).join(", ")}` }}</p>
      </div>
    </div>
    <p id="desc">{{ currentRoundObj.desc || LOADING_ROUND.desc}}</p>
  </div>

  <div>
    <div style="width: 100%; height: 10px; background-color: #343434; border-radius: 10px; margin-top: 64px; margin-bottom: 64px;"></div>
    <p v-if="currentDashRound >= 5 && LastState.user && typeof(LastState.user[`round_${currentDashRound}_bracket`]) == 'number' && LastState.user[`round_${currentDashRound}_bracket`] != 0" style="color: #ffffff7c; font-size: 64px;">You're In <span style="color: #fff">Bracket #{{ LastState.user[`round_${currentDashRound}_bracket`] }}</span>:</p>
    <div v-if="currentDashRound >= 5 && LastState.user && typeof(LastState.user[`round_${currentDashRound}_bracket`]) == 'number' && LastState.user[`round_${currentDashRound}_bracket`] != 0" style="display: flex; flex-direction: column; gap: 15px;">
      <div v-for="user in (LastState.other_users || [])
        .filter(user => LastState.user && user[`round_${currentDashRound}_bracket`] == LastState.user[`round_${currentDashRound}_bracket`])
        .concat([LastState.user])
        .sort((a, b) => {console.log(a); return ((a.global_name ?? a.username) || '').localeCompare((b.global_name ?? b.username) || '')})"
        style="display: flex; gap: 15px">
        <img :src="`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`" style="border-radius: 50%; width: 64px; height: 64px"></img>
        <p style="font-size: 32px;">{{ user.global_name || '@' + user.username }}</p>
      </div>
      <p style="color: #ffffff3c; font-size: 24px; font-style: italic;">(You must score the highest of this group to move on to the next round!)</p>
    </div>
    <p style="font-size: 32px; color: #7744ff; text-decoration: underline; margin-top: 32px; cursor: pointer;" @click="viewAllBrackets = !viewAllBrackets">{{ !viewAllBrackets ? 'View All Brackets' : 'Hide All Brackets' }}</p>
    <div v-show="viewAllBrackets" style="display: grid; grid-template-columns: 50% 50%;">
      <div v-for="bracket_key in Object.keys(BRACKETS).sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]))">
        <p style="font-size: 32px;">{{ 'Bracket #' + bracket_key.split("_")[1] }}</p>
        <div>
          <div v-for="user in BRACKETS[bracket_key]" style="display: flex; gap: 15px">
            <img :src="`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`" style="border-radius: 50%; width: 32px; height: 32px"></img>
            <p style="font-size: 24px;">{{ user.global_name || '@' + user.username }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style unscoped>
.p-chip { font-family: BakbakOne; }
.p-dialog-title { font-family: BakbakOne }
.p-inputtext { font-family: BakbakOne; }
.p-autocomplete-option { font-family: BakbakOne; }
.p-autocomplete-empty-message { font-family: BakbakOne; color: #e03c287c }
</style>

<style scoped>
#whole {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-family: BakbakOne;
}

#incoming-requests {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.incoming-request-cont {
  display: flex;
  /* flex-direction: column; */
  gap: 15px;
  background: #202020;
  padding: 15px;
  width: 100%;
  border-radius: 15px;
  font-size: 24px;
}

.incoming-request-pfp {
  border-radius: 15px;
}

.request-button-cont {
  display: flex;
  gap: 15px;
}

.request-button {
  border: none;
  border-radius: 15px;
  padding: 5px;
  padding-left: 15px;
  padding-right: 15px;
  font-size: 15px;
}

.accept { border: 5px solid #95ff00; }
.decline { border: 5px solid #e03c28; }

#inner {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

#main_button {
  font-family: BakbakOne;
  font-size: 40px;
  color: white;
  -webkit-text-fill-color: white;
  -webkit-text-stroke-color: #0D0D0D;
  -webkit-text-stroke-width: 15px;
  border: var(--current-color) solid 10px;
  border-radius: 30px;
  background: linear-gradient(to bottom, #0D0D0D 0%, #0D0D0D 50%, color-mix(in srgb, var(--current-color), transparent 50%) 100% );
  width: 100%;
  height: 86px;
  padding: 0px;
  padding-top: 5px;
  padding-bottom: 5px;
  margin-bottom: 35px;
  filter: brightness(1.0);
  opacity: 0.8;
  transition: opacity 350ms linear, filter 350ms linear, scale 350ms ease;
}
#main_button:hover {
  /* filter: brightness(1.2); */
  opacity: 1.0 !important;
  scale: 1.05;
  transition: opacity 50ms linear, filter 50ms linear, scale 100ms linear;
}
#main_button_label_fill {
  -webkit-text-fill-color: white;
  -webkit-text-stroke-width: 0px;
  position: relative;
  top: -56px;
  margin-top: 0px;
}

#alert-div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.alerts {
  display: flex;
  gap: 8px;
  justify-items: center;
  font-size: 24px;
  opacity: 0.6;
  transition: opacity 100ms;
}

.alerts:hover {
  opacity: 1.0;
}

.alert-icon {
  width: 30px;
  height: 30px;
}

.alert-text {
  color: #fff;
}

#round-header {
  font-size: 64px;
}

#time-cont {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

#time-header {
  font-size: 48px;
}

#timestamp {
  border: var(--current-real-color) 5px solid;
  background: linear-gradient(to bottom, #0D0D0D 0%, #0D0D0D 50%, color-mix(in srgb, var(--current-real-color), transparent 50%) 100% );
  width: 350px;
  text-align: center;
  border-radius: 8px;
  color: white;
  -webkit-text-fill-color: white;
  -webkit-text-stroke-color: #0D0D0D;
  -webkit-text-stroke-width: 8px;
  font-size: 20px;
  height: 38px;
}

#timestamp_label_fill {
  -webkit-text-fill-color: white;
  -webkit-text-stroke-width: 0px;
  position: relative;
  top: -30px;
  margin-top: 0px;
}

#desc {
  font-size: 32px;
  opacity: 0.6;
}

p {
  font-family: BakbakOne;
  color: white;
  margin: 0px;
}
</style>
