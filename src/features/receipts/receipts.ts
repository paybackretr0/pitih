import { Directory, File, Paths } from "expo-file-system";

export const RECEIPTS_DIRECTORY = "receipts";

function receiptDirectory(): Directory {
  return new Directory(Paths.document, RECEIPTS_DIRECTORY);
}

function extensionOf(uri: string): string {
  const match = /\.([a-z0-9]+)(?:\?|$)/i.exec(uri.split("/").pop() ?? "");
  const extension = match?.[1]?.toLowerCase();
  if (
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "png" ||
    extension === "webp"
  ) {
    return extension;
  }
  return "jpg";
}

/**
 * The picker hands back a cache URI that Android may clear. Copying into the
 * app's document directory keeps the receipt attached to the transaction.
 */
export async function storeReceipt(sourceUri: string): Promise<string> {
  const directory = receiptDirectory();
  if (!directory.exists)
    directory.create({ intermediates: true, idempotent: true });

  const file = new File(
    directory,
    `receipt-${Date.now()}.${extensionOf(sourceUri)}`,
  );
  await new File(sourceUri).copy(file);
  return file.uri;
}

export function deleteReceipt(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone, or the URI belongs to another app.
  }
}

export function clearReceipts(): void {
  try {
    const directory = receiptDirectory();
    if (directory.exists) directory.delete();
  } catch {
    // Nothing to clean up.
  }
}
