import json
import os
import boto3
from helper import fetch_and_convert_comments
from s3_utils import upload_all_to_s3
from db_utils import save_metadata
import time

ddb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get("TABLE_NAME")
TABLE_NAME_USERS = os.environ.get("TABLE_NAME_USERS")
table2 = ddb.Table(TABLE_NAME_USERS)
table = ddb.Table(TABLE_NAME)
s3 = boto3.client('s3')

def lambda_handler(event, context):
    try:
        video_id = event.get("video_id")
        email = event.get("email")
        if not video_id or not email:
            raise ValueError("Missing 'video_id' or 'email' in event payload.")

        # Check if already exists
        response = table.get_item(Key={"video_id": video_id})
        if "Item" in response:
            item = response["Item"]
            video_id = item["video_id"]
            base_prefix = f"youtube_comments/{video_id}/"
            file_names = {
                "json": f"{base_prefix}{video_id}.json",
                "txt": f"{base_prefix}{video_id}.txt",
                "html": f"{base_prefix}{video_id}.html",
                "csv": f"{base_prefix}{video_id}.csv",
            }

            presigned_urls = {}
            for fmt, key in file_names.items():
                presigned_urls[fmt] = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': os.environ["BUCKET_NAME"], 'Key': key},
                    ExpiresIn=604800
                )

            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Fetched from db",
                    "video_id": video_id,
                    "total_comments": item.get("total_comments"),
                    "download_links": presigned_urls
                })
            }
        
        # If not in db, fetch and process the comments
        df, file_paths = fetch_and_convert_comments(video_id)
        
        # Upload to S3 and get URLs
        download_links = upload_all_to_s3(file_paths, video_id)
        
        # Add expiry_time field
        expiry_time = int(time.time()) + 7 * 24 * 60 * 60

        # Save metadata to DynamoDB
        metadata = {
            "video_id": video_id,
            "download_links": download_links,
            "expiry_time": expiry_time
        }
        save_metadata(metadata)
        # decrease user credits

        response = table2.get_item(Key={"email": email})
        if "Item" in response:
            item = response["Item"]
            credits = item.get("credits", 0)
            credits -= 1
            if credits < 0:
                credits = 0  # optional: avoid negative credits

            # Update only the 'credits' attribute without overwriting the entire item
            table2.update_item(
                Key={"email": email},
                UpdateExpression="set credits = :c",
                ExpressionAttributeValues={
                    ":c": credits
                }
            )


        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Processing completed",
                "video_id": video_id,
                "download_links": download_links,
                "credits": int(credits)
            })
        }

    except Exception as e:
        print(f"Error processing video_id {event.get('video_id')}: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }