/**
 * Google Drive API 클라이언트 (서버 전용)
 * 사건 자료실, 메신저 첨부, 결재 자료실 파일 저장
 */

import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

let auth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

async function getAuth(): Promise<InstanceType<typeof google.auth.GoogleAuth> | null> {
  if (auth) return auth;

  const b64 = process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64?.trim();
  if (!b64) return null;

  try {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const credentials = JSON.parse(json) as { client_email?: string; private_key?: string };
    if (!credentials.client_email || !credentials.private_key) return null;

    const authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    auth = authClient;
    return auth;
  } catch {
    return null;
  }
}

export async function getDriveClient() {
  const authClient = await getAuth();
  if (!authClient) return null;
  return google.drive({ version: "v3", auth: authClient });
}

const ROOT_NAME = "LawyGo";

/** 루트 폴더 ID 조회/생성 */
export async function getOrCreateRootFolder(drive: Awaited<ReturnType<typeof getDriveClient>>): Promise<string | null> {
  if (!drive) return null;

  const { data } = await drive.files.list({
    q: `name='${ROOT_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: "drive",
    fields: "files(id,name)",
  });
  if (data.files?.length) return data.files[0].id ?? null;

  const { data: created } = await drive.files.create({
    requestBody: {
      name: ROOT_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });
  return created.id ?? null;
}

/** 경로별 폴더 ID 조회/생성 (예: Cases/123/files, Messenger/attachments, Approval/doc1) */
export async function getOrCreateFolder(
  drive: Awaited<ReturnType<typeof getDriveClient>>,
  path: string
): Promise<string | null> {
  if (!drive) return null;

  const rootId = await getOrCreateRootFolder(drive);
  if (!rootId) return null;

  const segments = path.split("/").filter(Boolean);
  let parentId = rootId;

  for (const segment of segments) {
    const { data } = await drive.files.list({
      q: `name='${segment.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: "drive",
      fields: "files(id,name)",
    });
    let folderId = data.files?.[0]?.id;
    if (!folderId) {
      const { data: created } = await drive.files.create({
        requestBody: {
          name: segment,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
      });
      folderId = created.id ?? null;
    }
    if (!folderId) return null;
    parentId = folderId;
  }
  return parentId;
}

/** 업로드 결과 */
export interface DriveUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
}

/** 파일 업로드 (버퍼) */
export async function uploadFile(
  drive: Awaited<ReturnType<typeof getDriveClient>>,
  folderPath: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<DriveUploadResult | null> {
  if (!drive) return null;

  const parentId = await getOrCreateFolder(drive, folderPath);
  if (!parentId) return null;

  const { data } = await drive.files.create({
    requestBody: {
      name: sanitizeFileName(fileName),
      parents: [parentId],
      mimeType: mimeType || "application/octet-stream",
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: buffer,
    },
    fields: "id,name,mimeType,size,webViewLink",
  });

  if (!data.id) return null;
  return {
    fileId: data.id,
    name: data.name ?? fileName,
    mimeType: data.mimeType ?? mimeType,
    size: data.size ? Number(data.size) : undefined,
    webViewLink: data.webViewLink ?? undefined,
  };
}

/** 파일 다운로드용 버퍼 (스트림을 버퍼로 수집) */
export async function getFileBuffer(
  drive: Awaited<ReturnType<typeof getDriveClient>>,
  fileId: string
): Promise<{ buffer: Buffer; mimeType?: string; fileName?: string } | null> {
  if (!drive) return null;

  const { data: meta } = await drive.files.get({
    fileId,
    fields: "name,mimeType",
  }).catch(() => ({ data: null }));

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  ).catch(() => null);

  if (!res?.data) return null;

  const chunks: Buffer[] = [];
  const stream = res.data as import("stream").Readable;
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    buffer: Buffer.concat(chunks),
    mimeType: meta?.mimeType ?? undefined,
    fileName: meta?.name ?? undefined,
  };
}

/** 파일명 경로 구분자 제거 (path traversal 방지) */
function sanitizeFileName(name: string): string {
  return (name || "file")
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim() || "file";
}

/** Drive 연동 가능 여부 */
export async function isDriveAvailable(): Promise<boolean> {
  const drive = await getDriveClient();
  return drive != null;
}
