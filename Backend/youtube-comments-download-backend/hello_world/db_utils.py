import boto3
import os

ddb = boto3.resource('dynamodb')
table = ddb.Table(os.environ['TABLE_NAME'])

def save_metadata(metadata):
    table.put_item(Item=metadata)
