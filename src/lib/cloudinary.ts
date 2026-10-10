import { v2 as cloudinary } from "cloudinary";
import { ServiceUnavailableError } from "@/lib/errors";

/**
 * Re-created locally following the pattern read (read-only) from
 * c:\Users\GermanDarioArbelaez\Documents\project-agent\expense-tracker-ocr\src\lib\cloudinary.ts
 * — not imported across repos.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a receipt image to Cloudinary and returns its secure URL.
 *
 * CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are placeholders in .env until
 * real credentials are provided — detect that up front and throw a typed
 * ServiceUnavailableError the caller (POST /api/receipts/scan) turns into a
 * clean 503, instead of letting the Cloudinary SDK fail unpredictably.
 */
export async function uploadReceipt(buffer: Buffer, mimeType: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || cloudName === "your-cloud-name") {
    throw new ServiceUnavailableError("CLOUDINARY_CLOUD_NAME no configurada");
  }

  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "ledger-ocr/receipts",
    resource_type: "image",
  });

  return result.secure_url;
}
