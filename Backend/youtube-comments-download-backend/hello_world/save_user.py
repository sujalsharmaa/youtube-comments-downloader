import json
import boto3
import os
import uuid

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

def build_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(body)  # ✅ JSON encode here
    }

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return build_response(200, {"message": "CORS preflight success"})

    try:
        body = json.loads(event.get("body", "{}"))

        # Extract user data
        name = body.get("name")
        email = body.get("email")

        if not name or not email:
            return build_response(400, {"error": "Missing 'name' or 'email'"})
        
        response = table.get_item(Key={"email": email})
        if "Item" in response:
            user_id = response["Item"]["user_id"]
            credits = response["Item"]["credits"]
            return build_response(200, {  # ✅ use build_response here too
                "message": "user already exists",
                "user_id": user_id,
                "credits": int(credits)  # ✅ cast Decimal to int
            })

        user_id = str(uuid.uuid4())  # Generate a unique ID

        item = {
            "user_id": user_id,
            "name": name,
            "email": email,
            "credits": 5
        }

        table.put_item(Item=item)

        return build_response(200, {
            "message": "User saved",
            "user_id": user_id,
            "credits": 5
        })
    
    except Exception as e:
        return build_response(500, {"error": str(e)})
