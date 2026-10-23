import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { readBackupPayload, readTransactionsForCsv } from "@/db/backup";
import {
  backupFileName,
  parseBackupJson,
  serializeBackup,
  type ParsedBackup,
} from "./backup-format";
import { csvFileName, transactionsToCsv } from "./csv";

async function writeAndShare(
  fileName: string,
  contents: string,
  options: { mimeType: string; UTI: string; dialogTitle: string },
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Perangkat ini tidak punya menu berbagi file.");
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(contents);
  await Sharing.shareAsync(file.uri, options);
}

export async function exportBackupJson(): Promise<void> {
  const payload = await readBackupPayload();
  await writeAndShare(backupFileName(), serializeBackup(payload), {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Simpan backup PITIH",
  });
}

export async function exportTransactionsCsv(): Promise<void> {
  const rows = await readTransactionsForCsv();
  await writeAndShare(csvFileName(), transactionsToCsv(rows), {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Simpan transaksi PITIH",
  });
}

/** Returns null when the user closes the picker without choosing a file. */
export async function pickBackupJson(): Promise<ParsedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;
  const text = await new File(asset.uri).text();
  return parseBackupJson(text);
}
