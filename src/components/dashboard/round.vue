<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, Ref, toRaw, triggerRef, useTemplateRef, watch } from 'vue';
import { currentDashRound, DiscordLoggedIn, loginWithDiscord, Toast } from '../../modules/persists';
import { LastState, loadingThings } from '../../modules/init';
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

const LOADING_ROUND: Round = {
  prompt: "loading...",
  desc: "loading...",
  start: 0,
  id: 0,
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
    click: e => {}
  },
  "DONE": {
    color: "#7744FF",
    button_text: "RESULTS!",
    time_header: "",
    click: e => {}
  },
  "LOGIN": {
    color: "#5865F2",
    button_text: "LOGIN WITH DISCORD!",
    time_header: "",
    click: async e => {
      await loginWithDiscord()
      refreshRoundInfo()
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

onMounted(async () => {
  if (currentDashRound.value == -1 && LastState.value.currentRound != null) {
    currentDashRound.value = LastState.value.currentRound
  }

  print("Mounted!")
  clear_timeout_channel("round_refresh")
  refreshRoundInfo()
})

function resolveSimpleUser(id) {
  let user = usernames.value.find(entry => entry.id == id)
  if (user) {
    return {id, username: user.username}
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

async function refreshRoundInfo() {
  print("Round: ", currentDashRound.value)

  let proms = await Promise.all([
    API.GET(`/rounds/${currentDashRound.value}`),
    API.GET(`/submit/${currentDashRound.value}`),
    API.GET("/users"),
    API.GET("/modifiers"),
    API.GET(`/requests/${currentDashRound.value}`),
  ])
  print(proms)

  let round = proms[0]
  currentRoundObj.value = round
  durationTillNext.value = moment.duration(moment(Date.now()).diff(currentRoundObj.value.next))

  // print("Round Obj: ", currentRoundObj.value)
  usernames.value = proms[2]
  modifiers.value = proms[3].map(entry => ({id: entry.id, text: entry.text}))

  incoming_requests.value = proms[4].incoming

  alreadySubmitted.value = false
  if (!proms[1].error && proms[1].title) {
    alreadySubmitted.value = true

    submissionInit.value = BLANK_SUBMISSION_INIT

    let submission: Submission = proms[1]
    // print("Submission Obj: ", submission)
    submissionInit.value.title = submission.title
    submissionInit.value.link = submission.link
    submissionInit.value.desc = submission.desc
    
    if (proms[4].outgoing) {
      submissionInit.value.request_type = proms[4].outgoing.type
      submissionInit.value.request_receivingId = proms[4].outgoing.receivingId
    } else {
      let other_author_id = submission.authors.find(entry => entry != LastState.value?.user?.id)
      if (submission.challenger) {
        submissionInit.value.request_type = "battle"
        submissionInit.value.request_receivingId = proms[4].outgoing.receivingId
      } else if (other_author_id) {
        submissionInit.value.request_type = "collab"
        submissionInit.value.request_receivingId = other_author_id
      }
    }

    // if (submissionInit.value.request_type != null) { submissionInit.value.request_type = "Collab" }
    // if (submissionInit.value.request_receivingId != null) { submissionInit.value.request_receivingId = "planet_bluto_3" }
    // if (collab != "") { collabValue.value = resolveSimpleUser(collab) }
    // else (battle != "") { battleValue.value = resolveSimpleUser(battle) }

    // submissionInit.value.collaborator = (collab.length > 0 ? collabValue.value.username : "")
    // submissionInit.value.challenger = (battle.length > 0 ? battleValue.value.username : "")
    
    modifierValue.value = submission.modifiers.map(id => modifiers.value.find(entry => entry.id == id))
    submissionInit.value.modifiers = modifierValue.value

  }

  print("submissionInit: ", submissionInit.value)

  timeout(refreshRoundInfo, 60000, "round_refresh")
}

const stateFlags: Ref<Set<string>> = ref(new Set())

const currentState = computed(() => {
  stateFlags.value = new Set()
  
  let state: string = (currentRoundObj?.value?.current_state || "NONE")

  if (!LastState.value.user?.participant) { stateFlags.value.add("NOT_PARTICIPANT") }
  if (!LastState.value.server_valid) { stateFlags.value.add("WRONG_SERVER") }

  if ((!DiscordLoggedIn.value) && ["OPEN", "VOTE"].includes(state)) {
    state = "LOGIN"
  } else if (state == "OPEN") { // Logged in... but you ain't doin' shit right
    if (!LastState.value.user?.participant) { stateFlags.value.add("HARD_NOT_PARTICIPANT"); stateFlags.value.add("CANT_SUBMIT") }
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
  "WRONG_SERVER": "During voting, you must be in the correct servers to vote on submissions",
}

watch(currentDashRound, () => {
  refreshRoundInfo()
})

const validAlerts = computed(() => {
  return (Object.keys(FLAG_DESCRIPTIONS).filter(key => stateFlags.value.has(key)).map(key => FLAG_DESCRIPTIONS[key]))
})

const editions = ref([ // << API Content
  "https://ultraabox.github.io/"
])

//// SUBMISSIONS
import { useConfirm } from "primevue/useconfirm";
import { isAssertEntry } from 'typescript';

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
          let res: any = await API.POST(`/submit/${currentDashRound.value}`, value)
          loadingThings.value["submittingBeep"] = false

          print("SubmissionRequest Result: ", res)

          if (res.error) {
            Toast("Error Submitting Beep!! Try again...", "#e03c28")
          } else {
            refreshRoundInfo()
            Toast("Beep Successfully Submitted!")
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
  request_type: null,
  request_receivingId: null,
  link: "",
  desc: "",
  modifiers: []
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

const collabOverwriteConfirm = (reso: (...any) => any) => {
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
          reso()
        },
        reject: () => {
            // ... idk
        }
    });
};

async function acceptRequest(request) {
  loadingThings.value["processingRequest"] = true
  if (alreadySubmitted.value) {
    // ... Confirm prompt
    await new Promise<void>((reso, rej) => {
      collabOverwriteConfirm(reso)
    })
  }

  let res = await API.POST(`/requests/accept/${request.id}`)

  await refreshRoundInfo()

  loadingThings.value["processingRequest"] = false

  if (res) {
    Toast(`Successfully accepted ${request.type == "collab" ? "Collab" : "Battle"} Request!`)
  } else {
    Toast(`Error Processing Request... Try again`)
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
</script>

<template>
<Dialog v-model:visible="submissionVisible" modal :header="`ROUND ${currentDashRound} SUBMISSION`">
  <Form v-slot="$form" :initialValues="submissionInit" :resolver="submissionResolver" @submit="onSubmissionSubmit" class="form">
    <p>TITLE</p>
    <InputText name="title" type="text" />

    <p>LINK</p>
    <InputText name="link" type="text" />

    <p><span style="color: #25F3FF">Collab</span> or <span style="color: #E03C28">Battle</span></p>
    <div class="collab-battle-cont">
      <SelectButton name="request_type" :options="requestTypeOptions" option-label="name" option-value="value" v-model="requestType"/>
      <Select name="request_receivingId" option-label="username" option-value="id" :options="usernames.map(entry => resolveSimpleUser(entry.id))" :editable="true" @change="e => requestValue = e.value" :disabled="requestType == null" />
    </div>
    
    <p>CHOOSE MODIFIERS ({{ modifierValue.length }} / 3)</p>
    <AutoComplete name="modifiers" optionLabel="text" :suggestions="filteredModifiers" @complete="modifierSearch" :multiple="true" @input="e => modifierValue = e.target.value" />

    <p>Desc / Context:</p>
    <Textarea name="desc" rows="5" cols="30" />

    <button type="submit">Submit</button>
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
  <button id="main_button" @click="ROUND_STATE_METADATA[currentState].click" v-if="!stateFlags.has('CANT_SUBMIT')">{{ ROUND_STATE_METADATA[currentState].button_text }}
    <p id="main_button_label_fill">{{ ROUND_STATE_METADATA[currentState].button_text }}</p>
  </button>

  <div id="alert-div">
    <div class="alerts" v-for="desc in validAlerts">
      <img class="alert-icon" src="../../assets/gif/alert.gif"/>
      <p class="alert-text">{{ desc }}</p>
    </div>
  </div>

  <p id="round-header">{{ `ROUND ${currentDashRound}: ${currentRoundObj.prompt || LOADING_ROUND.prompt}` }}</p>
  <div id="time-cont">
    <p id="time-header">{{ROUND_STATE_METADATA[currentRoundObj.current_state].time_header}}</p>
    <div id="timestamp">
      <p>{{ `${["days", "hours", "minutes"].filter((unit: any) => Math.abs(durationTillNext.get(unit)) > 0).map((unit: any) => Math.abs(durationTillNext.get(unit)) + " " + unit).join(", ")}` }}</p>
      <p id="timestamp_label_fill" :title="moment(currentRoundObj.next).format('dddd, MMMM Do YYYY, h:mm:ss a')">{{ `${["days", "hours", "minutes"].filter((unit: any) => Math.abs(durationTillNext.get(unit)) > 0).map((unit: any) => Math.abs(durationTillNext.get(unit)) + " " + unit).join(", ")}` }}</p>
    </div>
  </div>
  <p id="desc">{{ currentRoundObj.desc || LOADING_ROUND.desc}}</p>
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
  transition: filter 50ms linear;
}
#main_button:hover {
  filter: brightness(1.2);
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
  font-size: 42px;
}

#time-cont {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

#time-header {
  font-size: 30px;
}

#timestamp {
  border: var(--current-real-color) 5px solid;
  background: linear-gradient(to bottom, #0D0D0D 0%, #0D0D0D 50%, color-mix(in srgb, var(--current-real-color), transparent 50%) 100% );
  width: 250px;
  text-align: center;
  border-radius: 8px;
  color: white;
  -webkit-text-fill-color: white;
  -webkit-text-stroke-color: #0D0D0D;
  -webkit-text-stroke-width: 8px;
  height: 33px;
}

#timestamp_label_fill {
  -webkit-text-fill-color: white;
  -webkit-text-stroke-width: 0px;
  position: relative;
  top: -23px;
  margin-top: 0px;
}

#desc {
  opacity: 0.5;
}

p {
  font-family: BakbakOne;
  color: white;
  margin: 0px;
}
</style>
