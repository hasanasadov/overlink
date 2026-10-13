import { S3Client, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "node:stream";

const g = globalThis as unknown as { __r2?: S3Client };

function client(): S3Client {
  if (!g.__r2) {
    g.__r2 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return g.__r2;
}

const Bucket = () => process.env.R2_BUCKET || "hasshare";

export async function putStream(key: string, body: Readable, contentType: string) {
  const upload = new Upload({
    client: client(),
    params: { Bucket: Bucket(), Key: key, Body: body, ContentType: contentType },
    queueSize: 3,
    partSize: 16 * 1024 * 1024,
  });
  await upload.done();
}

export async function headObject(key: string): Promise<{ size: number } | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: Bucket(), Key: key }));
    return { size: Number(r.ContentLength ?? 0) };
  } catch {
    return null;
  }
}

export async function signedDownloadUrl(key: string, filename: string, mime: string, inline = false, ttl = 300) {
  const safe = filename.replace(/[\r\n"]/g, "_");
  const disposition = `${inline ? "inline" : "attachment"}; filename="${safe.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: Bucket(),
      Key: key,
      ResponseContentDisposition: disposition,
      ResponseContentType: mime,
    }),
    { expiresIn: ttl },
  );
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: key }));
}

export async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += 500) {
    const chunk = keys.slice(i, i + 500);
    await client().send(
      new DeleteObjectsCommand({ Bucket: Bucket(), Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }),
    );
  }
}
