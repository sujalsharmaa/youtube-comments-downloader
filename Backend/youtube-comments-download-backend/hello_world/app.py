import os
import boto3
import json
import requests


# Environment variables
API_KEY = os.environ.get("YOUTUBE_API_KEY")
TABLE_NAME = os.environ.get("TABLE_NAME")
TABLE_NAME_USERS = os.environ.get("TABLE_NAME_USERS")
BACKGROUND_FUNCTION_NAME = os.environ.get("BACKGROUND_FUNCTION_NAME")

# AWS clients
ddb = boto3.resource("dynamodb")
table = ddb.Table(TABLE_NAME)
table_users = ddb.Table(TABLE_NAME_USERS)
lambda_client = boto3.client('lambda')

def get_time_to_wait(video_id: str, api_key: str) -> float:
    url = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={video_id}&key={api_key}"
    response = requests.get(url)
    
    if response.status_code != 200:
        raise RuntimeError(f"Error fetching video statistics: {response.text}")
    
    data = response.json()
    comment_count = int(data["items"][0]["statistics"].get("commentCount", 0))
    time_remaining = comment_count / 100  # Estimate based on 100 comments/sec
    return time_remaining

def check_video_in_db(video_id: str, api_key: str, email: str) -> dict:
    # Check if video exists in table
    response = table.get_item(Key={"video_id": video_id})
    
    if "Item" in response:
        credits_response = table_users.get_item(Key={"email": email})
        return {
            "Query": "success",
            "response": response["Item"],
            "credits": int(credits_response["Item"]["credits"])
        }
    
    # If video not found, trigger background processing
    lambda_client.invoke(
        FunctionName=BACKGROUND_FUNCTION_NAME,
        InvocationType='Event',
        Payload=json.dumps({"video_id": video_id, "email": email})
    )
    
    return {"wait_for": get_time_to_wait(video_id=video_id, api_key=api_key)}

def build_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(body)
    }

def lambda_handler(event, context):
    try:
        method = event.get("httpMethod")
        path = event.get("url")
        
        # Handle preflight OPTIONS request
        if method == "OPTIONS":
            return build_response(200, {"message": "CORS preflight success"})
        
        body = json.loads(event.get("body", "{}"))

        # For video checking flow
        video_id = body.get("video_id")
        email = body.get("email")

        if not video_id or not email:
            return build_response(400, {"error": f"Missing video_id or email: {email} {video_id}"})
        
        user_response = table_users.get_item(Key={"email": email})
        if "Item" not in user_response:
            return build_response(404, {"error": "User not found"})
        
        user_item = user_response["Item"]
        if int(user_item.get("credits", 0)) == 0:
            return build_response(200, {"credits": 0})
        
        result = check_video_in_db(video_id=video_id, api_key=API_KEY, email=email)
        return build_response(200, result)

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return build_response(500, {"error": str(e)})
