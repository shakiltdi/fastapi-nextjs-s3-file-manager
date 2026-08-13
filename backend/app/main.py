import re
import uuid
from pathlib import PurePosixPath

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .config import settings
from .s3 import (
    create_upload_url,
    delete_object,
    get_object,
    list_objects,
    object_exists,
)


app = FastAPI(
    title="Private S3 File API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class UploadRequest(BaseModel):
    filename: str = Field(
        min_length=1,
        max_length=255,
    )

    content_type: str = Field(
        min_length=1,
        max_length=255,
    )


class DeleteRequest(BaseModel):
    key: str = Field(
        min_length=1,
    )


def safe_filename(filename: str) -> str:

    name = PurePosixPath(
        filename.replace("\\", "/")
    ).name

    name = re.sub(
        r"[^A-Za-z0-9._-]",
        "_",
        name,
    )

    return name[:255] or "file"


def validate_key(key: str):

    if not key.startswith("uploads/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid object key",
        )

    if ".." in key:
        raise HTTPException(
            status_code=400,
            detail="Invalid object key",
        )

    return key


@app.get("/health")
def health():

    return {
        "status": "ok"
    }


# --------------------------------
# Upload
# --------------------------------

@app.post("/api/files/upload-url")
def upload_url(
    payload: UploadRequest,
):

    key = (
        f"uploads/"
        f"{uuid.uuid4().hex}-"
        f"{safe_filename(payload.filename)}"
    )

    upload_url = create_upload_url(
        key,
        payload.content_type,
    )

    return {
        "key": key,
        "upload_url": upload_url,
    }


# --------------------------------
# List files
# --------------------------------

@app.get("/api/files")
def files():

    return list_objects(
        prefix="uploads/"
    )


# --------------------------------
# View file
# --------------------------------

@app.get("/api/files/view")
def view_file(
    key: str = Query(...),
):

    key = validate_key(key)

    response = get_object(key)

    if response is None:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    content_type = response.get(
        "ContentType",
        "application/octet-stream",
    )

    content_length = response.get(
        "ContentLength"
    )

    headers = {}

    if content_length:
        headers["Content-Length"] = str(
            content_length
        )

    return StreamingResponse(
        response["Body"].iter_chunks(
            chunk_size=1024 * 1024
        ),
        media_type=content_type,
        headers=headers,
    )


# --------------------------------
# Delete
# --------------------------------

@app.delete("/api/files")
def remove(
    payload: DeleteRequest,
):

    key = validate_key(
        payload.key
    )

    if not object_exists(key):
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    delete_object(key)

    return {
        "message": "File deleted",
        "key": key,
    }