import pyvista as pv
import os
import numpy as np

def add_lights(plotter, intensity=1.5):
    plotter.add_light(pv.Light(position=(0, 0, 5), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(0, 0, -5), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(0, 5, 0), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(0, -5, 0), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(5, 0, 0), focal_point=(0, 0, 0), intensity=intensity))
    plotter.add_light(pv.Light(position=(-5, 0, 0), focal_point=(0, 0, 0), intensity=intensity))

def render_views_with_pyvista(glb_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print("Created images directory:", output_dir)

    # Create a plotter with offscreen rendering
    plotter = pv.Plotter(off_screen=True, window_size=(640, 480), lighting='none')
    print("Created plotter")

    # Load the GLB model
    try:
        plotter.import_gltf(glb_path)
        print("Imported GLB file:", glb_path)
    except Exception as e:
        print("Error importing GLB file:", e)
        return

    # Add lights
    add_lights(plotter)
    print("Added lights")

    # Define camera views
    camera_views = {
        "front":   [(0, 0, 5), (0, 0, 0), (0, 1, 0)],
        "back":    [(0, 0, -5), (0, 0, 0), (0, 1, 0)],
        "left":    [(-5, 0, 0), (0, 0, 0), (0, 1, 0)],
        "right":   [(5, 0, 0), (0, 0, 0), (0, 1, 0)],
        "top":     [(0, 5, 0), (0, 0, 0), (0, 0, -1)],
        "bottom":  [(0, -5, 0), (0, 0, 0), (0, 0, 1)],
    }

    # Render and save screenshots
    for view_name, (pos, focal, up) in camera_views.items():
        try:
            plotter.camera_position = [pos, focal, up]
            out_path = os.path.join(output_dir, f"{view_name}.png")
            plotter.show(screenshot=out_path, auto_close=False)
            print(f"✅ Saved view: {view_name} → {out_path}")
        except Exception as e:
            print(f"❌ Error rendering view {view_name}:", e)

    plotter.close()
    print("Plotter closed.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--glb_path", type=str, required=True, help="Path to input GLB file")
    parser.add_argument("--save_path", type=str, required=True, help="Directory to save output images")

    args = parser.parse_args()
    render_views_with_pyvista(args.glb_path, args.save_path)