import os
import numpy as np
import trimesh
import pyrender
from PIL import Image

def load_scene(glb_path):
    #load 3d scene from the GLB file using trimesh
    scene_or_mesh = trimesh.load(glb_path, force='scene')
    #convert trimesh.Scene to a list of meshes (if it isnt a single mesh)
    if isinstance(scene_or_mesh, trimesh.Scene):
        #create a single merged mesh
        mesh = trimesh.util.concatenate(scene_or_mesh.dump())
    else:
        mesh = scene_or_mesh
    return mesh

def look_at(eye, target, up=np.array([0, 0, 1])):
    forward = target - eye
    forward = forward / np.linalg.norm(forward)
    side = np.cross(forward, up)
    side = side / np.linalg.norm(side)
    new_up = np.cross(side, forward)
    #construct 4x4 view matrix from right, up and -forward vectors
    mat = np.eye(4)
    mat[0, :3] = side
    mat[1, :3] = new_up
    mat[2, :3] = -forward
    mat[:3, 3] = eye
    return mat

def render_views(glb_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    #load mesh from glb
    mesh = load_scene(glb_path)
    center = mesh.bounding_box.centroid
    print("Mesh center:", center)
    mesh.apply_translation(-mesh.bounding_box.centroid)

    #create pyrender mesh from trimesh
    render_mesh = pyrender.Mesh.from_trimesh(mesh, smooth=True)

    scene = pyrender.Scene()
    scene.add(render_mesh)

    #create offscreen renderer
    renderer = pyrender.OffscreenRenderer(viewport_width=640, viewport_height=480)

    camera = pyrender.PerspectiveCamera(yfov=np.pi / 3.0)

    #define views: (eye position, target position)
    camera_views = {
        "front": (np.array([0, -3, 0]), np.array([0,0,0])),
        "left": (np.array([3, 0, 0]), np.array([0,0,0])),
        "right": (np.array([-3, 0, 0]), np.array([0,0,0])),
        "back": (np.array([0, 3, 0]), np.array([0,0,0])),
        #add top?
    }

    for view, (eye, target) in camera_views.items():
        #set camera pose using look_at
        camera_pose = look_at(eye, target)
        cam_node = scene.add(camera, pose=camera_pose)

        #render scene
        color, _ = renderer.render(scene)
        image = Image.fromarray(color)
        out_path = os.path.join(output_dir, f"{view}.png")
        image.save(out_path)
        print(f"Rendered {out_path}")
        scene.remove_node(cam_node)

    renderer.delete()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--glb_path", type=str, required=True, help="Directory where input GLB file is stored")
    parser.add_argument("--save_path", type=str, required=True, help="Directory to save the images")
    
    args = parser.parse_args()

    glb_path = args.glb_path
    save_path = args.save_path

    render_views(glb_path, save_path)