import pyvista as pv
import os
import numpy as np

def add_lights(plotter, intensity=1.5):
    #add lights for every position
    plotter.add_light(pv.Light(position=(0, 0, 5), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(0, 0, -5), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(0, 5, 0), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(0, -5, 0), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(5, 0, 0), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(-5, 0, 0), focal_point=(0, 0, 0), intensity=intensity))

def render_views_with_pyvista(glb_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    print("make images directory")

    # Create a plotter
    plotter = pv.Plotter(off_screen=True, window_size=(640, 480), lighting='none')

    print("created plotter")

    plotter.import_gltf(glb_path)

    print("imported glb file")

    add_lights(plotter)

    print("created lights for plotter")

    # Set up views (camera positions)
    camera_views = {
        "front":   [(0, 0, 5), (0, 0, 0), (0, 1, 0)],
        "back":    [(0, 0, -5), (0, 0, 0), (0, 1, 0)],
        "left":    [(-5, 0, 0), (0, 0, 0), (0, 1, 0)],
        "right":   [(5, 0, 0), (0, 0, 0), (0, 1, 0)],
        "top":     [(0, 5, 0), (0, 0, 0), (0, 0, -1)],
        "bottom":  [(0, -5, 0), (0, 0, 0), (0, 0, 1)],
    }

    for view_name, (pos, focal, up) in camera_views.items():
        # Set camera position: (position, focal_point, view_up)
        #plotter.camera_position = [position, (0, 0, 0), (0, 0, 1)]
        plotter.camera_position = [pos, focal, up]

        # Update the view and export
        out_path = os.path.join(output_dir, f"{view_name}.png")
        plotter.show(screenshot=out_path, auto_close=False)  # don't close between renders
        print(f"Saved: {out_path}")

    plotter.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--glb_path", type=str, required=True, help="Directory where input GLB file is stored")
    parser.add_argument("--save_path", type=str, required=True, help="Directory to save the images")
    
    args = parser.parse_args()

    glb_path = args.glb_path
    save_path = args.save_path

    render_views_with_pyvista(glb_path, save_path)