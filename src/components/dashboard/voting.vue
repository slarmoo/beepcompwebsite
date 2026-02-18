<script setup lang="ts">
import { ref, computed, onMounted, Ref, useTemplateRef, nextTick, unref, toRaw, onDeactivated, onUnmounted } from 'vue';
import { API } from '../../modules/api';
import { LastState, loadingThings } from '../../modules/init';
import { currentDashRound, currentVotingSubmission, GeneralEvents, liveVoteState, openDialog, socket, Toast, votePageLiveMode, voteState, votingSoftRefresh } from '../../modules/persists';
import { SongURL, SubmissionDatabased } from '@beepcomp/core';
import { Rating } from 'primevue';
import votePointSVG from "../../assets/svg/vote_point.svg"
import votePointOFFSVG from "../../assets/svg/vote_point_off.svg"
import { Form } from '@primevue/forms';
import Popover from 'primevue/popover';
import Menu from 'primevue/menu';
import InputNumber from 'primevue/inputnumber';
import { submissions } from '../../../../server/src/db/schema';
import { rand } from '@vueuse/core';

const ownSubmission = ref(false)
const audio_mode = ref(false)

onMounted(async () => {
  if (voteState.value == null) { print("okay..."); return }

  audio_mode.value = (currentVotingSubmission.value?.audio != null)

  ownSubmission.value = voteState.value.ownSubmission
  if (voteState.value.ownSubmission) {liveReady.value = true}

  if (!votePageLiveMode.value) {
    prev_vote_items.value = voteState.value.previous_votes.map((entry: any) => {
      return {
        label: entry.submission.title,
        command: (e) => {
          prev_votes.value.hide()
          votingSoftRefresh(entry.submission.id)
        }
      }
    })
  } else {
    prev_vote_items.value = liveVoteState.value.submissions.slice(0, (liveVoteState.value.current_idx + 1)).map((entry: any) => {
      return {
        label: entry.title,
        command: (e) => {
          prev_votes.value.hide()
          votingSoftRefresh(entry.id)
        }
      }
    })
  }

  // initialValues.value = voteState.value.current_rating
  // print(initialValues.value)
  print("voteState.value.current_rating", voteState.value.current_rating)
  inputs["composition"].value = voteState.value.current_rating["composition"]
  inputs["production"].value = voteState.value.current_rating["production"]
  inputs["structure"].value = voteState.value.current_rating["structure"]
  inputs["style"].value = voteState.value.current_rating["style"]
  inputs["prompt"].value = voteState.value.current_rating["prompt"]
  inputs["modifiers"].value = voteState.value.current_rating["modifiers"]

  print("dude, please...", inputs)
})
const inputs = {
  composition: ref(0),
  production: ref(0),
  structure: ref(0),
  style: ref(0),
  prompt: ref(0),
  modifiers: ref(0),
}

//// LIVE STREAM IMPLEMENTATION ////

const liveReady: Ref<boolean> = ref(false)

const stateChangeEvent = async state => {
  print("liveReady.value (state_change event)", liveReady.value)
  let positive_change = (liveVoteState.value.current_idx == this_live_idx.value && liveVoteState.value.current_idx < state.current_idx)
  print("positive_change", positive_change)
  let negative_change = (liveVoteState.value.current_idx > state.current_idx)
  print("negative_change", negative_change)
  liveVoteState.value = state

  prev_vote_items.value = liveVoteState.value.submissions.slice(0, (liveVoteState.value.current_idx + 1)).map((entry: any) => {
    return {
      label: entry.title,
      command: (e) => {
        prev_votes.value.hide()
        votingSoftRefresh(entry.id)
      }
    }
  })

  if (positive_change) {
    if (liveReady.value) { // check if liveReady
      await votingSoftRefresh(liveVoteState.value.submissions[liveVoteState.value.current_idx].id)
      liveReady.value = false
    } else {
      Toast("Live Stream has moved to a new submission, finishing voting then catch up to the stream by clicking \"Sync\"")
    }
  }

  if (negative_change) {
    await votingSoftRefresh(liveVoteState.value.submissions[liveVoteState.value.current_idx].id)
  }
}

GeneralEvents.on("live_state_change", stateChangeEvent)
onUnmounted(() => {
  print("bye bye bye bye bye bye bye bye bye bye bye bye bye")
  GeneralEvents.off("live_state_change", stateChangeEvent)
})

const this_live_idx = computed(() => {
  return liveVoteState.value.submissions.findIndex(sub => sub.id == currentVotingSubmission.value?.id)
})

async function readyAndSubmit() {
  if (!liveReady.value) {
    let went_thru = await submitForm()
    if (went_thru) { liveReady.value = true }
    print("liveReady.value (submitted)", liveReady.value)
  } else {
    if (!ownSubmission.value) {
      liveReady.value = false
    } else {
      const idkman = [
        "What are you trying to pull here?...",
        "Stop that",
        "Wh- what?...",
        "Bro?...",
        "Okay... okay...",
        "Why?...",
        "Can you not..."
      ]

      Toast(idkman[rand(0, idkman.length-1)])
    }
  }
}

async function jumpToLive() {
  let went_thru = await submitForm()
  if (went_thru) { votingSoftRefresh(liveVoteState.value.submissions[liveVoteState.value.current_idx].id) }
}

const player_link = computed(() => {
  try {
    return SongURL(currentVotingSubmission.value?.link || "")?.player
  } catch (err) {
    return ""
  }
})

const link = computed(() => {
  try {
    return SongURL(currentVotingSubmission.value?.link || "")?.editor
  } catch (err) {
    return ""
  }
})

const onVoteSubmit = async ({valid, values, errors}) => {
  print("valid", valid)
  print("values", values)
  print("errors", errors)

  let went_thru = false

  if (!valid) {
    Toast(`Value must be more than zero! (${Object.keys(errors).join(", ")})`)
  } else {
    loadingThings.value["vote_submitting"] = true
    let res = await API.POST(`/votes/${currentVotingSubmission.value?.id}`, values)

    if (!res.error) {
      print("yay!")
      went_thru = true
      if (!votePageLiveMode.value) { votingSoftRefresh () }
    } else {
      Toast(`Error submitting vote: ${res.error}`, "ERROR")
    }

    loadingThings.value["vote_submitting"] = false
  }

  GeneralEvents.emit("vote-submitted", went_thru)
}

const fields = computed(() => {
  let _val = [
    "composition",
    "production",
    "structure",
    "style",
    "prompt",
    // "modifiers",
  ]

  if ((currentVotingSubmission.value?.modifiers?.length || 0) > 0) { _val.push("modifiers") }

  return _val
})

const RECOMMENDED_VOTE_COUNT = 9
const recommended_voting_progress = computed(() => {
return ((voteState.value?.progress?.done || 0) / RECOMMENDED_VOTE_COUNT)
})
const rest_voting_progress = computed(() => {
return (((voteState.value?.progress?.done || 0) - RECOMMENDED_VOTE_COUNT) / ((voteState.value?.progress?.total || 1) - RECOMMENDED_VOTE_COUNT))
})

const form = ref()
onMounted(() => {print("form", form)})
function submitForm() {
  print(form.value as any);
  (form.value as any).submit()

  return new Promise((reso) => {
    GeneralEvents.once("vote-submitted", reso)
  })
}

function formResolver({values}) {
  const errors: any = {}
  let new_values: any = {}

  // print(values)
  // print(Object.values(values))
  // print(Object.values(values).some(val => val == null))
  print("inputs", inputs)

  Object.keys(values).forEach(key => {
    let val = inputs[key].value
    print("val", val)
    new_values[key] = val
    if (val == null && key != "modifiers") {
      errors[key] = [{message: "No null values allowed!"}]
    }
  })

  if (new_values["modifiers"] == null) { new_values["modifiers"] = 0 }

  print("new_values", new_values)
  // if (Object.keys(errors).length > 0) { liveReady.value = false }
  
  return {values: new_values, errors}
}

const prev_vote_items: Ref<any[]> = ref([])

const prev_votes = ref()
function togglePopover(event) {
  prev_votes.value.toggle(event)
}
</script>

<template>
<div id="whole">
  <Popover ref="prev_votes">
    <Menu class="popover_menu" :model="prev_vote_items"></Menu>
  </Popover>

  <div v-if="currentVotingSubmission != null">
    <div style="display: flex; gap: 15px">
      <img id="beep-image" v-if="currentVotingSubmission.artwork != null" :src="currentVotingSubmission.artwork" />
      <div style="width: 100%;">
        <p id="header" v-twemoji>{{ currentVotingSubmission?.title }}</p>
        <textarea v-twemoji readonly id="desc">{{ currentVotingSubmission?.desc }}</textarea>
        <a class="beep-link" @click="e => {e.preventDefault(); openDialog((currentVotingSubmission?.title || ''), (currentVotingSubmission?.desc || ''))}" href="#" v-twemoji>🔎 Expand Description</a>
      </div>
    </div>

    <!-- <p class="sub-header" v-if="currentVotingSubmission.artwork != null">Artwork:</p> -->

    <!-- <p id="desc">{{ player_link }}</p> -->
    <!-- <a class="beep-button" style="width: 250px; text-align: center; background: #343434; border-radius: 8px;" :href="link" target="_blank">🔗 Go-To Song URL</a> -->
    <Button v-if="currentVotingSubmission.audio != null" @click="audio_mode = (!audio_mode)">Toggle Audio</Button>
    <iframe id="beep" :src="player_link" v-if="!audio_mode"></iframe>
    <audio id="beep-audio" :src="currentVotingSubmission.audio || ''" controls v-else></audio>
    <a class="beep-link" :href="link" target="_blank" v-twemoji>🔗 Go-To Song URL</a>

    <div style="display: flex; gap: 20px;">
      <p class="sub-header">Prompt:</p>
      <p class="sub-header" style="color: #25f3ff;">{{ (LastState.rounds || [])[!votePageLiveMode ? (Number(currentDashRound)-1) : liveVoteState.round_idx].prompt }}</p>
    </div>

    <div id="modifier-cont">
      <p class="sub-header">Modifiers:</p>
      <p class="sub-header" style="opacity: 0.5;" v-if="(currentVotingSubmission?.modifiers || []).length == 0">None</p>
      <div class="modifier" v-for="modifier in currentVotingSubmission?.modifiers">
        <p>{{modifier?.modifier?.text || ""}}</p>
        <p class="modifier-type">({{ modifier?.modifier?.type || "" }})</p>
      </div>
    </div>

    <Form v-slot="$form" ref="form" :resolver="formResolver" @submit="onVoteSubmit" class="form" v-if="liveReady == false && !ownSubmission">
      <div id="field-cont">
        <div v-for="field in fields" style="display: flex; gap: 8px;">
          <InputNumber v-model="inputs[field].value" :min="1" :max="10" :step="1" :showButtons="true" style="width: 3rem" buttonLayout="vertical"/>
          <div>
            <p class="form-label">{{String(field).toUpperCase()}}</p>
            <Rating :name="field" class="rating" :stars="10" v-model="inputs[field].value">
                <template #onicon>
                    <img :src="votePointSVG" height="40" width="40" />
                </template>
                <template #officon>
                    <img :src="votePointOFFSVG" height="40" width="40" />
                </template>
            </Rating>
          </div>
        </div>
      </div>
    </Form>

    <div v-else-if="ownSubmission"><p class="sub-header">You can't vote on your own submission... obviously.</p></div>
    <div v-else><p class="sub-header">You can't edit vote once you're ready, you must click 'Ready' to edit again!</p></div>

    <div id="voting-bottom-bar">
      <button @click="togglePopover" class="beep-button">Previous Votes</button>
      <div id="reco-progress-bar" class="progress-bar" :style="`--progress: ${recommended_voting_progress * 100}%`">Recommended ({{ Math.min((voteState?.progress?.done || 0), 9) }} / {{ RECOMMENDED_VOTE_COUNT }})</div>
      <div id="rest-progress-bar" class="progress-bar" :style="`--progress: ${rest_voting_progress * 100}%`">Remaining Submissions ({{ Math.max((voteState?.progress?.done || 0) - RECOMMENDED_VOTE_COUNT, 0) }} / {{ (voteState?.progress?.total || RECOMMENDED_VOTE_COUNT) - RECOMMENDED_VOTE_COUNT }})</div>
      <button @click="submitForm" class="beep-button" :disabled="!((form as any)?.valid || false)" v-if="votePageLiveMode == false">Next</button>
      <button @click="jumpToLive" class="beep-button" :disabled="!((form as any)?.valid || false)" v-else-if="this_live_idx < liveVoteState.current_idx">Jump To Live</button>
      <button @click="readyAndSubmit" class="beep-button" :disabled="!(((form as any)?.valid || liveReady))" v-else >{{liveReady ? 'Unready' : 'Ready'}}</button>
    </div>
  </div>
  <div v-else>
    <p id="header">Voted on all submissions!...</p>
    <div id="little-button-cont">
      <button @click="togglePopover" class="beep-button">Previous Votes</button>
      <button @click="GeneralEvents.emit('change-round', currentDashRound)" class="beep-button">Return</button>
    </div>
  </div>
</div>
</template>

<style scoped>
#whole {
  width: 100%;
  height: 100%;
}

#whole > div {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 24px;
  /* justify-content: space-between; */
  overflow-y: scroll;
  padding: 10px;
}

.beep-button {
  border: none;
  border-radius: 8px;
  background: #444444;
  width: 200px;
  height: 32px;
  transition: scale 700ms ease, filter 700ms;
}

.beep-button:hover {
  scale: 1.1;
  filter: brightness(1.4);
  transition: scale 100ms ease, filter 100ms;
}

.beep-button:active {
  scale: 0.9;
  filter: brightness(0.8);
  transition: scale 50ms ease, filter 50ms;
}

.beep-button:disabled {
  scale: 1.0;
  filter: brightness(1.0);
  opacity: 0.5;
  transition: scale 700ms ease, filter 700ms, opacity 700ms;
}

#little-button-cont {
  display: flex;
  gap: 32px;
}

#beep-image {
  max-width: 350px;
  width: auto;
  max-height: 350px;
  height: auto;
  align-self: center;
  border-radius: 10px;
  border: #25f3ff 8px solid;
}

#beep {
  width: 100%;
  min-height: 300px;
  border: #444444 solid 5px;
  border-radius: 8px;
}

#beep-audio {
  width: 100%;
  min-height: 70px;
}

#header {
  margin: 0px;
  font-size: 58px;
  /* margin-bottom: 32px; */
}

#desc {
  margin: 0px;
  font-size: 24px;
  opacity: 0.7;
  resize: none;
  width: 100%;
  height: 175px;
  /* max-height: 200px; */
  border: none;
  background: #ffffff1c;
  border-radius: 8px;
  /* margin-bottom: 32px; */
}

.beep-link {
  /* width: 100%; */
  font-size: 32px;
  color: #7744ff;
  /* text-align: center; */
}

#beep-link {
  font-size: 32px;
}

.sub-header {
  margin: 0px;
  font-size: 32px;
  /* margin-bottom: 32px; */
}

#submission-cont {
  display: grid;
  gap: 15px;
  width: 100%;
  height: calc(100% - 64px);
  padding-top: 32px;
  padding-bottom: 32px;
  /* flex-wrap: wrap; */
  overflow-y: scroll;
  overscroll-behavior-y: auto;
  grid-template-columns: auto auto;
  grid-auto-rows: 300px;
}

.submission {
  min-width: 150px;
  height: 300px;
  font-size: 28px;
  background: #343434;
  padding: 15px;
  border-radius: 15px;
  scale: 0.9;
  opacity: 0.5;
  transition: 500ms;
  transition-property: scale, opacity;
}

.submission:hover {
  scale: 1.01;
  opacity: 1.0;
  transition: 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.submission > p {
  margin: 0px;
}

.submission-meta {
  margin: 0px;
  opacity: 0.5;
  font-size: 20px;
}

.submission-meta-opaque {
  margin: 0px;
  font-size: 20px;
}

.submission-desc {
  width: 100%;
  resize: none;
}

#modifier-cont {
  display: flex;
  gap: 15px;
  width: 100%;
  /* height: calc(100% - 64px); */
  /* padding-top: 32px; */
  /* padding-bottom: 32px; */
  flex-wrap: wrap;
  /* overflow-y: scroll; */
  /* overscroll-behavior-y: auto; */
}

.modifier {
  min-width: 150px;
  height: min-content;
  font-size: 20px;
  display: flex;
  gap: 8px;
  background: #343434;
  padding: 10px;
  border-radius: 15px;
  scale: 1;
  /* opacity: 0.5; */
  transition: 500ms;
  transition-property: scale, opacity;
}

.modifier:hover {
  scale: 1.15;
  opacity: 1.0;
  transition: 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.modifier > p {
  margin: 0px;
}

.modifier-type {
  margin: 0px;
  opacity: 0.5;
  font-size: 20px;
}

#field-cont {
  display: grid;
  /* flex-wrap: wrap; */
  gap: 25px;
  grid-template-columns: repeat(3, min-content);
  grid-template-rows: repeat(2, min-content);
  grid-auto-flow: column;
  justify-self: center;
}

.form-label {
  font-size: 32px;
  margin: 0px;
}

.rating {
  gap: 0px;
  margin-left: 25px;
}

.rating > * {
  transition: scale 800ms ease, filter 500ms ease;
}

.rating > *:hover {
  scale: 1.1;
  filter: brightness(1.5);
  transition: scale 100ms ease, filter 100ms ease;
}

.rating > *:nth-child(even) {
  transform: scaleX(-1);
  /* margin-left: -15px; */
}

.rating > *:nth-child(odd) {
  margin-left: -30px;
}

#voting-bottom-bar {
  z-index: 100;
  position: sticky;
  bottom: 0px;
  display: flex;
  gap: 8px;
  height: 32px;
  width: 100%;
}

#reco-progress-bar { width: 30%; }
#rest-progress-bar { width: 70%; }

.progress-bar {
  --progress: 50%;
  height: 100%;
  background: #080808;
  color: #5100FF;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    to right,
    #7744ff 0%,
    #7744ff var(--progress),
    #080808 var(--progress)
  );
  border-radius: 8px;
}
</style>
