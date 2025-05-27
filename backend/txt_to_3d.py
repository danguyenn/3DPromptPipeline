import requests
import time
from dotenv import load_dotenv
import os

#create task to generate 3d model from text
def create_draft_task(prompt, art_style, headers):

    payload = {
    "mode": "preview",
    "prompt": prompt,
    #"negative_prompt": "good quality",
    "art_style": art_style,
    "should_remesh": True,
    }

    response = requests.post(
    "https://api.meshy.ai/openapi/v2/text-to-3d",
    headers=headers,
    json=payload,
    )

    if response.status_code != 200 and response.status_code != 202:
        print("Error:", response.status_code, response.text)
    response.raise_for_status()
    task_id = response.json()["result"]
    print("Task created. Task ID:", task_id)

    return task_id

#we get the id of the task returned from meshy ai
#since this is an asynchronous task handled by meshy ai's servers, we need to continually request the status of the task
def return_draft_task(task_id, headers):
    task = None

    while True:
        task_response = requests.get(
            f"https://api.meshy.ai/openapi/v2/text-to-3d/{task_id}",
            headers=headers,
        )

        if task_response.status_code != 200 and task_response.status_code != 202:
            print("Error:", task_response.status_code, task_response.text)
        task_response.raise_for_status()

        task = task_response.json()

        #if we break from this, the task has finished processing on the server
        if task["status"] == "SUCCEEDED":
            print("Task finished.")
            break

        if task["status"] == "FAILED" or task["status"] == "CANCELED" :
            print("Task failed, please retry this operation.")
            return

        print("Task status:", task["status"], "| Progress:", task["progress"], "| Retrying in 5 seconds...")
        time.sleep(5)

    return task

#download the 3d model in glb format
def download_draft__model(task, draft_filename):
    model_url = task["model_urls"]["glb"]

    model_response = requests.get(model_url)
    model_response.raise_for_status()

    with open(draft_filename, "wb") as f:
        f.write(model_response.content)

    print("Draft model downloaded.")


def gen_3d_draft(prompt, artstyle, draft_filename, headers):
    task_id = create_draft_task(prompt, artstyle, headers)

    task = return_draft_task(task_id, headers)

    download_draft__model(task, draft_filename)

    return task_id

#sends a request to refine the 3d model
def create_refined_task(task_id, headers):
    generate_refined_request = {
        "mode": "refine",
        "preview_task_id": task_id,
        #"task_id": task_id,
    }

    generate_refined_response = requests.post(
        "https://api.meshy.ai/openapi/v2/text-to-3d",
        headers=headers,
        json=generate_refined_request,
    )

    if generate_refined_response.status_code != 200 and generate_refined_response.status_code != 202:
            print("Error:", generate_refined_response.status_code, generate_refined_response.text)

    generate_refined_response.raise_for_status()

    refined_task_id = generate_refined_response.json()["result"]

    print("Refined task created. Task ID:", refined_task_id)
    
    return refined_task_id

#poll until refined task is done processing on server
def return_refined_task(refined_task_id, headers):
    refined_task = None

    while True:
        refined_task_response = requests.get(
            f"https://api.meshy.ai/openapi/v2/text-to-3d/{refined_task_id}",
            headers=headers,
        )

        if refined_task_response.status_code != 200 and refined_task_response.status_code != 202:
            print("Error:", refined_task_response.status_code, refined_task_response.text)
        refined_task_response.raise_for_status()

        refined_task = refined_task_response.json()

        if refined_task["status"] == "SUCCEEDED":
            print("Refined task finished.")
            break

        if refined_task["status"] == "FAILED" or refined_task["status"] == "CANCELED" :
            print("Refined task failed, please retry this operation.")
            return

        print("Refined task status:", refined_task["status"], "| Progress:", refined_task["progress"], "| Retrying in 5 seconds...")
        time.sleep(5)

    return refined_task

def download_refined_model(refined_task, refined_filename):
    refined_model_url = refined_task["model_urls"]["glb"]

    refined_model_response = requests.get(refined_model_url)
    refined_model_response.raise_for_status()

    with open(refined_filename, "wb") as f:
        f.write(refined_model_response.content)

    print("Refined model downloaded.")

def gen_3d_refined(task_id, refined_filename, headers):
    refined_task_id = create_refined_task(task_id, headers)

    refined_task = return_refined_task(refined_task_id, headers)

    download_refined_model(refined_task, refined_filename)


def gen_3d(text, artstyle, save_path):

    os.makedirs(save_path, exist_ok=True)

    load_dotenv()

    api_key = os.getenv("MESHY_TEST_API")

    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    draft_filepath = save_path + "/draft_model.glb"
    refined_filepath = save_path + "/refined_model.glb"
    
    task_id = gen_3d_draft(text, artstyle, draft_filepath, headers)
    gen_3d_refined(task_id, refined_filepath, headers)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, required=True, help="Text prompt to guide 3D generation")
    parser.add_argument("--artstyle", type=str, choices=['realistic', 'sculpture', 'pbr'], default="realistic", help="Art style of the 3D model")
    parser.add_argument("--save_path", type=str, required=True, help="Directory to save the 3D files")
    
    args = parser.parse_args()

    text = args.text
    artstyle = args.artstyle
    save_path = args.save_path

    os.makedirs(save_path, exist_ok=True)

    #text to 3d is split into two phases
    #the first phase generates a draft
    #the second phase refines the draft

    draft_filepath = save_path + "/draft_model.glb"
    refined_filepath = save_path + "/refined_model.glb"

    #FIRST PHASE: GENERATE 3D DRAFT
    task_id = gen_3d_draft(text, artstyle, draft_filepath)

    #SECOND PHASE: GENERATE 3D REFINE
    gen_3d_refined(task_id, refined_filepath)