<script setup lang="ts">
import { SongURL, SubmissionDatabased } from '@beepcomp/core';
import { onMounted, ref, Ref } from 'vue';
import { API } from '../../modules/api';
import { currentDashRound, openDialog, openImageDialog } from '../../modules/persists';
import { LastState, loadingThings } from '../../modules/init';
import { numSuffix, PLACEMENT_COLORS } from '../../modules/placement';

const these_submissions: Ref<SubmissionDatabased[]> = ref([])

onMounted(async () => {
  loadingThings.value["results"] = true
  let submissions = await API.GET(`/rounds/${currentDashRound.value}/submissions`)
  if (!submissions.error) {
    these_submissions.value = (submissions as SubmissionDatabased[])
  }

  loadingThings.value["results"] = false
})

function authorUser(author: any) {
  let the_users = (LastState.value.other_users || [])
  if (LastState.value.user != null) { the_users = the_users.concat([LastState.value.user]) }
  return the_users.find(user => user.id == author.userId)
}

function modifierObj(entry: any) {
  return (LastState.value.modifiers || []).find(modifier => modifier.id == entry.modifierId)
}

// const sub_desc = ref()
// const showReadMore = ref(false)
// onMounted(() => {
//   print(sub_desc.value)
//   // if (sub_desc.value.clientWidth)
// })

const subElems = ref()
function scrollToYou() {
  let thisSubElem = subElems.value.find(subElem => {
    return (subElem.id.includes(LastState.value.user?.id))
  })

  thisSubElem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
}

function openArtwork(e: Event, header: string, src: string) {
  e.preventDefault()
  openImageDialog(header, src)
}
</script>

<template>
<div id="whole">
  <p id="header">ROUND {{currentDashRound}} RESULTS</p>
  <button @click="scrollToYou()" v-if="(these_submissions || []).some(sub => (sub.authors || []).some(author => author.userId == LastState.user?.id))">Scroll To You</button>
  <div id="result-cont">
    <div ref="subElems" v-for="(sub, index) in (these_submissions || []).sort((a, b) => (b.score || 0) - (a.score || 0))" :id="`user-${(sub.authors || []).map(author => author.userId).join('-')}`" class="sub-card">
      <p class="sub-placing" :style="`color: ${PLACEMENT_COLORS[index] || '#fff'};`">{{ String(index+1) + numSuffix(index+1) }}</p>
      <div class="sub-card-top">
        <div class="sub-icons">
          <img v-for="user in (sub.authors || []).map(authorUser)" :src="`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png?size=64`" :title="(user?.username || 'erm...')"/>
        </div>
        <div class="sub-card-top-text">
          <p class="sub-title-text" :title="sub.title" v-twemoji>{{ sub.title }}</p>
          <p class="sub-authors-text" v-twemoji>{{ (sub.authors || []).map(entry => (authorUser(entry)?.username || "erm...")).join(" & ") }}</p>      
        </div>
        <a :href="sub.artwork || ''" target="_blank" @click="e => openArtwork(e, sub.title, (sub.artwork || ''))" title="Submitted Artwork"><img style="max-width: 100%; max-height: 100%; width: auto; height: auto;" class="sub-artwork" v-if="sub.artwork" :src="sub.artwork" /></a>
      </div>

      <div class="sub-divline"></div>

      <div class="sub-desc-area">
        <p class="sub-desc" ref="sub_desc" v-twemoji>{{ sub.desc }}</p>
        <a class="sub-read-more" @click="openDialog(sub.title, sub.desc)">Read More</a>
      </div>

      <!-- Custom component for click toggle iframes- to be reused in the voting... -->

      <div class="sub-modifier-area">
        <p v-for="modifer in (sub.modifiers || []).map(modifierObj)">{{ (modifer?.text || "") }} <span class="fade">({{ modifer?.type }})</span></p>
      </div>

      <!-- Gather some edition icons, lazy... -->

      <div class="sub-link-area">
        <a class="sub-link sub-audio-link" v-if="sub.audio" :href="sub.audio" target="_blank" v-twemoji>▶️ Audio</a>
        <a class="sub-link sub-song-player-link" :href="SongURL(sub.link)?.player" target="_blank" v-twemoji>🎼 Song Player</a>
        <a class="sub-link sub-editor-link" :href="SongURL(sub.link)?.editor" target="_blank" v-twemoji>✏️ Editor</a>
      </div>
      

      <div class="sub-divline"></div>

      <p class="sub-points">{{ (sub.score || 0).toFixed(2) }}<span class="fade sub-pts">pts</span></p>

      <!-- Okay hand button here somewhere, yeah yeah- gotta make it a flex div w/ space between yeah yeah -->
    </div>
  </div>
</div>
</template>

<style scoped>
#whole {
  display: flex;
  flex-direction: column;
  /* gap: 15px; */
  width: 100%;
  min-height: calc(100% + (30px * 2));
  max-height: calc(100% + (30px * 2));
  margin-top: -30px;
}

p {
  margin: 0px;
}

#header {
  font-size: 64px;
  /* position: absolute; */
}

#result-cont {
  display: grid;
  grid-template-columns: calc(50% - 8px) calc(50% - 8px);
  flex-direction: column;
  gap: 42px;
  column-gap: 16px;
  overflow-y: scroll;
  height: 100%;
  padding-top: 32px;
  padding-bottom: 16px;
  mask-image: linear-gradient(transparent 0px, black 20px, black 100%);
}

.fade {
  opacity: 0.4;
}

.sub-card {
  background: #222222;
  border-radius: 15px;
  padding: 15px;
}

.sub-placing {
  position: relative;
  font-size: 42px;
  margin-top: -40px;
  margin-left: -20px;
  transform-origin: 15px 15px;
  rotate: -15deg;
}

.sub-card-top {
  width: 100%;
  height: 75px;
  display: flex;
  gap: 8px;
}

.sub-icons {
  display: flex;
  gap: 15px;
}

.sub-icons > img {
  background: #0d0d0d;
  width: 75px;
  height: 75px;
  border: none;
  border-radius: 50%;
}

.sub-card-top-text {
  margin-top: -5px;
  width: calc(100% - 75px - 8px - 83px);
}

.sub-title-text {
  font-size: 32px;
  width: 100%;
  height: 45px;
  overflow: hidden;
  text-wrap-mode: nowrap;
  text-overflow: ellipsis;
}

.sub-authors-text {
  font-size: 20px;
}

.sub-artwork {
  border-radius: 8px;
  cursor: pointer;
  transition: scale 700ms ease;
}

.sub-artwork:hover {
  scale: 1.2;
  transition: scale 200ms;
}

.sub-divline {
  width: 100%;
  height: 8px;
  border-radius: 8px;
  margin-top: 16px;
  margin-bottom: 16px;
  background: #303030;
}

.sub-desc-area {
  display: flex;
  width: 100%;
  height: 26px;
  gap: 8px;
  overflow: hidden;
  opacity: 0.75;
}

.sub-desc {
  font-size: 18px;
  max-width: calc(100% - 8px - 100px);
  width: min-content;
  height: 100%;
  overflow: hidden;
  text-wrap-mode: nowrap;
  text-overflow: ellipsis;
}

.sub-read-more {
  font-size: 18px;
  width: 100px;
  text-align: center;
  color: #7744FF;
  text-decoration: underline;
  cursor: pointer;
}

.sub-modifier-area {
  display: flex;
  gap: 16px;
}

.sub-link-area {
  margin-top: 16px;
  display: flex;
  gap: 16px;
}

.sub-link {
  color: white;
  text-decoration: none;
  background: #444444;
  width: 150px;
  height: 32px;
  padding: 5px;
  padding-left: 16px;
  padding-right: 16px;
  border-radius: 32px;
  transition: scale 500ms ease;
}

.sub-link:hover {
  scale: 1.1;
  transition: scale 100ms ease;
}

.sub-points {
  font-size: 64px;
  height: 68px;
  display: flex;
  align-items: baseline;
  margin-top: -20px;
}

.sub-pts {
  font-size: 48px;
}
</style>
