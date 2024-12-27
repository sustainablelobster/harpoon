import json
import os
import re
import shutil
import subprocess
import tempfile

import boto3

GZIP = "/opt/gzip/gzip"
HARPOON_BUCKET = os.getenv("HARPOON_BUCKET")
HARPOON_IMAGES_ROOT = "images"
SKOPEO = "/opt/skopeo/skopeo"
SKOPEO_POLICY = "/opt/skopeo/policy.json"


def skopeo_copy(image: str) -> None:
    tempdir = tempfile.mkdtemp()
    sanitized_image = re.sub(r"[^A-Za-z0-9_.-]", "_", image)
    tarball = os.path.join(tempdir, f"{sanitized_image}.tar")
    compressed_tarball = f"{tarball}.gz"

    subprocess.run(
        [
            SKOPEO,
            "--policy",
            SKOPEO_POLICY,
            "--tmpdir",
            tempdir,
            "copy",
            f"docker://{image}",
            f"docker-archive:{tarball}:{image}",
        ],
        check=True,
    )

    subprocess.run([GZIP, tarball], check=True)

    try:
        s3_client = boto3.client("s3")
        s3_client.upload_file(
            compressed_tarball,
            HARPOON_BUCKET,
            f"{HARPOON_IMAGES_ROOT}/{os.path.basename(compressed_tarball)}",
        )
    finally:
        shutil.rmtree(tempdir)


def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])
        skopeo_copy(body["image"])
        return {"statusCode": 200, "body": "success"}
    except KeyError | json.JSONDecodeError:
        return {"statusCode": 400, "body": "bad request"}
    except subprocess.CalledProcessError:
        return {"statusCode": 404, "body": "image not found"}
    except:
        return {"statusCode": 500, "body": "internal error"}
