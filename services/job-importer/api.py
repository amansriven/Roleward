from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl

from job_importer import JobImportError, JobPosting, import_job


app = FastAPI(title="Backstage job importer", docs_url=None, redoc_url=None)


class ImportJobRequest(BaseModel):
    url: HttpUrl


def authorize(authorization: str | None) -> None:
    secret = os.environ.get("JOB_IMPORTER_SECRET", "")
    if secret and authorization != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/jobs/import", response_model=JobPosting)
def import_job_endpoint(
    request: ImportJobRequest,
    authorization: str | None = Header(default=None),
) -> JobPosting:
    authorize(authorization)
    try:
        return import_job(str(request.url))
    except JobImportError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail="Unable to import this job posting.",
        ) from error
