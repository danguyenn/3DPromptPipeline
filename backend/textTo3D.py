import requests

payload = {
  "mode": "preview",
  "prompt": "a monster mask",
  "art_style": "realistic",
  "should_remesh": True
}
headers = {
  "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.post(
  "https://api.meshy.ai/openapi/v2/text-to-3d",
  headers=headers,
  json=payload,
)
response.raise_for_status()
print(response.json())
