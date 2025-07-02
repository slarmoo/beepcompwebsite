<script setup lang="ts">
import DashboardSidebar from '../dashboard/sidebar.vue'
import RoundView from '../dashboard/round.vue'
import ParticipantsView from '../dashboard/participants.vue'
import PicksView from '../dashboard/picks.vue'
import ModifierView from '../dashboard/modifiers.vue'
import AdminView from '../dashboard/admin.vue'
import { currentDashMode, currentDashRound, DASH_MODES, GeneralEvents } from '../../modules/persists'

const pageLoaded = ref(false)

const VOL = 0.5

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
import { ReturnedValue, useSound } from '@vueuse/sound'
import { onMounted, ref } from 'vue'
const ROUND_4_MUSIC_SFX = useSound(ROUND_4_MUSIC_AUDIO, {onload: () => {
    (ROUND_4_MUSIC_SFX.sound.value as any).loop(true)
    ROUND_4_MUSIC_SFX.play()
    ROUND_4_MUSIC_SFX.sound.value.volume((currentDashRound.value == 4) ? VOL : 0)
  },
  volume: ((currentDashRound.value == 4) ? VOL : 0)
})
function switchTo(mode: string) {
  const map: {[index: string]: ReturnedValue} = {
    "1": ROUND_1_MUSIC_SFX,
    "2": ROUND_2_MUSIC_SFX,
    "3": ROUND_3_MUSIC_SFX,
    "4": ROUND_4_MUSIC_SFX,
  }
  
  Object.keys(map).forEach(this_mode => {
    // print(this_mode, map[this_mode].sound.value)
    if (map[mode] == null || map[mode].sound.value == null) { return }
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
      <ParticipantsView v-else-if="currentDashMode == DASH_MODES.PARTICIPANTS" />
      <PicksView v-else-if="currentDashMode == DASH_MODES.PICKS" />
      <ModifierView v-else-if="currentDashMode == DASH_MODES.MODIFIERS" />
      <AdminView v-else-if="currentDashMode == DASH_MODES.ADMIN" />
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
  transition: 1s ease;
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
  transition: opacity 1s ease, translate 1s ease;
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