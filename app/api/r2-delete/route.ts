import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

type DeleteImageInput = {
  id?: string;
  url?: string;
};

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

function keyFromUrl(url: string) {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

  if (publicBaseUrl && url.startsWith(`${publicBaseUrl}/`)) {
    return decodeURIComponent(url.slice(publicBaseUrl.length + 1));
  }

  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    return "";
  }
}

function resolveKey(image: DeleteImageInput) {
  if (image.id?.includes("/")) {
    return image.id;
  }

  if (image.url) {
    return keyFromUrl(image.url);
  }

  return "";
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

  const body = (await request.json()) as {
    images?: DeleteImageInput[];
    keys?: string[];
  };
  const keys = Array.from(
    new Set([
      ...(body.keys ?? []),
      ...(body.images ?? []).map(resolveKey),
    ].filter(Boolean)),
  );

  if (keys.length === 0) {
    return NextResponse.json({ deleted: [] });
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    }),
  );

  return NextResponse.json({ deleted: keys });
}
