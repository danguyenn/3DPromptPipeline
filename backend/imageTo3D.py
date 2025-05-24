import requests

payload = {
     # Using data URI example
     # image_url: f'data:image/png;base64,{YOUR_BASE64_ENCODED_IMAGE_DATA}',
    "image_url": "<your publicly accessible image url or base64-encoded data URI>",
    "enable_pbr": True,
    "should_remesh": True,
    "should_texture": True

}
headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.post(
    "https://api.meshy.ai/openapi/v1/image-to-3d",
    headers=headers,
    json=payload,
)
response.raise_for_status()
print(response.json())
