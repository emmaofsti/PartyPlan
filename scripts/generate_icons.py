
from PIL import Image
import os

source_path = "/Users/emmaofsti/.gemini/antigravity/brain/3985d2f8-3d3e-4c42-b6e9-5d1c4dd83c06/uploaded_image_1_1768558476589.jpg"
public_dir = "/Users/emmaofsti/Documents/Vibecoding/Party-plan/vaktplan-app/public"

# Open original image
img = Image.open(source_path)

# 1. Create Transparent Logo (for Navbar)
# Convert to RGBA
rgba = img.convert("RGBA")
datas = rgba.getdata()

newData = []
# Assuming white background is (255, 255, 255)
# We'll use a threshold to catch near-white pixels
threshold = 240
for item in datas:
    if item[0] > threshold and item[1] > threshold and item[2] > threshold:
        newData.append((255, 255, 255, 0))  # Transparent
    else:
        newData.append(item)

rgba.putdata(newData)
# Resize for navbar (keeping aspect ratio, height approx 80px is enough for high dpi)
# Original size is likely large.
rgba.thumbnail((400, 400)) # Resize for multiple uses, standard size
rgba.save(os.path.join(public_dir, "logo.png"), "PNG")

# 2. Create PWA Icons (Keep white background)
# We want square icons. If the image isn't square, we should probably pad it or crop it.
# The image looks roughly square or portrait. Let's make it square with white bg.

def content_centric_resize(image, size):
    # Create a white square
    new_img = Image.new("RGB", (size, size), (255, 255, 255))
    
    # Resize original to fit within size
    img_ratio = image.width / image.height
    if img_ratio > 1:
        new_width = size
        new_height = int(size / img_ratio)
    else:
        new_height = size
        new_width = int(size * img_ratio)
        
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Paste centered
    paste_x = (size - new_width) // 2
    paste_y = (size - new_height) // 2
    new_img.paste(resized, (paste_x, paste_y))
    return new_img

# Icon 192
icon192 = content_centric_resize(img, 192)
icon192.save(os.path.join(public_dir, "icon-192.png"), "PNG")

# Icon 512
icon512 = content_centric_resize(img, 512)
icon512.save(os.path.join(public_dir, "icon-512.png"), "PNG")

# Apple Icon (180x180 usually, let's just use 192 or make 180)
apple_icon = content_centric_resize(img, 180)
apple_icon.save(os.path.join(public_dir, "apple-icon.png"), "PNG")

print("Images generated successfully")
