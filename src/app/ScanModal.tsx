// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The built-in receipt/document scanner: a camera preview, a capture button,
// and a confirm step. On "Use scan" the captured JPEG becomes a new document
// in the active category with the frame attached; the caller then opens the
// editor, where the OCR button (`DocumentModal`) extracts the searchable
// text. The heavy lifting (constraints, frame grab, downscale) lives in
// `scanner.ts` so it stays testable.

import { useEffect, useRef, useState } from "react";

import { Button, Modal } from "@niclaslindstedt/oss-framework/components";

import { useT } from "./i18n/index.ts";
import {
  SCAN_CAMERA_CONSTRAINTS,
  captureFrame,
  isScannerAvailable,
  scanFileName,
  stopStream,
} from "./scanner.ts";
import { warn } from "../output.ts";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Hand back the captured JPEG; the app turns it into a document. */
  onCaptured: (blob: Blob, fileName: string) => void;
};

export function ScanModal({ open, onClose, onCaptured }: Props) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<Blob | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);

  // Open/close the camera with the modal.
  useEffect(() => {
    if (!open || !isScannerAvailable()) return;
    let cancelled = false;
    void navigator.mediaDevices
      .getUserMedia(SCAN_CAMERA_CONSTRAINTS)
      .then((stream) => {
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch((e) => warn(`Scanner: camera unavailable (${String(e)})`));
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      setReady(false);
      setShot(null);
    };
  }, [open]);

  // Keep an object URL for the confirm preview, and revoke it after.
  useEffect(() => {
    if (!shot) {
      setShotUrl(null);
      return;
    }
    const url = URL.createObjectURL(shot);
    setShotUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shot]);

  const capture = async () => {
    if (!videoRef.current) return;
    setShot(await captureFrame(videoRef.current));
  };

  const use = () => {
    if (!shot) return;
    onCaptured(shot, scanFileName(new Date()));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="scan-modal-title">
      <div className="flex flex-col gap-3 p-4">
        <h2
          id="scan-modal-title"
          className="text-base font-semibold text-fg-bright"
        >
          {t("scan.title")}
        </h2>

        {!isScannerAvailable() ? (
          <p className="text-sm text-muted">{t("scan.unavailable")}</p>
        ) : shot && shotUrl ? (
          <img
            src={shotUrl}
            alt=""
            className="max-h-[60vh] w-full rounded-md border border-line object-contain"
          />
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full rounded-md border border-line bg-black"
            />
            {!ready && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                {t("scan.starting")}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {shot ? (
            <>
              <Button variant="secondary" onClick={() => setShot(null)}>
                {t("scan.retake")}
              </Button>
              <Button variant="primary" onClick={use}>
                {t("scan.use")}
              </Button>
            </>
          ) : (
            isScannerAvailable() && (
              <Button
                variant="primary"
                onClick={() => void capture()}
                disabled={!ready}
              >
                {t("scan.capture")}
              </Button>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
