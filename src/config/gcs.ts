export type GcsConfig = {
  bucket: string;
  credentials: Record<string, unknown>;
};

export const getGcsConfigFromEnv = (): GcsConfig => {
  const bucket = process.env.GCS_BUCKET_RESORT;
  const rawCredentials = process.env.GOOGLE_CLOUD_STORAGE_CREDENTIALS;

  if (!bucket) throw new Error("GCS_BUCKET_RESORT no está definido");
  if (!rawCredentials) throw new Error("GOOGLE_CLOUD_STORAGE_CREDENTIALS no está definido");

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(rawCredentials);
  } catch {
    throw new Error("GOOGLE_CLOUD_STORAGE_CREDENTIALS no es un JSON válido");
  }

  return { bucket, credentials };
};
