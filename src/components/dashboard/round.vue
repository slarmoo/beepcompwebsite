<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, Ref, toRaw, triggerRef, watch } from 'vue';
import { currentDashRound, DiscordLoggedIn, loginWithDiscord, Toast } from '../../modules/persists';
import { LastState, loadingThings } from '../../modules/init';
import { API } from '../../modules/api';
import { Round, SimpleModifier, SimpleUser, Submission } from '@beepcomp/core';
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

async function refreshRoundInfo() {
  print("Round: ", currentDashRound.value)

  let round = await API.GET(`/rounds/${currentDashRound.value}`)
  currentRoundObj.value = round
  durationTillNext.value = moment.duration(moment(Date.now()).diff(currentRoundObj.value.next))

  print("Round Obj: ", currentRoundObj.value)

  let submission: Submission = await API.GET(`/submit/${currentDashRound.value}`)
  print("Submission Obj: ", submission)
  submissionInit.value.title = submission.title
  submissionInit.value.link = submission.link
  
  collabValue.value = (submission.authors.find(entry => entry != LastState.value?.user?.id) || "")
  submissionInit.value.collaborator = collabValue.value
  
  battleValue.value = (submission.challenger || "")
  submissionInit.value.challenger = battleValue.value
  
  modifierValue.value = submission.modifiers.map(id => modifiers.value.find(entry => entry.id == id))
  submissionInit.value.modifiers = modifierValue.value

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


const usernames: Ref<SimpleUser[]> = ref([ // << API Content
  {id: "1092635593332248586", username: "planet_bluto_2"},
  {id: "1111344374715011082", username: "planet_bluto_3"}
])
const filteredUsernames: Ref<SimpleUser[]> = ref([]);

const usernameSearch = event => {
  if (!event.query.trim().length) {
      filteredUsernames.value = [...usernames.value];
  } else {
      filteredUsernames.value = usernames.value.filter((entry) => {
          return entry.username.toLowerCase().startsWith(event.query.toLowerCase());
      });
  }
}

const modifierCount = ref(3)
const modifiers: Ref<SimpleModifier[]> = ref([ // << API Content
  {id: "7941552781398016", text: "fish"},
  {id: "7941552781398017", text: "fishing"},
  {id: "7941552781398018", text: "fishy"},
])
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

const editions = ref([ // << API Content
  "https://ultraabox.github.io/"
])

//// SUBMISSIONS
import { useConfirm } from "primevue/useconfirm";

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
const submissionInit: Ref<SubmissionRequest> = ref({
  title: "",
  collaborator: "",
  challenger: "",
  link: "",
  modifiers: []
})

const modifierValue: Ref<any[]> = ref([])
const collabValue: Ref<any> = ref({id: "", username: ""})
const battleValue: Ref<any> = ref({id: "", username: ""})

function openSubmissionForm() {
  modifierValue.value = []
  collabValue.value = {id: "", username: ""}
  battleValue.value = {id: "", username: ""}
  
  submissionVisible.value = true
}

function closeSubmissionForm() {
  submissionVisible.value = false
}
</script>

<template>
<Dialog v-model:visible="submissionVisible" modal :header="`ROUND ${currentDashRound} SUBMISSION`">
  <Form v-slot="$form" :initialValues="submissionInit" :resolver="submissionResolver" @submit="onSubmissionSubmit" class="form">
    <p>TITLE</p>
    <InputText name="title" type="text" />
    <div class="collab-battle-cont">
      <div>
        <p>COLLABORATOR ({{ typeof collabValue }})</p>
        <!-- <InputText name="collaborator.id" v-model="collabValue.id" :hidden="false" :readonly="true"/> -->
        <AutoComplete name="collaborator" optionLabel="username" :suggestions="filteredUsernames" @complete="usernameSearch" @input="e => collabValue = e.target.value" :disabled="!(battleValue.username == '' || battleValue == undefined || battleValue == '')" />
      </div>

      <p class="collab-battle-or">OR</p>

      <div>
        <p>CHALLENGER ({{ typeof battleValue }})</p>
        <!-- <InputText name="challenger.id" v-model="battleValue.id" :hidden="false" :readonly="true"/> -->
        <AutoComplete name="challenger" optionLabel="username" :suggestions="filteredUsernames" @complete="usernameSearch" @input="e => battleValue = e.target.value" :disabled="!(collabValue.username == '' || collabValue == undefined || collabValue == '')" />
      </div>
    </div>
    
    <p>LINK</p>
    <InputText name="link" type="text" />

    <p>CHOOSE MODIFIERS ({{ modifierValue.length }} / 3)</p>
    <p>{{ modifierValue }}</p>
    <!-- <p @click="modifierCount -= 1; console.log(modifierCount)">-</p>
    <p @click="modifierCount += 1; console.log(modifierCount)">+</p> -->
    <AutoComplete name="modifiers" optionLabel="text" :suggestions="filteredModifiers" @complete="modifierSearch" :multiple="true" @input="e => modifierValue = e.target.value" />

    <button type="submit">Submit</button>
  </Form>
</Dialog>

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

.collab-battle-cont {
  display: flex;
  gap: 15px;
  align-items: center;
}

.collab-battle-or {
  font-size: 32px;
  height: 43px;
}

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
