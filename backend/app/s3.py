import boto3
from botocore.exceptions import ClientError

from .config import settings


s3 = boto3.client(
    "s3",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)


def create_upload_url(
    key: str,
    content_type: str,
):

    return s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.presigned_upload_expires,
    )


def get_object(key: str):

    try:

        return s3.get_object(
            Bucket=settings.s3_bucket,
            Key=key,
        )

    except ClientError as e:

        error_code = str(
            e.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code in {
            "404",
            "NoSuchKey",
            "NotFound",
        }:
            return None

        raise


def object_exists(key: str):

    try:

        s3.head_object(
            Bucket=settings.s3_bucket,
            Key=key,
        )

        return True

    except ClientError as e:

        error_code = str(
            e.response
            .get("Error", {})
            .get("Code", "")
        )

        if error_code in {
            "404",
            "NoSuchKey",
            "NotFound",
        }:
            return False

        raise


def list_objects(
    prefix="uploads/",
):

    result = []

    paginator = s3.get_paginator(
        "list_objects_v2"
    )

    for page in paginator.paginate(
        Bucket=settings.s3_bucket,
        Prefix=prefix,
    ):

        for obj in page.get(
            "Contents",
            [],
        ):

            result.append(
                {
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": (
                        obj["LastModified"]
                        .isoformat()
                    ),
                }
            )

    return result


def delete_object(key: str):

    s3.delete_object(
        Bucket=settings.s3_bucket,
        Key=key,
    )