"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, Camera } from "lucide-react";

export default function ReceiptScanner({ onParsed, onError }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  function openFileDialog() {
    if (inputRef.current) inputRef.current.click();
  }

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewSrc(URL.createObjectURL(file));
    await uploadAndParse(file);
    e.target.value = "";
  }

  async function uploadAndParse(file) {
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("image", file);

      console.debug("Uploading receipt:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const resp = await fetch("/api/parse-receipt", {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const body = await resp.text();
        const msg = `Failed (${resp.status}): ${body || resp.statusText}`;
        console.error(msg);
        onError?.(msg);
        return;
      }

      const parsed = await resp.json();
      console.debug("Parsed receipt:", parsed);
      onParsed?.(parsed);

    } catch (err) {
      console.error("Upload error:", err);
      onError?.(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
          capture="environment"
        />

        <Button
          type="button"
          variant="outline"
          onClick={openFileDialog}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Take Photo / Upload Receipt
            </>
          )}
        </Button>
      </div>

      {previewSrc && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border">
            <Image
              src={previewSrc}
              alt="receipt preview"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        💡 Good lighting and flat receipt work best.
      </div>
    </div>
  );
}
