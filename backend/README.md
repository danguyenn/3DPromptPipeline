# Backend Operations

## Install

Setup a Python Environment (optional):

```bash
conda create --name 296final_py310 python=3.10 -y
conda activate 296final_py310
```

Install Requirements:

```bash
pip install -r requirements.txt
```

## Usage

Text-to-3D:

```bash
#artstyle can be: realistic, sculpture, pbr
python txt_to_3d.py --text "a happy frog" --artstyle "realistic" --save_path 3d_files
```

3D-to-Images:

```bash
python vista_3d_to_images.py --glb_path 3d_files/refined_model.glb --save_path images
```

Images of 3D object with Text-to-Image:

```bash
python images_to_image.py --text "Could you make this frog have a straw hat?" --images_path images --save_path image
```

Image-to-3D:

```bash
python image_to_3d.py --image_path image/output.png --save_path 3d_files
```