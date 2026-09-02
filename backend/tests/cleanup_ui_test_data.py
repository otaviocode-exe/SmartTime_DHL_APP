"""One-off cleanup of UI-created TEST_ data (iteration 3)."""
import asyncio

from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

env = dotenv_values("/app/backend/.env")


async def main():
    cli = AsyncIOMotorClient(env["MONGO_URL"])
    db = cli[env["DB_NAME"]]
    q = {"$or": [{"motivo": {"$regex": "^TEST_"}}, {"colaborador": {"$regex": "^TEST_"}},
                 {"observacoes": {"$regex": "^TEST_"}}]}
    docs = await db.requests.find(q, {"numero": 1, "colaborador": 1, "_id": 0}).to_list(500)
    print("removing", len(docs), "requests:", [d.get("numero") for d in docs])
    res = await db.requests.delete_many(q)
    print("deleted:", res.deleted_count)
    print("remaining requests:", await db.requests.count_documents({}))
    cli.close()


asyncio.run(main())
