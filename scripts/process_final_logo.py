
from PIL import Image
import os

source_path = "/Users/emmaofsti/.gemini/antigravity/brain/3985d2f8-3d3e-4c42-b6e9-5d1c4dd83c06/uploaded_image_1768561773298.jpg"
public_dir = "/Users/emmaofsti/Documents/Vibecoding/Party-plan/vaktplan-app/public"

try:
    img = Image.open(source_path)
    rgba = img.convert("RGBA")
    datas = rgba.getdata()

    newData = []
    threshold = 240
    for item in datas:
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    rgba.putdata(newData)
    
    # Save as logo-final.png
    output_path = os.path.join(public_dir, "logo-final.png")
    rgba.save(output_path, "PNG")
    
    print(f"Successfully saved transparent logo to {output_path}")

except Exception as e:
    print(f"Error processing image: {e}")
