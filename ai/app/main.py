from fastapi import FastAPI

from app.routes.challenge import router


app = FastAPI(
    title="SIH26043 AI Service",
    version="1.0.0"
)


app.include_router(
    router,
    prefix="/api/v1/challenge"
)


@app.get("/health")
async def health():

    return {
        "status": "ok",
        "service": "SIH26043 AI Service"
    }