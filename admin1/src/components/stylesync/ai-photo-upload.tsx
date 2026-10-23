"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RefreshCw, Sparkles, X, AlertCircle, Check } from "lucide-react";
import { useAiPhotoStore, type CapturedImage } from "@/lib/ai-photo-store";
import { useAppStore } from "@/lib/salon-store";
import { cn } from "@/lib/utils";

type Mode = "choose" | "camera" | "preview";
type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unsupported"
  | "error";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Convert a Blob/File into a CapturedImage object (object URL + base64).
 * Cleans up the previous object URL via the store's setCapturedImage.
 */
async function blobToCapturedImage(blob: Blob, name: string): Promise<CapturedImage> {
  const url = URL.createObjectURL(blob);
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    url,
    base64,
    name,
    size: blob.size,
    type: blob.type || "image/jpeg",
  };
}

export function AiPhotoUploadSheet() {
  const {
    photoSheetOpen,
    closePhotoSheet,
    capturedImage,
    setCapturedImage,
    startAnalysis,
    setAnalysisResult,
    setAnalysisError,
    resetAnalysis,
  } = useAiPhotoStore();
  const setView = useAppStore((s) => s.setView);

  const [mode, setMode] = useState<Mode>("choose");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedLength, setSelectedLength] = useState("Any");
  const [selectedStyle, setSelectedStyle] = useState("Signature Haircut");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to stop the camera stream tracks (does NOT call setState, safe in effects)
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera using getUserMedia
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraStatus("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraError("Your device does not support camera access. Please upload a photo instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Required for iOS Safari
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus("active");
    } catch (err: unknown) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        setCameraStatus("denied");
        setCameraError("Camera access was denied. You can upload a photo from your gallery instead.");
      } else if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") {
        setCameraStatus("unsupported");
        setCameraError("No camera found on this device. Please upload a photo instead.");
      } else {
        setCameraStatus("error");
        setCameraError(e?.message || "Could not access camera. Please try uploading instead.");
      }
    }
  }, []);

  // Capture a frame from the video stream to a canvas, then to a blob
  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 960;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) {
      setFileError("Could not capture photo. Please try again.");
      return;
    }
    const img = await blobToCapturedImage(blob, "captured.jpg");
    setCapturedImage(img);
    setMode("preview");
    stopCamera();
  }, [setCapturedImage, stopCamera]);

  // Handle file upload from gallery
  const handleFileSelect = useCallback(async (file: File) => {
    setFileError(null);

    if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
      setFileError("Unsupported image. Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setFileError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 8 MB.`);
      return;
    }

    try {
      const img = await blobToCapturedImage(file, file.name);
      setCapturedImage(img);
      setMode("preview");
    } catch {
      setFileError("Could not read the selected image. Please try another file.");
    }
  }, [setCapturedImage]);

  // Trigger AI analysis (calls /api/style-analyze)
  const analyzePhoto = useCallback(async (text?: string, preferences?: Record<string, string>) => {
    const captured = useAiPhotoStore.getState().capturedImage;
    if (!captured) return;
    const reqId = startAnalysis();
    try {
      const res = await fetch("/api/style-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: captured.base64, text, preferences }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        useAiPhotoStore.getState().setAnalysisError(reqId, data?.error || "AI analysis failed. Please try again.");
        return;
      }
      useAiPhotoStore.getState().setAnalysisResult(reqId, data.recommendations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please retry.";
      useAiPhotoStore.getState().setAnalysisError(reqId, msg);
    }
  }, [startAnalysis]);

  // Clean up camera + object URLs when sheet closes
  useEffect(() => {
    if (!photoSheetOpen) {
      stopCamera();
      // Reset to choose mode for next open (but keep captured image if user reopens)
      setTimeout(() => setMode(capturedImage ? "preview" : "choose"), 200);
    }
  }, [photoSheetOpen, stopCamera, capturedImage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Sheet
      open={photoSheetOpen}
      onOpenChange={(o) => {
        if (!o) {
          stopCamera();
          closePhotoSheet();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="teal-theme mx-auto max-w-2xl overflow-y-auto p-0 sm:rounded-t-3xl"
      >
        <SheetHeader className="border-b border-border bg-secondary/40 p-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary" suppressHydrationWarning />
            StyleSync AI · Photo Analysis
          </SheetTitle>
          <SheetDescription className="text-xs">
            Take a photo or upload one. We will analyze it and recommend salon services that
            may suit your preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          {/* ============ CHOOSE MODE (initial) ============ */}
          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setMode("camera");
                  // start camera after video element renders
                  setTimeout(startCamera, 100);
                }}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary">
                  <Camera className="h-6 w-6" suppressHydrationWarning />
                </div>
                <div className="flex-1">
                  <div className="text-base font-semibold text-foreground">Take Photo</div>
                  <div className="text-xs text-muted-foreground">
                    Uses your device camera. Will request permission.
                  </div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary">
                  <Upload className="h-6 w-6" suppressHydrationWarning />
                </div>
                <div className="flex-1">
                  <div className="text-base font-semibold text-foreground">Upload from Gallery</div>
                  <div className="text-xs text-muted-foreground">JPG, PNG or WEBP · up to 8 MB</div>
                </div>
              </button>

              {fileError && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" suppressHydrationWarning />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="rounded-xl bg-secondary/40 p-3 text-[11px] text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Your photo is used only to
                provide personalized StyleSync recommendations and is sent to the StyleSync AI
                analysis endpoint. It is not stored permanently.
              </div>
            </div>
          )}

          {/* ============ CAMERA MODE ============ */}
          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  className={cn(
                    "h-full w-full object-cover",
                    cameraStatus !== "active" && "hidden"
                  )}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {cameraStatus !== "active" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                    {cameraStatus === "requesting" && (
                      <>
                        <RefreshCw className="h-8 w-8 animate-spin text-white/80" suppressHydrationWarning />
                        <p className="text-sm">Requesting camera permission…</p>
                      </>
                    )}
                    {(cameraStatus === "denied" ||
                      cameraStatus === "unsupported" ||
                      cameraStatus === "error") && (
                      <>
                        <AlertCircle className="h-10 w-10 text-amber-400" suppressHydrationWarning />
                        <p className="text-sm max-w-xs">{cameraError}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" suppressHydrationWarning />
                          Upload from Gallery instead
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    stopCamera();
                    setMode("choose");
                  }}
                >
                  <X className="mr-1 h-4 w-4" suppressHydrationWarning /> Cancel
                </Button>

                {cameraStatus === "active" && (
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={capturePhoto}
                  >
                    <Camera className="mr-2 h-4 w-4" suppressHydrationWarning /> Capture Photo
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ============ PREVIEW MODE ============ */}
          {mode === "preview" && capturedImage && (
            <div className="space-y-3">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
                <img
                  src={capturedImage.url}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Photo Quality Guidelines */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-foreground/85">
                <div className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Photo Quality Tips for Best AI Results
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Well-lit, frontal portrait with your face and hair clearly visible</li>
                  <li>Avoid heavy sunglasses, face masks, or strong backlighting</li>
                  <li>Neutral expression produces the most realistic hairstyle try-on</li>
                </ul>
              </div>

              {/* Hairstyle Preferences Selector */}
              <div className="space-y-2 rounded-xl border border-border/70 p-3 bg-secondary/20">
                <div className="text-xs font-semibold text-foreground">Target Hairstyle Preferences</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Hair Length</label>
                    <select
                      value={selectedLength}
                      onChange={(e) => setSelectedLength(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Any">Any Length</option>
                      <option value="Short">Short Hair (Crop, Fade, Taper)</option>
                      <option value="Medium">Medium Hair (Quiff, Textured, Bob)</option>
                      <option value="Long">Long Hair (Layered, Waves)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Desired Cut / Treatment</label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Signature Haircut">Classic / Signature Haircut</option>
                      <option value="Skin Fade">Mid / High Skin Fade</option>
                      <option value="Classic Taper">Clean Classic Taper</option>
                      <option value="Textured Quiff">Modern Textured Quiff</option>
                      <option value="Hair Spa & Wash">Nourishing Hair Spa</option>
                      <option value="Global Colour">Global Hair Colour</option>
                      <option value="Highlights">Balayage / Highlights</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Explicit Consent & Privacy Retention Notice */}
              <div className="rounded-xl border border-border/80 bg-background p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-[11px] leading-relaxed text-foreground/90">
                    <span className="font-semibold text-foreground">I consent to StyleSync AI processing my photo</span> for virtual hairstyle simulation and salon matching. Photos are encrypted during transit, never shared publicly, and subject to StyleSync&apos;s 24-hour privacy retention policy.
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setCapturedImage(null);
                    setMode("choose");
                    setConsentGiven(false);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" suppressHydrationWarning /> Retake / Replace
                </Button>
                <Button
                  size="sm"
                  disabled={!consentGiven}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    closePhotoSheet();
                    setView("ai");
                    const textInput = (document.querySelector("[data-ai-text-input]") as HTMLInputElement | null)?.value;
                    const combinedText = [textInput, `Target length: ${selectedLength}`, `Desired style: ${selectedStyle}`].filter(Boolean).join(". ");
                    void analyzePhoto(combinedText, { length: selectedLength, style: selectedStyle });
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" suppressHydrationWarning /> Generate AI Hairstyles
                </Button>
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                AI visualizations are simulations to preview aesthetics. Actual salon outcomes may vary based on hair texture and professional stylist consultation.
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
            e.target.value = "";
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
