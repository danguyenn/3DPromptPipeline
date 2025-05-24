import requests

payload = {
    "input_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578",
    "target_formats": ["glb", "fbx"],
    "topology": "quad",
    "target_polycount": 50000,
    "resize_height": 1.0,
    "origin_at": "bottom"
}
headers = {
    "Authorization": f"Bearer {YOUR_API_KEY}"
}

response = requests.post(
    "https://api.meshy.ai/openapi/v1/remesh",
    headers=headers,
    json=payload,
)
response.raise_for_status()
print(response.json())
