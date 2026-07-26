import re

with open("src/lib/db/repository.ts", "r") as f:
    content = f.read()

models = [
    "interaction",
    "supportTicket",
    "booking",
    "roomInventoryDefault",
    "roomInventoryOverride",
    "knowledgeGap",
    "diningReservation",
    "feedback",
    "guest",
    "serviceRequest",
    "spaReservation",
    "review"
]

# Add import
import_stmt = 'import { tenantPrisma } from "@/lib/prisma-tenant";\n'
if "tenantPrisma" not in content:
    content = content.replace('import prisma from "./index";', 'import prisma from "./index";\n' + import_stmt)
    content = content.replace('import prisma from "@/lib/prisma";', 'import prisma from "@/lib/prisma";\n' + import_stmt)

for model in models:
    # replace `prisma.model.` with `tenantPrisma().model.`
    content = re.sub(r'\bprisma\.' + model + r'\b', f'tenantPrisma().{model}', content)

with open("src/lib/db/repository.ts", "w") as f:
    f.write(content)

print("Repository updated")
