import os
import re
import time
import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import SQLModel
import boto3
from botocore.config import Config

from app.models import User
from app.services.auth.dependencies import get_current_user

router = APIRouter(tags=["S3 Storage"])


class PresignedUrlRequest(SQLModel):
    file_name: str
    file_type: str


class PresignedUrlResponse(SQLModel):
    upload_url: str
    key: str


def get_s3_client():
    aws_region = os.getenv("AWS_REGION") or "us-east-1"
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    if not aws_access_key or not aws_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS S3 credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are not configured on server",
        )

    return boto3.client(
        "s3",
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        config=Config(signature_version="s3v4"),
    )


@router.post(
    "/api/s3/presigned",
    response_model=PresignedUrlResponse,
    summary="Get S3 presigned upload URL",
    description="Generates a presigned URL for uploading a file directly to AWS S3.",
)
def get_upload_presigned_url(
    data: PresignedUrlRequest,
    current_user: User = Depends(get_current_user),
):
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    if not bucket_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS_BUCKET_NAME environment variable is not configured",
        )

    sanitized_name = re.sub(r"[^a-zA-Z0-9.-]", "_", data.file_name)
    random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    unique_key = f"terms/{int(time.time() * 1000)}_{random_str}_{sanitized_name}"

    try:
        s3_client = get_s3_client()
        upload_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket_name,
                "Key": unique_key,
                "ContentType": data.file_type,
            },
            ExpiresIn=3600,
        )
        return PresignedUrlResponse(upload_url=upload_url, key=unique_key)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned upload URL: {str(e)}",
        )


@router.get(
    "/api/s3/presigned-download",
    summary="Get S3 presigned download URL",
    description="Generates a presigned GET URL for viewing or downloading a private S3 object.",
)
def get_download_presigned_url(
    key: str,
    current_user: User = Depends(get_current_user),
):
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    if not bucket_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS_BUCKET_NAME environment variable is not configured",
        )

    # Clean up key if full URL passed
    if key.startswith("http://") or key.startswith("https://"):
        try:
            from urllib.parse import urlparse, unquote
            parsed = urlparse(key)
            key = unquote(parsed.path.lstrip("/"))
        except Exception:
            pass

    try:
        s3_client = get_s3_client()
        download_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": bucket_name,
                "Key": key,
            },
            ExpiresIn=3600,
        )
        return {"download_url": download_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned download URL: {str(e)}",
        )


def delete_s3_file(key_or_url: str):
    bucket_name = os.getenv("AWS_BUCKET_NAME")
    if not bucket_name or not key_or_url:
        return

    key = key_or_url
    if key_or_url.startswith("http://") or key_or_url.startswith("https://"):
        try:
            from urllib.parse import urlparse, unquote
            parsed = urlparse(key_or_url)
            key = unquote(parsed.path.lstrip("/"))
        except Exception:
            pass

    try:
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=bucket_name, Key=key)
    except Exception as e:
        print(f"Warning: Failed to delete S3 object '{key}': {e}")

