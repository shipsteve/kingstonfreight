export function shouldUse3D(env: { webgl: boolean; reducedMotion: boolean; width: number }): boolean {
  return env.webgl && !env.reducedMotion && env.width >= 768;
}

/** Cheap checks first: probing WebGL creates a GPU context, which is slow on low-end phones, so skip it when 3D is ruled out anyway. */
export function detectEnv() {
  const width = window.innerWidth;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || width < 768) return { webgl: false, reducedMotion, width };
  return { webgl: probeWebGL(), reducedMotion, width };
}

function probeWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
