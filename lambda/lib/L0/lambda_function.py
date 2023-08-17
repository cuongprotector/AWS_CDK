import datetime
import json
import traceback

def lambda_handler(event, context):
    now = datetime.datetime.now()
    try:
        print(f"{event} at {now}")
        ret_body = {
            'result' : 'success'
        }

        return {
            'statusCode':200,
            'body':json.dumps(ret_body)
        }
    except Exception as e:
        print(traceback.format_exc())
        return {'statusCode' : 404}