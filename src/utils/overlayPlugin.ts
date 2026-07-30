import { callOverlayHandler } from "../../cactbot/resources/overlay_plugin_api";

interface OverlayErrorResponse {
  $error?: string;
}

function isOverlayErrorResponse(obj: unknown): obj is OverlayErrorResponse {
  return typeof obj === "object" && obj !== null && "$error" in obj;
}

export async function openExternalUrl(url: string): Promise<void> {
  let fullUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    fullUrl = `${origin}${pathname}${cleanUrl}`;
  }
  try {
    const res: unknown = await callOverlayHandler({ call: "openWebsiteWithWS", url: fullUrl });
    if (isOverlayErrorResponse(res) && res.$error) {
      throw new Error(res.$error);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    if (isOverlayErrorResponse(error) && error.$error) {
      throw new Error(error.$error);
    }
    throw new Error(String(error));
  }
}

export async function selectNativeDirectory(): Promise<string | undefined> {
  const res = await callOverlayHandler({ call: "cactbotChooseDirectory" });
  return res?.data;
}
