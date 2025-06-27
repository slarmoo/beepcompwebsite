<script setup lang="ts">
import DashboardSidebar from '../dashboard/sidebar.vue'
import RoundView from '../dashboard/round.vue'
import ParticipantsView from '../dashboard/participants.vue'
import PicksView from '../dashboard/picks.vue'
import { currentDashMode, DASH_MODES } from '../../modules/persists'
</script>

<template>
<div  id="dashboard" class="layer">
  <div id="dashboard-main">
    <RoundView v-if="currentDashMode == DASH_MODES.ROUND" />
    <ParticipantsView v-if="currentDashMode == DASH_MODES.PARTICIPANTS" />
    <PicksView v-if="currentDashMode == DASH_MODES.PICKS" />
  </div>

  <DashboardSidebar />
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
</style>