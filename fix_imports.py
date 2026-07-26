import os
import glob

# Search all TS and TSX files in src
for filepath in glob.glob("src/**/*.ts", recursive=True) + glob.glob("src/**/*.tsx", recursive=True):
    with open(filepath, "r") as f:
        content = f.read()
    
    if "ratelimitDistributed" in content:
        content = content.replace("@/lib/ratelimitDistributed", "@/lib/rateLimitDistributed")
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Fixed {filepath}")

print("Import case fixed")
