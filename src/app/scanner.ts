// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The receipt/document scanner's plumbing — everything the capture UI
// (`ScanModal`) needs that isn't rendering: opening the camera, grabbing a
// frame, and downscaling/encoding it into the JPEG that becomes the
// document's file. Kept apart from the modal so the pure parts
// (`scanFileName`, `fitWithin`) are unit-testable in node.

/** Camera constraints for scanning paper: the environment-facing camera at a
 *  resolution high enough for OCR to read receipt type. */
export const SCAN_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 2560 },
    height: { ideal: 1440 },
  },
};

/** Is camera capture available at all in this browser context? */
export function isScannerAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/** Longest-edge cap for stored scans. Big enough for OCR and zooming, small
 *  enough that a hundred receipts don't blow up the vault. */
export const SCAN_MAX_EDGE = 2200;

/** Scale (w, h) to fit within `maxEdge` on the longest side, never upscaling.
 *  Returns integral dimensions. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = SCAN_MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The file name a captured scan is stored under. */
export function scanFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `scan-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`
  );
}

/** Grab the current video frame, downscale it to the storage cap, and encode
 *  as JPEG. Browser-only (canvas). */
export async function captureFrame(
  video: HTMLVideoElement,
  quality = 0.9,
): Promise<Blob> {
  const { width, height } = fitWithin(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("scanner: 2d canvas unavailable");
  ctx.drawImage(video, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("scanner: frame encode failed");
  return blob;
}

/** Stop every track of a stream (camera off, light out). */
export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
