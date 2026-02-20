<script setup lang="ts">
import { LastState } from "../../modules/init";
import { currentDashMode, currentDashRound, DASH_MODES, DiscordLoggedIn, GeneralEvents, liveStreaming, loginWithDiscord, logoutDiscord, switchToVoting } from "../../modules/persists";
import SidebarButton from "./sidebar/button.vue"

import roundsSVG from "../../assets/svg/rounds.svg"
import peopleSVG from "../../assets/svg/people.svg"
import starSVG from "../../assets/svg/star.svg"
import cogSVG from "../../assets/svg/cog.svg"
import questionSVG from "../../assets/svg/question.svg"
import logoutSVG from "../../assets/svg/logout.svg"
import modifierSVG from "../../assets/svg/modifier.svg"
import adminSVG from "../../assets/svg/admin.svg"
import liveSVG from "../../assets/svg/live.svg"

function openAboutPage() {
  window.open("https://about.beepcomp.co/")
}


function warnLogOut() {
  let yeah = confirm("Are you sure you want to log out?")
  if (yeah) { logoutDiscord() }
}

GeneralEvents.on('change-round', (round_num: number) => {
  currentDashMode.value = DASH_MODES.ROUND
  currentDashRound.value
})

async function attemptLogin() {
  await loginWithDiscord()
}
</script>

<template>
<div id="sidebar">
  
  <div id="account">
    <img id="account-icon" :src="DiscordLoggedIn ? `https://cdn.discordapp.com/avatars/${LastState.user?.id}/${LastState.user?.avatar}.png?size=64` : ''" />
    <div id="account-meta">
      <p id="account-name" v-if="DiscordLoggedIn">{{ LastState.user?.username ? "@" + LastState.user?.username : "Logging in?..." }}</p>
      <p id="account-name" v-else @click="attemptLogin">Not Logged In</p>
      <div id="account-progress"></div> <!-- Progress Bar -->
    </div>
  </div>

  <div id="buttons">
    <div id="side">
      <SidebarButton color="#FF1919" label="LIVE!" :icon="liveSVG" :click="e => { switchToVoting(true) }" v-if="liveStreaming"/>
      <SidebarButton label="Admin" :icon="adminSVG" v-if="LastState.admin">
        <SidebarButton label="Submissions" :icon="adminSVG" :click="e => { currentDashMode = DASH_MODES.ADMIN_SUBMISSIONS }"/>
      </SidebarButton>
      <SidebarButton label="Rounds" :icon="roundsSVG">
        <SidebarButton v-for="round_num in LastState.currentRound" :label="`Round ${round_num}`" :click="e => { GeneralEvents.emit('change-round', round_num) }" />
      </SidebarButton>
      <SidebarButton label="Participants" :icon="peopleSVG" :click="e => { currentDashMode = DASH_MODES.PARTICIPANTS }"/>
      <SidebarButton label="Modifiers" :icon="modifierSVG" :click="e => { currentDashMode = DASH_MODES.MODIFIERS }"/>
      <!-- <SidebarButton label="Your Picks" :icon="starSVG" :click="e => { console.log(`somethin' something' Your`) }" v-if="DiscordLoggedIn"/> -->
      <!-- <SidebarButton label="Settings" :icon="cogSVG" :click="e => { console.log(`somethin' something' Settings`) }"/> -->
      <SidebarButton label="About" :icon="questionSVG" :click="e => { openAboutPage() }"/>
      <SidebarButton label="Logout" :icon="logoutSVG" :click="e => { warnLogOut() }" v-if="DiscordLoggedIn"/>
    </div>
  </div>

</div>
</template>



<style scoped>
#sidebar {
  --sidebar-padding: 15px;
  /* width: calc(360px - (var(--sidebar-padding) * 2)); */
  width: 360px;
  height: 100%;
  padding: var(--sidebar-padding);
  display: flex;
  flex-direction: column;
  /* overflow-y: scroll; */
  /* overflow-x: none; */
  /* transition: width 300ms; */
  /* background: green; */
}

#account {
  height: 80px;
}

#account-icon {
  border-radius: 50%;
  position: absolute;
  border: #020202 12px solid;
  top: 0px;
  margin-left: -12px;
}

#account-meta {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 60px;
  justify-content: center;
}

#account-name {
  font-family: BakbakOne;
  font-size: 20px;
  color: white;
  margin: 0px;
  margin-left: 80px;
  cursor:pointer
}

#account-progress {
  width: calc(100% - 20px);
  height: 15px;
  background: #343434;
  margin-left: 10px;
  margin-right: 10px;
  border-radius: 15px;
}

#buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;
  /* overflow-y: scroll; */
  /* overflow-x: none; */
  /* transition: width 300ms; */
  /* background: green; */
}

.sidebar-button {
  width: 100%;
  font-family: BakbakOne;
  font-size: 20px;
  background: #242424;
  border: none;
  border-radius: 8px;
  padding: 5px;
  margin-bottom: 8px;
  opacity: 0.5;
}

@media (max-width: 1000px) {
  #sidebar {
    /* display: grid; */
    /* flex-direction: row; */
    /* height: auto; */
    /* flex: 0 0 auto; */
    width: 90%;
  }
  #side {
    display: flex;
    flex-wrap: wrap;
  }
  #buttons {
    flex-direction: row;
    flex-wrap:wrap;
  }
  .rounds {
    order: 100;
  }
}
</style>