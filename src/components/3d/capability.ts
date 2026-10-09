export function shouldUse3D(env: { webgl: boolean; reducedMotion: boolean; width: number }): boolean {
  return env.webgl && !env.reducedMotion && env.width >= 768;
}

export function detectEnv() {
  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return {
    webgl,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    width: window.innerWidth,
  };
}
