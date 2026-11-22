const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.82;

/** The size that fits within `maxSide` on both sides, keeping the shape. Never enlarges. */
export function fitWithin(width: number, height: number, maxSide = MAX_SIDE_PX) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Redraws a phone photo as a smaller JPG before upload, so customers on mobile data load it fast.
 * Redrawing also drops hidden details such as where the photo was taken.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't draw images");
  context.fillStyle = "#fff"; // a PNG's see-through parts would otherwise turn black
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("This browser can't save images");
  const name = `${file.name.replace(/\.[^.]*$/, "")}.jpg`;
  return new File([blob], name, { type: "image/jpeg" });
}
