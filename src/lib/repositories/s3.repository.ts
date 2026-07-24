import api from "../services/api";
import axios from "axios";

export interface S3UploadResult {
  url: string;
  name: string;
}

export const uploadFileToS3 = async (file: File): Promise<S3UploadResult> => {
  // 1. Get presigned upload URL from FastAPI backend
  const presignedRes = await api.post<{ upload_url: string; key: string }>(
    "/api/s3/presigned",
    {
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
    }
  );

  const { upload_url, key } = presignedRes.data;

  // 2. Upload file directly to AWS S3 using presigned PUT URL
  await axios.put(upload_url, file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  return {
    url: key,
    name: file.name,
  };
};

export const getPresignedDownloadUrl = async (key: string): Promise<string> => {
  const res = await api.get<{ download_url: string }>("/api/s3/presigned-download", {
    params: { key },
  });
  return res.data.download_url;
};
