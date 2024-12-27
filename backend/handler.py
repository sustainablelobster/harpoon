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


def sanitize(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", s)


def get_skopeo_args(image: str, platform: str, tempdir: str, tarball: str) -> list:
    args = [
        SKOPEO,
        "copy",
        f"docker://{image}",
        f"docker-archive:{tarball}:{image}",
        "--tmpdir",
        tempdir,
        "--policy",
        SKOPEO_POLICY,
    ]

    override_opts = ("--override-os", "--override-arch", "--override-variant")
    for i, override in enumerate(platform.split("/")):
        args.append(override_opts[i])
        args.append(override)

    return args


def skopeo_copy(image: str, platform: str) -> None:
    tempdir = tempfile.mkdtemp()
    tarball = os.path.join(tempdir, sanitize(image))
    if platform != "":
        tarball += f"_{sanitize(platform)}"
    tarball += ".tar"

    subprocess.run(get_skopeo_args(image, platform, tempdir, tarball), check=True)
    subprocess.run((GZIP, tarball), check=True)
    tarball += ".gz"

    try:
        s3_client = boto3.client("s3")
        s3_client.upload_file(
            tarball,
            HARPOON_BUCKET,
            f"{HARPOON_IMAGES_ROOT}/{os.path.basename(tarball)}",
        )
    finally:
        shutil.rmtree(tempdir)


def lambda_handler(event, context):
    try:
        body = json.loads(event["body"])
        skopeo_copy(**body)
        return {"statusCode": 200, "body": "success"}
    except (json.JSONDecodeError, KeyError, TypeError):
        return {"statusCode": 400, "body": "bad request"}
    except subprocess.CalledProcessError:
        return {"statusCode": 404, "body": f"image not found"}
    except:
        return {"statusCode": 500, "body": "internal error"}
