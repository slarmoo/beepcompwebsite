<script setup lang="ts">
import { computed, inject, onMounted, Ref, ref } from 'vue';
import { LastState, loadingThings } from '../../modules/init';
import { API } from '../../modules/api';
import { AdminState, SongURL } from '@beepcomp/core';
import { ReturnedValue } from '@vueuse/sound';
const printingSFX: ReturnedValue = (inject("printingSFX") as ReturnedValue)

const LastAdminState: Ref<AdminState> = ref({
  submissions: []
})

onMounted(async () => {
  loadingThings.value["admin_portal_state"] = true
  LastAdminState.value = await API.GET("/admin/state")
  loadingThings.value["admin_portal_state"] = false
})

const OtherUsers = computed(() => {
  return (LastState.value.other_users || [])
})

const hideSubmissionSpoilers = ref(true)
</script>

<template>
<div id="whole">
  <p id="header">Admin Portal<span style="opacity: 0.25; font-size: 14px;"> (hai lead! :3)</span></p>
  <p id="sub-header">Submissions <button @click="hideSubmissionSpoilers = !hideSubmissionSpoilers">Spoilers: {{(!hideSubmissionSpoilers) ? "ON" : "OFF"}}</button></p>
  <div id="submission-cont">
    <div class="submission" v-for="submission in LastAdminState.submissions" @mouseenter="(_e: MouseEvent) => { printingSFX.play() }">
      <p class="submission-meta submission-id">{{ submission.id }}</p>
      <p>{{ submission.title }}</p>
      <p class="submission-meta submission-round">Round {{ submission.round }}</p>
      <p class="submission-meta submission-authors" v-if="!hideSubmissionSpoilers">Authors: {{ (submission.authors || []).map(author => OtherUsers.find(thisUser => thisUser.id == author.userId)?.username || (author.userId == LastState?.user?.id ? LastState?.user?.username : undefined) || "").join(" & ") }}</p>
      <a class="submission-meta-opaque submission-link" :href="submission.link" target="_blank">Song Link</a>
      <br>
      <!-- <iframe :src="SongURL(submission.link)?.player" /> -->
      <textarea disabled class="submission-meta-opaque submission-desc">{{ submission.desc }}</textarea>
      <!-- <p class="submission-meta submission-id">{{ submission. }}</p> -->
    </div>
  </div>
</div>
</template>

<style scoped>
#whole {
  height: 100%;
}

#header {
  margin: 0px;
  font-size: 64px;
  /* margin-bottom: 32px; */
}

#sub-header {
  margin: 0px;
  font-size: 48px;
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
</style>
