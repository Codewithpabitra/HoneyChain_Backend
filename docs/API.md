### POST /api/hives
Auth: Bearer token (role: beekeeper)
Body: { location: string, sensorId: string }
Response 201: { success: true, data: { hive } }
Errors: 400 (validation), 401 (unauthorized)