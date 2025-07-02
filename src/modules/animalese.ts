import animaleseAudio from "../assets/sfx/animalese.wav"

const synth = new Animalese(animaleseAudio, () => {
  print("heeheehaaahaaa")
})

export function generateWav(text: string) {
    let wow = synth.Animalese(text, false, 0.5)
    return wow.dataURI;
}