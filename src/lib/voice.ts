import i18n from "../i18n";

export function encodeWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((char, i) =>
      view.setUint8(offset + i, char.charCodeAt(0)),
    );
  text(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      44 + i * 2,
      Math.round(value * (value < 0 ? 32768 : 32767)),
      true,
    );
  });
  return bytes;
}
export async function recordVoice(
  signal: AbortSignal,
  releaseSignal: AbortSignal,
): Promise<string> {
  if (
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia ||
    !window.MediaRecorder
  )
    throw new Error(i18n.t("voiceErrors.unsupported"));
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true },
    video: false,
  });
  let audioContext: AudioContext | undefined;
  try {
    if (signal.aborted) throw new Error(i18n.t("voiceErrors.cancelled"));
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ].find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      const parts: Blob[] = [];
      let size = 0;
      const abort = () => {
        if (recorder.state !== "inactive") recorder.stop();
        reject(new Error(i18n.t("voiceErrors.cancelled")));
      };
      const release = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };
      const timer = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 6000);
      const clean = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        releaseSignal.removeEventListener("abort", release);
      };
      signal.addEventListener("abort", abort, { once: true });
      releaseSignal.addEventListener("abort", release, { once: true });
      recorder.ondataavailable = (event) => {
        size += event.data.size;
        if (size > 1000000) {
          abort();
          return;
        }
        parts.push(event.data);
      };
      recorder.onstop = () => {
        clean();
        if (signal.aborted) reject(new Error(i18n.t("voiceErrors.cancelled")));
        else resolve(new Blob(parts, { type: recorder.mimeType }));
      };
      recorder.onerror = () => {
        clean();
        reject(new Error(i18n.t("voiceErrors.permission")));
      };
      recorder.start(250);
      if (releaseSignal.aborted) queueMicrotask(release);
    });
    stream.getTracks().forEach((track) => track.stop());
    if (signal.aborted) throw new Error(i18n.t("voiceErrors.cancelled"));
    if (!blob.size) throw new Error(i18n.t("voiceErrors.tooShort"));
    audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(
      await blob.arrayBuffer(),
    );
    const duration = Math.min(decoded.duration, 6);
    if (duration < 0.1) throw new Error(i18n.t("voiceErrors.tooShort"));
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(duration * 16000),
      16000,
    );
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const wav = encodeWav((await offline.startRendering()).getChannelData(0));
    if (signal.aborted) throw new Error(i18n.t("voiceErrors.cancelled"));
    let binary = "";
    for (let i = 0; i < wav.length; i += 8192)
      binary += String.fromCharCode(...wav.subarray(i, i + 8192));
    return btoa(binary);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    await audioContext?.close();
  }
}
