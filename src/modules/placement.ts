export const PLACEMENT_COLORS = [
  "#ffcb11",
  "#CBFFFE",
  "#e45400"
]

export function numSuffix(num: number) {
  const suffixes = ["st", "nd", "rd", "th"]
  let last_digit = Number(String(num).split("").splice(-1, 1))
  // print(last_digit)
  // 10th, 11th, 12th, 13th, 14th, 15th, 16th, 17th, 18th, 19th, 20th, 21st

  return suffixes.find((suffix, ind) => {
    switch(suffix) {
      case "st":
        return (last_digit == 1 && (num < 9 || num > 20))
      break;
      case "nd":
        return (last_digit == 2 && (num < 9 || num > 20))
      break;
      case "rd":
        return (last_digit == 3 && (num < 9 || num > 20))
      break;
      default:
        return true
    }
  })
}