import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getPublicUrl(key: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!publicBaseUrl) {
    return null;
  }

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

function safeFileName(fileName: string, customName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const baseName = (customName || fileName.replace(/\.[^/.]+$/, ""))
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `${baseName || "image"}.${extension}`;
}

function createUniqueObjectName(fileName: string, customName: string) {
  const uniqueId = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  return `${uniqueId}-${safeFileName(fileName, customName)}`;
}

export async function POST(request: Request) {
  const bucket = process.env.R2_BUCKET_NAME;
  const client = getR2Client();

  if (!bucket || !client) {
    return NextResponse.json(
      { error: "R2 환경변수가 아직 설정되지 않았어요. .env.local을 확인해주세요." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const characterId = String(formData.get("characterId") ?? "uncategorized");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const worldId = String(formData.get("worldId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 없어요." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있어요." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "파일 1개는 최대 10MB까지 업로드할 수 있어요." }, { status: 400 });
  }

  const safeCharacterId = characterId.replace(/[^a-zA-Z0-9_-]/g, "-") || "uncategorized";
  const safeWorldId = worldId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const keyPrefix = safeWorldId ? `characters/${safeCharacterId}/worlds/${safeWorldId}` : `characters/${safeCharacterId}`;
  const key = `${keyPrefix}/${createUniqueObjectName(file.name, displayName)}`;
  const body = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return NextResponse.json({
    key,
    name: displayName || file.name.replace(/\.[^/.]+$/, ""),
    size: file.size,
    url: getPublicUrl(key),
  });
}
