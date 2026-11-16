"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/tracking";

export function AttributionListener() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}

