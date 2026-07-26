import os
import glob

# Search all TS and TSX files in src
for filepath in glob.glob("src/**/*.ts", recursive=True) + glob.glob("src/**/*.tsx", recursive=True):
    with open(filepath, "r") as f:
        content = f.read()
    
    modified = False
    if "@/lib/ratelimit" in content:
        content = content.replace("@/lib/ratelimit", "@/lib/rateLimit")
        modified = True
    
    if modified:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Fixed {filepath}")

print("Import case fixed")
