<script setup lang="ts">
import { ReturnedValue, useSound } from '@vueuse/sound';
import { LastState } from '../../modules/init';
import { inject, ref } from 'vue';
import { generateWav } from '../../modules/animalese';
const printingSFX: ReturnedValue = (inject("printingSFX") as ReturnedValue)

function playLittleGuy(text: string, id: string = "") {
  const audioCtx = new window.AudioContext();
  const delayNode = audioCtx.createDelay();
  delayNode.delayTime.value = 0.4;

  const feedbackNode = audioCtx.createGain();
  feedbackNode.gain.value = 0.3;  // Control how much the delayed sound repeats

  delayNode.connect(feedbackNode);
  feedbackNode.connect(delayNode);  // Feedback loop

  const gainNode = audioCtx.createGain()
  delayNode.connect(gainNode);  // hopefully not feedback loop...

  gainNode.connect(audioCtx.destination);
  let wave = generateWav(text)
  // print(wave)
  // let sfx = useSound(wave, {onload: () => { print("hello?.."); sfx.play() }})

  var audio = new Audio();
  audio.src = wave
  audio.volume = 1.0

  const audioSource = audioCtx.createMediaElementSource(audio);

  audio.oncanplay = e => {
    if (hovering.value) {
      audio.play();
      setTimeout(() => { if (hovering.value != id) {gainNode.gain.value = 0} }, 250)
      setTimeout(() => { audioSource.connect(delayNode); }, delayNode.delayTime.value)
    }
  }

  audio.onended = e => {audio.remove()}
}

const hovering = ref("")
</script>

<template>
<div id="whole">
  <p id="header">Modifiers</p>
  <div id="modifier-cont">
    <div class="modifier" v-for="modifier in LastState.modifiers" @mouseleave="hovering = ''" @mouseenter="(_e: MouseEvent) => { hovering = modifier.id; printingSFX.play(); playLittleGuy(modifier.text, modifier.id) }">
      <p>{{ modifier.text }}</p>
      <p class="modifier-type">{{ modifier.type }}</p>
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

#modifier-cont {
  display: flex;
  gap: 15px;
  width: 100%;
  height: calc(100% - 64px);
  padding-top: 32px;
  padding-bottom: 32px;
  flex-wrap: wrap;
  overflow-y: scroll;
  overscroll-behavior-y: auto;
}

.modifier {
  min-width: 150px;
  height: min-content;
  font-size: 28px;
  background: #343434;
  padding: 15px;
  border-radius: 15px;
  scale: 1;
  opacity: 0.5;
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
</style>
