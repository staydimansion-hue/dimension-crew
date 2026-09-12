import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "task-photos";
let bucketEnsured = false;

async function ensureBucket() {
  if (bucketEnsured) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  }
  bucketEnsured = true;
}

export async function uploadTaskPhoto(
  roomTaskId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await ensureBucket();
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `${roomTaskId}/${Date.now()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function getPhotoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteTaskPhoto(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
