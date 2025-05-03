import json
import os
import boto3
import requests

API_KEY = os.environ.get("YOUTUBE_API_KEY")
TABLE_NAME = os.environ.get("TABLE_NAME")

ddb = boto3.resource('dynamodb')
table = ddb.Table(TABLE_NAME)

lambda_client = boto3.client('lambda')

def get_total_comments_count(video_id: str, api_key: str):
    url = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={video_id}&key={api_key}"
    response = requests.get(url)
    if response.status_code != 200:
        raise RuntimeError(f"Error fetching video statistics: {response.text}")

    data = response.json()
    comment_count = int(data["items"][0]["statistics"].get("commentCount", 0))
    time_remaining = comment_count / 100  # Estimate based on 100 comments/sec

    return time_remaining

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        video_id = body.get("video_id")
        just_time = body.get("just_time_estimate", False)

        if not video_id:
            return {"statusCode": 400, "body": json.dumps({"error": "Missing video_id"})}

        if just_time:
            time_remaining = get_total_comments_count(video_id, API_KEY)

            # Trigger async Lambda execution
            lambda_client.invoke(
                FunctionName=os.environ["BACKGROUND_FUNCTION_NAME"],
                InvocationType='Event',
                Payload=json.dumps({"video_id": video_id})
            )

            return {
                "statusCode": 200,
                "body": json.dumps({
                    "Time_Remaining": time_remaining,
                    "message": "Background download triggered"
                })
            }

        # Otherwise, check if metadata already exists
        response = table.get_item(Key={"video_id": video_id})
        if "Item" in response:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Fetched from cache",
                    **response["Item"]
                })
            }

        return {
            "statusCode": 202,
            "body": json.dumps({
                "message": f"Use just_time_estimate=true to trigger download {response}"
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
