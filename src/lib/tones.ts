export const tones = ["blue", "green", "red", "violet", "orange"] as const;

export function toneAt(index: number) {
  return tones[index % tones.length] ?? "blue";
}
