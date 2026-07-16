import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  // Set AWS_ENDPOINT_URL to point at LocalStack for local development
  ...(process.env.AWS_ENDPOINT_URL ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true } : {}),
});

export async function fetchFromS3(bucket: string, key: string): Promise<Buffer> {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!Body) throw new Error(`Empty body for s3://${bucket}/${key}`);
  const parts: Uint8Array[] = [];
  for await (const chunk of Body as AsyncIterable<Uint8Array>) parts.push(chunk);
  return Buffer.concat(parts);
}
