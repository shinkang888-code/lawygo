/**
 * 사건 자료실 파일 저장소 추상화
 * Drive 연동 시 API 호출, 미연동 시 local(blob) fallback
 */

const UPLOAD_PATH = "/api/drive/upload";
const DOWNLOAD_PATH = "/api/drive/download";

export type StorageMode = "drive" | "local";

export interface DriveUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
}

/**
 * Drive에 파일 업로드
 * @returns Drive 메타 또는 null (실패/미연동)
 */
export async function uploadCaseFileToDrive(
  caseId: string,
  file: File,
  folderPath = `cases/${caseId}/files`
): Promise<DriveUploadResult | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folderPath", folderPath);

  const res = await fetch(UPLOAD_PATH, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = (json.error as string) || res.statusText;
    throw new Error(msg);
  }

  const data = (await res.json()) as DriveUploadResult;
  return data;
}

/**
 * Drive 파일을 Blob URL로 가져와 뷰어에서 사용
 */
export async function getDriveFileBlobUrl(fileId: string): Promise<string> {
  const res = await fetch(`${DOWNLOAD_PATH}/${fileId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = (json.error as string) || res.statusText;
    throw new Error(msg);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
