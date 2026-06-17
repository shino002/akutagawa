import type { UploadedImage } from "@/lib/types";

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export function subPageUploadCharacterId(parentCharacterId: string, subPageId: string) {
  return `subpage-${parentCharacterId}-${subPageId}`;
}

export async function deleteR2Images(images: UploadedImage[]) {
  if (images.length === 0) return;

  const response = await fetch("/api/r2-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ images }),
  });
  const result = (await response.json()) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error ?? "Cloudflare R2 삭제에 실패했어요.");
  }
}

export async function uploadImageToR2(
  file: File,
  characterId: string,
  options?: {
    displayName?: string;
    worldId?: string;
    category?: "illustration" | "standing";
  },
): Promise<UploadedImage> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`${file.name}은 10MB를 넘어서 업로드할 수 없어요.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("characterId", characterId);
  formData.append("displayName", options?.displayName?.trim() ?? "");
  if (options?.worldId) {
    formData.append("worldId", options.worldId);
  }

  const response = await fetch("/api/r2-upload", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as {
    error?: string;
    key?: string;
    name?: string;
    size?: number;
    url?: string | null;
  };

  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "R2 업로드에 실패했어요.");
  }

  return {
    id: result.key ?? `${file.name}-${file.lastModified}`,
    category: options?.category ?? "illustration",
    name: result.name ?? "",
    url: result.url,
    size: result.size ?? file.size,
  };
}
