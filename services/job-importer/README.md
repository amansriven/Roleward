# Roleward job importer

Internal extraction worker for job links. It tries ATS-native APIs first,
schema.org JobPosting data second, then an isolated Chromium page/network
capture for JavaScript-only career sites.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
JOB_IMPORTER_SECRET=local-secret uvicorn api:app --reload --port 8080
```

Configure the Next.js server with:

```env
JOB_IMPORTER_URL=http://127.0.0.1:8080
JOB_IMPORTER_SECRET=local-secret
```

The secret is optional for local development but should always be set when the
worker is network-accessible. The app treats this worker as an enhancement and
falls back to its built-in HTML/JSON-LD extraction when it is unavailable.

## Container

```bash
docker build -t roleward-job-importer .
docker run --rm -p 8080:8080 \
  -e JOB_IMPORTER_SECRET=change-me roleward-job-importer
```

The browser layer rejects requests to loopback, private, link-local, reserved,
multicast, and unspecified IP ranges. Production deployments should also apply
outbound firewall rules as a second SSRF boundary.
