import os
from typing import Dict
from fastapi import FastAPI
import resend

resend.api_key = os.environ["RESEND_API_KEY"]

app = FastAPI()


@app.post("/mail")
def send_mail() -> Dict:
    params: resend.Emails.SendParams = {
        "from": "NexBrix <info@nexbrix.com.au>",
        "to": ["jeet15083011@gmail.com"],
        "subject": "hello world",
        "html": "<strong>it works!</strong>",
    }
    email: resend.Emails.SendResponse = resend.Emails.send(params)
    return email
