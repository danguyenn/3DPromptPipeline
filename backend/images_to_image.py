import base64
import os
import glob
from openai import OpenAI
from IPython.display import display

OPENAI_API = ''

client = OpenAI(api_key=OPENAI_API)

# Function to encode the image
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")
    
def get_image_files(input_dir):
   image_extensions = ['*.png', '*.jpg', '*.jpeg', '*.bmp']
   image_paths = []
   for ext in image_extensions:
    image_paths.extend(glob.glob(os.path.join(input_dir, ext)))
   return image_paths
    
def gen_image(text_prompt, encoded_images, save_dir):
  #we need to iteratively add the encoded images since we do not know how many there will be before runtime
  content = [{ "type": "input_text", "text": text_prompt }]

  for encoded_image in encoded_images:
     content.append({
        "type": "input_image",
        "image_url": f"data:image/jpeg;base64,{encoded_image}",
     })

  response = client.responses.create(
      model="gpt-4.1",
      input=[
          {
              "role": "user",
              "content": content,
          }
      ],
      tools=[{"type": "image_generation"}],
  )
  # Save the image to a file
  image_data = [
      output.result
      for output in response.output
      if output.type == "image_generation_call"
  ]

  if image_data:
    image_filename = save_dir
    image_base64 = image_data[0]
    with open(image_filename, "wb") as f:
        f.write(base64.b64decode(image_base64))

  #return image_filename
    

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, required=True, help="Text prompt to guide image generation")
    parser.add_argument("--images_path", type=str, required=True, help="Directory where input images are stored")
    parser.add_argument("--save_path", type=str, required=True, help="Directory where output image is saved to")
    
    args = parser.parse_args()

    text = args.text
    image_dir = args.images_path
    save_dir = args.save_path

    os.makedirs(save_dir, exist_ok=True)

    image_paths = get_image_files(image_dir)
    print(f"Found {len(image_paths)} images.")

    encoded_images = []
    for image_path in image_paths:
       encoded_images.append(encode_image(image_path))
       
    #generate image from text prompt and multiple images
    gen_image(text, encoded_images, save_dir + "/output.png")

