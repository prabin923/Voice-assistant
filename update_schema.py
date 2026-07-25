import re

with open("prisma/schema.prisma", "r") as f:
    lines = f.readlines()

models_to_update = [
    "Interaction",
    "SupportTicket",
    "Booking",
    "KnowledgeGap",
    "DiningReservation",
    "Feedback",
    "Guest",
    "ServiceRequest",
    "SpaReservation"
]

in_model = None
new_lines = []

for line in lines:
    model_match = re.match(r'^model\s+(\w+)\s*\{', line)
    if model_match:
        in_model = model_match.group(1)
        new_lines.append(line)
        continue

    if in_model in models_to_update:
        if line.strip().startswith('@@') or line.strip() == '}':
            # Add fields before the first @@ or }
            new_lines.append('  hotelId      String   @map("hotel_id")\n')
            new_lines.append('  hotel        Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)\n\n')
            new_lines.append(line)
            in_model = None
        else:
            new_lines.append(line)
    elif in_model == "RoomInventoryDefault":
        if 'String   @id @map' in line or 'String @id @map' in line:
            new_lines.append(line.replace('@id', ''))
        elif line.strip().startswith('@@') or line.strip() == '}':
            new_lines.append('  hotelId  String @map("hotel_id")\n')
            new_lines.append('  hotel    Hotel  @relation(fields: [hotelId], references: [id], onDelete: Cascade)\n\n')
            new_lines.append('  @@id([hotelId, roomType])\n')
            new_lines.append(line)
            in_model = None
        else:
            new_lines.append(line)
    elif in_model == "RoomInventoryOverride":
        if line.strip().startswith('@@id'):
            new_lines.append('  @@id([hotelId, roomType, date])\n')
        elif line.strip().startswith('@@') or line.strip() == '}':
            new_lines.append('  hotelId  String @map("hotel_id")\n')
            new_lines.append('  hotel    Hotel  @relation(fields: [hotelId], references: [id], onDelete: Cascade)\n\n')
            new_lines.append(line)
            in_model = None
        else:
            new_lines.append(line)
    elif in_model == "Hotel":
        if line.strip().startswith('@@') or line.strip() == '}':
            addition = """  interactions           Interaction[]
  supportTickets         SupportTicket[]
  bookings               Booking[]
  guests                 Guest[]
  knowledgeGaps          KnowledgeGap[]
  diningReservations     DiningReservation[]
  feedback               Feedback[]
  serviceRequests        ServiceRequest[]
  spaReservations        SpaReservation[]
  roomInventoryDefaults  RoomInventoryDefault[]
  roomInventoryOverrides RoomInventoryOverride[]
  reviews                Review[]

"""
            new_lines.append(addition)
            new_lines.append(line)
            in_model = None
        else:
            new_lines.append(line)
    else:
        if line.strip() == '}':
            in_model = None
        new_lines.append(line)

with open("prisma/schema.prisma", "w") as f:
    f.writelines(new_lines)

print("Schema updated successfully")
