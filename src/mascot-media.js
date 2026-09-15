// Add local alpha-video paths here when the final character clips are available.
export const MASCOT_CLIPS = Object.freeze({
 idle: '', confused: '', open: '', updown: '', twist: '', celebrate: ''
});
export function createMascotMedia(video, fallback, clips = MASCOT_CLIPS) {
 let current = '', revision = 0;
 function restore() { video.hidden = true; fallback.hidden = false; }
 async function ready() {
  const token = revision;
  if (!current) return;
  try {
   await video.play();
   if (token === revision && current) { video.hidden = false; fallback.hidden = true; }
  } catch { if (token === revision) restore(); }
 }
 video.addEventListener('loadeddata', ready);
 video.addEventListener('error', restore);
 return {
  setMode(mode) {
   video.dataset.mode = mode;
   const next = clips[mode] || '';
   if (next === current) return;
   revision++; current = next; video.pause(); restore();
   if (next) video.src = next;
   else video.removeAttribute('src');
   video.load();
  },
  dispose() {
   revision++; current = ''; video.pause(); restore();
   video.removeEventListener('loadeddata', ready);
   video.removeEventListener('error', restore);
   video.removeAttribute('src'); video.load();
  }
 };
}
