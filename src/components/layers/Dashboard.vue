<script setup lang="ts">
import DashboardSidebar from '../dashboard/sidebar.vue'
import RoundView from '../dashboard/round.vue'
import ParticipantsView from '../dashboard/participants.vue'
import PicksView from '../dashboard/picks.vue'
import ModifierView from '../dashboard/modifiers.vue'
import AdminSubmissionsView from '../dashboard/admin/submissions.vue'
import VotingView from '../dashboard/voting.vue'
import ResultsView from '../dashboard/results.vue'
import { currentDashMode, currentDashRound, currentVotingSubmission, DASH_MODES, GeneralEvents, Toast } from '../../modules/persists'

const pageLoaded = ref(false)

const VOL = 0.5

import { ReturnedValue, useSound } from '@vueuse/sound'
import { onMounted, ref } from 'vue'

import ROUND_1_MUSIC_AUDIO from "../../assets/sfx/ROUND_1.flac"
const ROUND_1_MUSIC_SFX = useSound(ROUND_1_MUSIC_AUDIO, {onload: () => {
    (ROUND_1_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_1_MUSIC_SFX.play()
    ROUND_1_MUSIC_SFX.sound.value.volume((currentDashRound.value == 1) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 1) ? VOL : 0)
})
import ROUND_2_MUSIC_AUDIO from "../../assets/sfx/ROUND_2.flac"
const ROUND_2_MUSIC_SFX = useSound(ROUND_2_MUSIC_AUDIO, {onload: () => {
    (ROUND_2_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_2_MUSIC_SFX.play()
    ROUND_2_MUSIC_SFX.sound.value.volume((currentDashRound.value == 2) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 2) ? VOL : 0)
})
import ROUND_3_MUSIC_AUDIO from "../../assets/sfx/ROUND_3.flac"
const ROUND_3_MUSIC_SFX = useSound(ROUND_3_MUSIC_AUDIO, {onload: () => {
    (ROUND_3_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_3_MUSIC_SFX.play()
    ROUND_3_MUSIC_SFX.sound.value.volume((currentDashRound.value == 3) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 3) ? VOL : 0)
})
import ROUND_4_MUSIC_AUDIO from "../../assets/sfx/ROUND_4.flac"
const ROUND_4_MUSIC_SFX = useSound(ROUND_4_MUSIC_AUDIO, {onload: () => {
    (ROUND_4_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_4_MUSIC_SFX.play()
    ROUND_4_MUSIC_SFX.sound.value.volume((currentDashRound.value == 4) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 4) ? VOL : 0)
})
import ROUND_5_MUSIC_AUDIO from "../../assets/sfx/ROUND_5.flac"
const ROUND_5_MUSIC_SFX = useSound(ROUND_5_MUSIC_AUDIO, {onload: () => {
    (ROUND_5_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_5_MUSIC_SFX.play()
    ROUND_5_MUSIC_SFX.sound.value.volume((currentDashRound.value == 5) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 4) ? VOL : 0)
})
import ROUND_6_MUSIC_AUDIO from "../../assets/sfx/ROUND_6.flac"
const ROUND_6_MUSIC_SFX = useSound(ROUND_6_MUSIC_AUDIO, {onload: () => {
    (ROUND_6_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_6_MUSIC_SFX.play()
    ROUND_6_MUSIC_SFX.sound.value.volume((currentDashRound.value == 6) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 4) ? VOL : 0)
})
import ROUND_7_MUSIC_AUDIO from "../../assets/sfx/ROUND_7.flac"
const ROUND_7_MUSIC_SFX = useSound(ROUND_7_MUSIC_AUDIO, {onload: () => {
    (ROUND_7_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_7_MUSIC_SFX.play()
    ROUND_7_MUSIC_SFX.sound.value.volume((currentDashRound.value == 7) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 4) ? VOL : 0)
})
import ROUND_8_MUSIC_AUDIO from "../../assets/sfx/ROUND_8.flac"
const ROUND_8_MUSIC_SFX = useSound(ROUND_8_MUSIC_AUDIO, {onload: () => {
    (ROUND_8_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_8_MUSIC_SFX.play()
    ROUND_8_MUSIC_SFX.sound.value.volume((currentDashRound.value == 8) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 4) ? VOL : 0)
})
let previousSwitchTo = ""
function switchTo(mode: string) {
  if (mode != "") { previousSwitchTo = mode }
  const map: {[index: string]: ReturnedValue} = {
    "1": ROUND_1_MUSIC_SFX,
    "2": ROUND_2_MUSIC_SFX,
    "3": ROUND_3_MUSIC_SFX,
    "4": ROUND_4_MUSIC_SFX,
    "5": ROUND_5_MUSIC_SFX,
    "6": ROUND_6_MUSIC_SFX,
    "7": ROUND_7_MUSIC_SFX,
    "8": ROUND_8_MUSIC_SFX,
  }
  
  Object.keys(map).forEach(this_mode => {
    // print(this_mode, map[this_mode].sound.value)
    // if (map[mode] == null || map[mode].sound.value == null) { return }
    // print(this_mode, map[this_mode].sound.value.volume())
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

GeneralEvents.on("dashboard-music-pause", () => { switchTo("") })
GeneralEvents.on("dashboard-music-resume", () => { switchTo(previousSwitchTo) })

window.addEventListener("focus", e => {
  // Toast("Resuming music...")
  switchTo(previousSwitchTo)
})

window.addEventListener("blur", e => {
  // Toast("Pausing music due to lost focus...")
  switchTo("")
})

GeneralEvents.on("dashboard-music-change", switchTo)

onMounted(() => {
  pageLoaded.value = true
})

</script>

<template>
<div  id="dashboard" class="layer">
  <div id="dashboard-main">
    <Transition name="view" appear>
      <RoundView :key="String(currentDashRound)" v-if="currentDashMode == DASH_MODES.ROUND" />
      <VotingView :key="String(currentVotingSubmission?.id || -1)" v-else-if="currentDashMode == DASH_MODES.VOTING" />
      <ResultsView v-else-if="currentDashMode == DASH_MODES.RESULTS" />
      <ParticipantsView v-else-if="currentDashMode == DASH_MODES.PARTICIPANTS" />
      <PicksView v-else-if="currentDashMode == DASH_MODES.PICKS" />
      <ModifierView v-else-if="currentDashMode == DASH_MODES.MODIFIERS" />

      <AdminSubmissionsView v-else-if="currentDashMode == DASH_MODES.ADMIN_SUBMISSIONS" />
    </Transition>
  </div>

  <Transition name="sidebar">
    <DashboardSidebar v-show="pageLoaded"/>
  </Transition>
</div>
</template>

<style scoped>
#dashboard {
  display: flex;
}

#dashboard-main {
  /* width: calc(100% - 360px - (30px * 2)); */
  width: calc(100% - 360px);
  height: 100%;
  padding: 30px;
}



.sidebar-enter-active,
.sidebar-leave-active {
  transition: 0.75s ease;
  transition-property: opacity, transform;
}

.sidebar-enter-to,
.sidebar-leave-from {
  opacity: 1;
  transform: translateX(0px);
}

.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(500px);
}

.view-enter-active,
.view-leave-active {
  position: fixed;
  max-width: calc(100% - 360px - (30px * 2));
  max-height: calc(100% - (30px * 2));
  transition: opacity 0.75s ease, translate 0.75s ease;
}

.view-enter-to,
.view-leave-from {
  opacity: 1;
  translate: 0%;
}

.view-enter-from,
.view-leave-to {
  opacity: 0;
  translate: -100%;
}
</style>