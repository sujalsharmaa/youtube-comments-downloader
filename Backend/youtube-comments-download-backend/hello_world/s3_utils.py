import boto3
import os
from urllib.parse import quote_plus

s3 = boto3.client('s3')
BUCKET = os.environ['BUCKET_NAME']

def upload_all_to_s3(file_paths, video_id):
    base_prefix = f"youtube_comments/{video_id}/"
    urls = {}

    for fmt, path in file_paths.items():
        filename = os.path.basename(path)
        key = base_prefix + filename
        s3.upload_file(path, BUCKET, key)

        # Presigned URL
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET, 'Key': key},
            ExpiresIn=3600  # 1 hour validity
        )
        urls[fmt] = presigned_url

    return urls

