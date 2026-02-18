<script setup lang="ts">
import { SongURL, SubmissionDatabased, User } from '@beepcomp/core';
import { computed, ComputedRef, onMounted, ref, Ref } from 'vue';
import { API } from '../../modules/api';
import { currentDashRound } from '../../modules/persists';
import { LastState, loadingThings, refreshState } from '../../modules/init';
import { users } from '../../../../server/src/db/schema';
import { numSuffix, PLACEMENT_COLORS } from '../../modules/placement';
import logoSVG from "../../assets/svg/logo.svg"
import { wrap } from '../../modules/maths';

import Popover from 'primevue/popover';
import Menu from 'primevue/menu';

const these_users: Ref<User[]> = ref([])
const bonus_stats: Ref<any> = ref({})

onMounted(async () => {
  loadingThings.value["users"] = true
  let res = await API.GET("/users")
  these_users.value = res.users
  bonus_stats.value = res.bonus_stats
  loadingThings.value["users"] = false
})

// function authorUser(author: any) {
//   return (LastState.value.other_users || []).find(user => user.id == author.userId)
// }

// function modifierObj(entry: any) {
//   return (LastState.value.modifiers || []).find(modifier => modifier.id == entry.modifierId)
// }

// const sub_desc = ref()
// const showReadMore = ref(false)
// onMounted(() => {
//   print(sub_desc.value)
//   // if (sub_desc.value.clientWidth)
// })

const USERS = computed(() => {
  let the_users = (these_users.value || [])
  // if (LastState.value.user != null) { the_users = the_users.concat([LastState.value.user]) }
  return the_users.filter(user => (user.participant && user.valid))
})

const userElems = ref()
function scrollToYou() {
  let thisUserElem = userElems.value.find(userElem => {
    return (userElem.id == `user-${LastState.value.user?.id}`)
  })

  thisUserElem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
}

function userSort(a, b) {
  if (a.points == b.points) {
    if (a.bonus_tokens == b.bonus_tokens) {
      return (a.username || "").localeCompare(b.username || "")
    } else {
      return (b.bonus_tokens || 0) - (a.bonus_tokens || 0)
    }
  } else {
    return (b.points || 0) - (a.points || 0)
  }
}

function averageSort(a, b) {
  let aAvg = (a.total_points / a.submission_count)
  let bAvg = (b.total_points / b.submission_count)
  if (aAvg == bAvg) {
    if (a.bonus_tokens == b.bonus_tokens) {
      return (a.username || "").localeCompare(b.username || "")
    } else {
      return (b.bonus_tokens || 0) - (a.bonus_tokens || 0)
    }
  } else {
    return (bAvg || 0) - (aAvg || 0)
  }
}

function tokenSort(a, b) {
  if (a.bonus_tokens == b.bonus_tokens) {
    if (a.points == b.points) {
      return (a.username || "").localeCompare(b.username || "")
    } else {
      return (b.points || 0) - (a.points || 0)
    }
  } else {
    return (b.bonus_tokens || 0) - (a.bonus_tokens || 0)
  }
}

const SORTS = ["DEFAULT", "AVERAGE", "TOKENS"]
const currentSort: Ref<number> = ref(0)
function toggleSort() {
  currentSort.value += 1
  currentSort.value = wrap(currentSort.value, 0, SORTS.length)
  print(currentSort.value)
}

const currentSortFunc = computed(() => {
  return [userSort, averageSort, tokenSort][currentSort.value]
})

const bonus_stats_current: Ref<string> = ref("")
const bonus_stats_items: ComputedRef<any[]> = computed(() => {
  let new_val = bonus_stats.value[bonus_stats_current.value].map(entry => {
    return {
      label: `(${entry.amount >= 0 ? '+' : ''}${entry.amount}) ${entry.context}`
    }
  })
  print("update: ", new_val)
  return new_val
})

const bonus_stats_popover = ref()
function showPopover(event, id) {
  // bonus_stats_popover.value.hide()
  print(event)
  bonus_stats_current.value = id
  bonus_stats_popover.value.show(event)
}
function hidePopover() {
  // print(event)
  // bonus_stats_current.value = event.
  bonus_stats_popover.value.hide()
}
</script>

<template>
<Popover ref="bonus_stats_popover">
  <Menu class="popover_menu" :model="bonus_stats_items"></Menu>
</Popover>
<div id="whole">
  <p id="header">PARTICIPANTS</p>
  <div id="header-button-cont">
    <button @click="scrollToYou()" v-if="(USERS || []).some(user => user.id == LastState.user?.id)">Scroll To You</button>
    <button @click="toggleSort()">Sort By: <span style="color: #7744ff">{{SORTS[wrap(currentSort, 0, SORTS.length)]}}</span></button>
  </div>
  <!-- <div id="result-cont"> -->
    <TransitionGroup name="list" tag="div" id="result-cont">
      <div ref="userElems" v-for="(user, index) in (USERS || []).sort(currentSortFunc)" :id="`user-${user.id}`" :key="user.id" class="sub-card">
        <p class="sub-placing" v-if="((currentSort == 0 || currentSort == 1) && user.points > 0) || (currentSort == 2)" :style="`color: ${PLACEMENT_COLORS[index] || '#fff'};`">{{ String(index+1) + numSuffix(index+1) }}</p>
        <div class="sub-card-top">
          <div class="sub-icons">
            <img :src="`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png?size=64`" :title="(user?.username || 'erm...')"/>
          </div>
          <div class="sub-card-top-text">
            <p class="sub-title-text" v-twemoji :title="user.global_name || user.username">{{ user.global_name || user.username }}</p>
            <p class="sub-authors-text" v-twemoji>{{ "@"+user.username }}</p>
          </div>
        </div>

        <p v-twemoji class="sub-bonus-tokens" @mouseenter="e => showPopover(e, user.id)" @mouseleave="hidePopover()"><img class="emoji token-icon" draggable="false" :src="logoSVG"> {{ user.bonus_tokens }}<span class="fade sub-bonus-pts">bonus tokens</span></p>

        <p class="sub-points" v-if="user.points > 0">{{ currentSort == 1 ? (user.total_points / user.submission_count).toFixed(2) : user.points.toFixed(2) }}<span class="fade sub-pts">{{currentSort == 1 ? 'avg' : 'pts'}}</span></p>
        <p class="sub-points" v-else><span class="fade sub-none">No public results yet...</span></p>

        <!-- Okay hand button here somewhere, yeah yeah- gotta make it a flex div w/ space between yeah yeah -->
      </div>
    </TransitionGroup>
  <!-- </div> -->
</div>
</template>

<style scoped>
.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.8s cubic-bezier(0.215, 0.610, 0.355, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  /* transform: translateX(30px); */
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  position: absolute;
}

#whole {
  display: flex;
  flex-direction: column;
  /* gap: 15px; */
  width: 100%;
  min-height: calc(100% + (30px * 2));
  max-height: calc(100% + (30px * 2));
  margin-top: -30px;
}

.token-icon {
  translate: -5px 5px;
}

p {
  margin: 0px;
}

#header {
  font-size: 64px;
  /* position: absolute; */
}

#sub-header {
  font-size: 48px;
  opacity: 0.75;
}

#header-button-cont {
  display: flex;
  gap: 15px;
}

#header-button-cont > button {
  border-radius: 15px;
  background: #353535;
  color: white;
  width: 100%;
  height: 48px;
  font-size: 28px;
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
  width: calc(100% - 75px - 8px);
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
  opacity: 0.5;
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

.sub-bonus-tokens {
  font-size: 32px;
  height: 36px;
  display: flex;
  align-items: baseline;
  /* margin-top: -20px; */
}

.sub-bonus-pts {
  font-size: 24px;
  margin-left: 8px;
}

.sub-points {
  font-size: 64px;
  height: 68px;
  display: flex;
  align-items: baseline;
  /* margin-top: -20px; */
}

.sub-pts {
  font-size: 48px;
}

.sub-none {
  font-size: 32px;
}
</style>
