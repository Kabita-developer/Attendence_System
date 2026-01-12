"use client";

import { env } from "@/lib/env";
import { getToken } from "@/lib/token";

export async function downloadFromApi(path: string, filename: string) {
  const url = `${env.apiBaseUrl}${path.startsWith("/api") ? path : `/api${path}`}`;
  const headers = new Headers();
  
  const token = getToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  
  const res = await fetch(url, { 
    headers,
    credentials: "include" 
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Download failed (${res.status}): ${errorText || res.statusText}`);
  }
  
  const blob = await res.blob();

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}


