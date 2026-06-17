import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const MAX_AUDIO_UPLOAD_SIZE = 15 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);

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
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "mp3";
  const baseName = (customName || fileName.replace(/\.[^/.]+$/, ""))
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `${baseName || "bgm"}.${extension}`;
}

function createUniqueObjectName(fileName: string, customName: string) {
  const uniqueId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return `${uniqueId}-${safeFileName(fileName, customName)}`;
}

function isAllowedAudioFile(file: File) {
  if (ALLOWED_AUDIO_TYPES.has(file.type)) {
    return true;
  }

  return /\.(mp3|mpeg|ogg|wav|m4a|aac)$/i.test(file.name);
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
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 없어요." }, { status: 400 });
  }

  if (!isAllowedAudioFile(file)) {
    return NextResponse.json({ error: "mp3, ogg, wav, m4a, aac 오디오만 업로드할 수 있어요." }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_UPLOAD_SIZE) {
    return NextResponse.json({ error: "오디오 파일은 최대 15MB까지 업로드할 수 있어요." }, { status: 400 });
  }

  const key = `audio/site-bgm/${createUniqueObjectName(file.name, displayName)}`;
  const body = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "audio/mpeg";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return NextResponse.json({
    key,
    name: displayName,
    size: file.size,
    url: getPublicUrl(key),
  });
}
