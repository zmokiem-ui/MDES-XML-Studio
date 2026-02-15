"""Convert MDES logo PNG to Windows ICO format for Electron app icon."""
import sys
from PIL import Image

def create_ico(png_path, ico_path):
    img = Image.open(png_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Create multiple sizes for best quality at all resolutions
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    
    # Resize with high-quality resampling
    icons = []
    for size in sizes:
        resized = img.resize(size, Image.LANCZOS)
        icons.append(resized)
    
    # Save as ICO with all sizes embedded
    icons[0].save(ico_path, format='ICO', sizes=[(s.width, s.height) for s in icons], append_images=icons[1:])
    print(f"✅ Created {ico_path} with sizes: {[f'{s[0]}x{s[1]}' for s in sizes]}")

if __name__ == '__main__':
    png_input = sys.argv[1] if len(sys.argv) > 1 else 'electron-app/build/mdes-logo.png'
    ico_output = sys.argv[2] if len(sys.argv) > 2 else 'electron-app/build/icon.ico'
    create_ico(png_input, ico_output)
