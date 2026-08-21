from __future__ import annotations

import ipaddress
import json
import re
import socket
from enum import Enum
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/136.0.0.0 Safari/537.36"
)


class ATS(str, Enum):
    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    ASHBY = "ashby"
    WORKDAY = "workday"
    PHENOM = "phenom"
    GENERIC = "generic"


class JobPosting(BaseModel):
    platform: ATS
    source_url: str
    canonical_url: str | None = None
    external_id: str | None = None
    title: str
    company: str | None = None
    locations: list[str] = Field(default_factory=list)
    department: str | None = None
    team: str | None = None
    employment_type: str | None = None
    workplace_type: str | None = None
    date_posted: str | None = None
    valid_through: str | None = None
    description_text: str | None = None
    description_html: str | None = None
    salary_text: str | None = None
    apply_url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class JobImportError(RuntimeError):
    pass


def clean_text(value: str | None) -> str | None:
    if not value:
        return None
    text = BeautifulSoup(value, "html.parser").get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() or None


def normalize_url(url: str) -> str:
    p = urlparse(url.strip())
    if p.scheme not in {"http", "https"} or not p.hostname:
        raise JobImportError("A valid http(s) URL is required.")
    return urlunparse((p.scheme, p.netloc, p.path or "/", p.params, p.query, ""))


def assert_public_host(url: str) -> None:
    """Basic SSRF protection. Also use egress filtering in production."""
    host = urlparse(url).hostname
    if not host or host.lower() in {"localhost", "localhost.localdomain"}:
        raise JobImportError("Private/local URLs are not allowed.")

    try:
        addresses = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise JobImportError(f"Could not resolve host: {host}") from exc

    for info in addresses:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise JobImportError("Private/local URLs are not allowed.")


def canonical_compare(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme.lower()}://{p.netloc.lower()}{p.path.rstrip('/')}"


def detect_platform(
    url: str,
    html: str = "",
    network_urls: list[str] | None = None,
) -> ATS:
    host = (urlparse(url).hostname or "").lower()
    blob = " ".join([url, html[:500_000], *(network_urls or [])]).lower()

    if "greenhouse.io" in host or "boards-api.greenhouse.io" in blob or "gh_jid=" in blob:
        return ATS.GREENHOUSE
    if "lever.co" in host or "api.lever.co" in blob:
        return ATS.LEVER
    if "ashbyhq.com" in host or "api.ashbyhq.com" in blob:
        return ATS.ASHBY
    if "myworkdayjobs.com" in host or "myworkdaysite.com" in host or "/wday/cxs/" in blob:
        return ATS.WORKDAY
    if (
        "phenom.com" in host
        or "phenompeople.com" in host
        or "api.phenom.com" in blob
        or "phenom" in blob
    ):
        return ATS.PHENOM

    return ATS.GENERIC


class Fetcher:
    def __init__(self) -> None:
        self.client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
            },
            timeout=httpx.Timeout(20.0),
            follow_redirects=False,
        )

    def close(self) -> None:
        self.client.close()

    def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._request("GET", url, **kwargs)

    def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        current = normalize_url(url)

        for _ in range(6):
            assert_public_host(current)
            r = self.client.request(method, current, **kwargs)

            if r.status_code not in {301, 302, 303, 307, 308}:
                r.raise_for_status()
                return r

            location = r.headers.get("location")
            if not location:
                r.raise_for_status()

            current = urljoin(current, location)
            if r.status_code == 303:
                method = "GET"
                kwargs.pop("json", None)
                kwargs.pop("data", None)

        raise JobImportError("Too many redirects.")


def metadata_value(metadata: Any, names: set[str]) -> str | None:
    if not isinstance(metadata, list):
        return None

    names = {n.lower() for n in names}
    for item in metadata:
        if not isinstance(item, dict):
            continue
        if str(item.get("name", "")).lower() in names:
            value = item.get("value")
            if isinstance(value, list):
                return ", ".join(str(x) for x in value)
            if value is not None:
                return str(value)
    return None


# ---------- Greenhouse ----------

def parse_greenhouse_url(url: str) -> tuple[str, str] | None:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    parts = [x for x in p.path.split("/") if x]
    job_id = parse_qs(p.query).get("gh_jid", [None])[0]

    if host not in {"boards.greenhouse.io", "job-boards.greenhouse.io"} or not parts:
        return None

    board = parts[0]

    if not job_id and "jobs" in parts:
        i = parts.index("jobs")
        if i + 1 < len(parts):
            job_id = parts[i + 1]

    return (board, job_id) if board and job_id else None


def import_greenhouse(url: str, fetcher: Fetcher) -> JobPosting:
    parsed = parse_greenhouse_url(url)
    if not parsed:
        raise JobImportError("Could not determine Greenhouse board/job id.")

    board, job_id = parsed
    data = fetcher.get(
        f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}"
    ).json()

    company = None
    try:
        company = fetcher.get(
            f"https://boards-api.greenhouse.io/v1/boards/{board}"
        ).json().get("name")
    except Exception:
        pass

    location = data.get("location") or {}

    return JobPosting(
        platform=ATS.GREENHOUSE,
        source_url=url,
        canonical_url=data.get("absolute_url") or url,
        external_id=str(data.get("id") or job_id),
        title=(data.get("title") or "").strip(),
        company=company,
        locations=[location["name"]] if location.get("name") else [],
        department=metadata_value(data.get("metadata"), {"department"}),
        employment_type=metadata_value(
            data.get("metadata"),
            {"employment type", "employment_type", "job type"},
        ),
        date_posted=data.get("updated_at"),
        description_html=data.get("content"),
        description_text=clean_text(data.get("content")),
        apply_url=data.get("absolute_url") or url,
        metadata={"board_token": board},
    )


# ---------- Lever ----------

def import_lever(url: str, fetcher: Fetcher) -> JobPosting:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    parts = [x for x in p.path.split("/") if x]

    if "lever.co" not in host or len(parts) < 2:
        raise JobImportError("Not a direct Lever posting.")

    site, posting_id = parts[0], parts[1]
    api_host = "api.eu.lever.co" if host.startswith("jobs.eu.") else "api.lever.co"

    data = fetcher.get(
        f"https://{api_host}/v0/postings/{site}/{posting_id}",
        params={"mode": "json"},
    ).json()

    categories = data.get("categories") or {}
    sections = [data.get("description") or ""]

    for section in data.get("lists") or []:
        if not isinstance(section, dict):
            continue
        if section.get("text"):
            sections.append(f"<h2>{section['text']}</h2>")
        if section.get("content"):
            sections.append(str(section["content"]))

    description_html = "\n".join(sections).strip() or None

    return JobPosting(
        platform=ATS.LEVER,
        source_url=url,
        canonical_url=data.get("hostedUrl") or url,
        external_id=str(data.get("id") or posting_id),
        title=(data.get("text") or "").strip(),
        locations=[categories["location"]] if categories.get("location") else [],
        department=categories.get("department"),
        team=categories.get("team"),
        employment_type=categories.get("commitment"),
        workplace_type=data.get("workplaceType"),
        description_html=description_html,
        description_text=data.get("descriptionPlain") or clean_text(description_html),
        salary_text=data.get("salaryDescription"),
        apply_url=data.get("applyUrl") or data.get("hostedUrl") or url,
        metadata={"site": site},
    )


# ---------- Ashby ----------

def import_ashby(url: str, fetcher: Fetcher) -> JobPosting:
    p = urlparse(url)
    parts = [x for x in p.path.split("/") if x]

    if (p.hostname or "").lower() != "jobs.ashbyhq.com" or len(parts) < 2:
        raise JobImportError("Not a direct Ashby posting.")

    board = parts[0]
    data = fetcher.get(
        f"https://api.ashbyhq.com/posting-api/job-board/{board}",
        params={"includeCompensation": "true"},
    ).json()

    target = canonical_compare(url)
    job = next(
        (
            candidate
            for candidate in data.get("jobs", [])
            if candidate.get("jobUrl")
            and canonical_compare(candidate["jobUrl"]) == target
        ),
        None,
    )

    if job is None:
        source_slug = parts[1]
        for candidate in data.get("jobs", []):
            candidate_parts = [
                x for x in urlparse(candidate.get("jobUrl") or "").path.split("/") if x
            ]
            if len(candidate_parts) >= 2 and candidate_parts[1] == source_slug:
                job = candidate
                break

    if not job:
        raise JobImportError("Ashby posting was not found on the public board.")

    locations = []
    if job.get("location"):
        locations.append(job["location"])
    for item in job.get("secondaryLocations") or []:
        if isinstance(item, dict) and item.get("location"):
            locations.append(item["location"])

    compensation = job.get("compensation") or {}

    return JobPosting(
        platform=ATS.ASHBY,
        source_url=url,
        canonical_url=job.get("jobUrl") or url,
        external_id=parts[1],
        title=(job.get("title") or "").strip(),
        locations=list(dict.fromkeys(locations)),
        department=job.get("department"),
        team=job.get("team"),
        employment_type=job.get("employmentType"),
        workplace_type=job.get("workplaceType"),
        date_posted=job.get("publishedAt"),
        description_html=job.get("descriptionHtml"),
        description_text=job.get("descriptionPlain")
        or clean_text(job.get("descriptionHtml")),
        salary_text=compensation.get("compensationTierSummary")
        or compensation.get("scrapeableCompensationSalarySummary"),
        apply_url=job.get("applyUrl") or job.get("jobUrl") or url,
        metadata={"board": board, "is_remote": job.get("isRemote")},
    )


# ---------- Workday ----------

def parse_workday_url(url: str) -> tuple[str, str, str, str] | None:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    parts = [x for x in p.path.split("/") if x]

    # tenant.wdN.myworkdayjobs.com/[locale/]SITE/job/.../SLUG
    match = re.match(r"^(?P<tenant>[^.]+)\.wd\d+\.myworkdayjobs\.com$", host)
    if match and "job" in parts:
        job_i = parts.index("job")
        if job_i >= 1:
            return host, match.group("tenant"), parts[job_i - 1], parts[-1]

    # wdN.myworkdaysite.com/[locale/]recruiting/TENANT/SITE/job/.../SLUG
    if re.match(r"^wd\d+\.myworkdaysite\.com$", host):
        if "recruiting" in parts and "job" in parts:
            r = parts.index("recruiting")
            if r + 2 < len(parts):
                return host, parts[r + 1], parts[r + 2], parts[-1]

    return None


def import_workday(url: str, fetcher: Fetcher) -> JobPosting:
    parsed = parse_workday_url(url)
    if not parsed:
        raise JobImportError("Could not parse Workday tenant/site/posting.")

    host, tenant, site, slug = parsed

    data = fetcher.get(
        f"https://{host}/wday/cxs/{tenant}/{site}/job/{slug}",
        headers={"Accept": "application/json", "Referer": url, "User-Agent": USER_AGENT},
    ).json()

    info = data.get("jobPostingInfo") or {}
    org = data.get("hiringOrganization") or info.get("hiringOrganization") or {}

    locations = []
    if info.get("location"):
        locations.append(str(info["location"]))
    locations.extend(str(x) for x in (info.get("additionalLocations") or []) if x)

    external_id = info.get("jobReqId") or info.get("jobPostingId") or slug

    return JobPosting(
        platform=ATS.WORKDAY,
        source_url=url,
        canonical_url=info.get("externalUrl") or url,
        external_id=str(external_id),
        title=(info.get("title") or "").strip(),
        company=org.get("name") if isinstance(org, dict) else None,
        locations=list(dict.fromkeys(locations)),
        employment_type=info.get("timeType"),
        date_posted=info.get("startDate"),
        description_html=info.get("jobDescription"),
        description_text=clean_text(info.get("jobDescription")),
        apply_url=info.get("externalUrl") or url,
        metadata={
            "tenant": tenant,
            "site": site,
            "job_posting_id": info.get("jobPostingId"),
        },
    )


# ---------- JSON-LD + generic SPA fallback ----------

def find_jobposting(obj: Any) -> dict[str, Any] | None:
    if isinstance(obj, dict):
        kind = obj.get("@type")
        if kind == "JobPosting" or (
            isinstance(kind, list) and "JobPosting" in kind
        ):
            return obj

        for value in obj.values():
            found = find_jobposting(value)
            if found:
                return found

    elif isinstance(obj, list):
        for item in obj:
            found = find_jobposting(item)
            if found:
                return found

    return None


def extract_jsonld(html: str) -> dict[str, Any] | None:
    soup = BeautifulSoup(html, "html.parser")

    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text()
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue

        found = find_jobposting(data)
        if found:
            return found

    return None


def jsonld_locations(job: dict[str, Any]) -> list[str]:
    raw = job.get("jobLocation") or []
    if not isinstance(raw, list):
        raw = [raw]

    result = []
    for location in raw:
        if not isinstance(location, dict):
            continue
        address = location.get("address") or {}

        if isinstance(address, str):
            result.append(address)
            continue
        if not isinstance(address, dict):
            continue

        parts = [
            address.get("streetAddress"),
            address.get("addressLocality"),
            address.get("addressRegion"),
            address.get("postalCode"),
            address.get("addressCountry"),
        ]
        text = ", ".join(str(x).strip() for x in parts if x)
        if text:
            result.append(text)

    if job.get("jobLocationType") == "TELECOMMUTE" and not result:
        result.append("Remote")

    return list(dict.fromkeys(result))


def jsonld_salary(value: Any) -> str | None:
    if not isinstance(value, dict):
        return None

    currency = value.get("currency")
    amount = value.get("value")
    if not isinstance(amount, dict):
        return str(amount) if amount is not None else None

    minimum = amount.get("minValue")
    maximum = amount.get("maxValue")
    exact = amount.get("value")
    unit = amount.get("unitText")

    if minimum is not None or maximum is not None:
        left = f"{currency or ''} {minimum}".strip() if minimum is not None else ""
        right = f"{currency or ''} {maximum}".strip() if maximum is not None else ""
        text = f"{left} - {right}".strip(" -")
    elif exact is not None:
        text = f"{currency or ''} {exact}".strip()
    else:
        return None

    return f"{text} / {unit}" if unit else text


def from_jsonld(job: dict[str, Any], source_url: str, platform: ATS) -> JobPosting:
    organization = job.get("hiringOrganization") or {}
    company = organization.get("name") if isinstance(organization, dict) else None

    identifier = job.get("identifier")
    if isinstance(identifier, dict):
        external_id = identifier.get("value") or identifier.get("name")
    else:
        external_id = identifier

    description = job.get("description")

    return JobPosting(
        platform=platform,
        source_url=source_url,
        canonical_url=job.get("url") or source_url,
        external_id=str(external_id) if external_id is not None else None,
        title=(job.get("title") or job.get("name") or "").strip(),
        company=company,
        locations=jsonld_locations(job),
        employment_type=job.get("employmentType"),
        workplace_type=(
            "Remote" if job.get("jobLocationType") == "TELECOMMUTE" else None
        ),
        date_posted=job.get("datePosted"),
        valid_through=job.get("validThrough"),
        description_html=description,
        description_text=clean_text(description),
        salary_text=jsonld_salary(job.get("baseSalary")),
        apply_url=job.get("url") or source_url,
    )


def score_job_dict(obj: dict[str, Any]) -> int:
    keys = {str(k).lower() for k in obj}
    score = 0

    if {"title", "description"} <= keys:
        score += 6
    if "jobdescription" in keys or "descriptionhtml" in keys:
        score += 5
    if {"jobid", "reqid", "jobreqid", "referenceid"} & keys:
        score += 3
    if {"applyurl", "externalurl", "joburl"} & keys:
        score += 2
    if {"location", "city"} & keys:
        score += 1

    return score


def best_job_dict(obj: Any) -> dict[str, Any] | None:
    best_score = 0
    best = None

    def walk(value: Any) -> None:
        nonlocal best_score, best

        if isinstance(value, dict):
            score = score_job_dict(value)
            if score > best_score:
                best_score, best = score, value
            for child in value.values():
                walk(child)

        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(obj)
    return best if best_score >= 6 else None


def map_generic_dict(
    data: dict[str, Any],
    source_url: str,
    platform: ATS,
) -> JobPosting | None:
    if isinstance(data.get("jobPostingInfo"), dict):
        data = data["jobPostingInfo"]

    title = data.get("title") or data.get("name")
    description = (
        data.get("description")
        or data.get("jobDescription")
        or data.get("descriptionHtml")
    )

    if not title:
        return None

    company = data.get("companyName")
    org = data.get("hiringOrganization")
    if not company and isinstance(org, dict):
        company = org.get("name")

    locations = []
    location = data.get("location")

    if isinstance(location, str) and location.strip():
        locations.append(location.strip())
    elif isinstance(location, dict):
        text = (
            location.get("fullLocation")
            or location.get("name")
            or location.get("descriptor")
        )
        if text:
            locations.append(str(text))

    city_text = ", ".join(
        str(x) for x in [data.get("city"), data.get("state"), data.get("country")] if x
    )
    if city_text:
        locations.append(city_text)

    for item in data.get("additionalLocations") or data.get("multiLocation") or []:
        if isinstance(item, str):
            locations.append(item)
        elif isinstance(item, dict):
            text = item.get("location") or item.get("name") or item.get("descriptor")
            if text:
                locations.append(str(text))

    external_id = (
        data.get("jobId")
        or data.get("reqId")
        or data.get("jobReqId")
        or data.get("referenceId")
        or data.get("requisitionId")
        or data.get("id")
    )

    apply_url = (
        data.get("applyUrl")
        or data.get("externalUrl")
        or data.get("jobUrl")
        or source_url
    )

    return JobPosting(
        platform=platform,
        source_url=source_url,
        canonical_url=data.get("jobUrl") or data.get("externalUrl") or source_url,
        external_id=str(external_id) if external_id is not None else None,
        title=str(title).strip(),
        company=str(company).strip() if company else None,
        locations=list(dict.fromkeys(x for x in locations if x)),
        department=data.get("department") if isinstance(data.get("department"), str) else None,
        team=data.get("team") if isinstance(data.get("team"), str) else None,
        employment_type=data.get("employmentType") or data.get("timeType"),
        workplace_type=data.get("workplaceType"),
        date_posted=(
            data.get("datePosted")
            or data.get("postedDate")
            or data.get("publishedAt")
            or data.get("startDate")
        ),
        description_html=str(description) if description else None,
        description_text=clean_text(str(description)) if description else None,
        apply_url=str(apply_url),
    )


def browser_extract(url: str) -> JobPosting:
    """
    Used for Phenom/custom career sites and as the final fallback.
    Captures JSON network responses and rendered JSON-LD.
    """
    captured_json: list[tuple[str, Any]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-dev-shm-usage", "--no-sandbox"],
        )
        context = browser.new_context(
            user_agent=USER_AGENT,
            locale="en-US",
            viewport={"width": 1440, "height": 1000},
        )
        page = context.new_page()
        checked_hosts: set[str] = set()

        def allow_public_request(route: Any) -> None:
            request_url = route.request.url
            parsed = urlparse(request_url)

            # Chromium uses data/blob URLs for page-local resources.
            if parsed.scheme not in {"http", "https"}:
                route.continue_()
                return

            host = parsed.hostname or ""
            try:
                if host not in checked_hosts:
                    assert_public_host(request_url)
                    checked_hosts.add(host)
                route.continue_()
            except JobImportError:
                route.abort("blockedbyclient")

        page.route("**/*", allow_public_request)

        def on_response(response: Any) -> None:
            content_type = response.headers.get("content-type", "").lower()
            response_url = response.url.lower()

            if "json" not in content_type:
                return
            if not any(
                x in response_url
                for x in ("job", "career", "posting", "requisition", "search")
            ):
                return

            try:
                captured_json.append((response.url, response.json()))
            except Exception:
                pass

        page.on("response", on_response)

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)

            try:
                page.wait_for_load_state("networkidle", timeout=5_000)
            except PlaywrightTimeoutError:
                pass

            page.wait_for_timeout(800)

            final_url = page.url
            assert_public_host(final_url)

            html = page.content()
            page_title = page.title()
            try:
                body_text = page.locator("body").inner_text(timeout=5_000)
            except Exception:
                body_text = ""

        finally:
            context.close()
            browser.close()

    network_urls = [x[0] for x in captured_json]
    platform = detect_platform(final_url, html, network_urls)

    # Best generic source: schema.org JobPosting.
    job_ld = extract_jsonld(html)
    if job_ld:
        result = from_jsonld(job_ld, final_url, platform)
        result.source_url = url
        return result

    # SPA JSON/XHR fallback, useful for Phenom/custom career sites.
    best_score = 0
    best = None

    for _, payload in captured_json:
        candidate = best_job_dict(payload)
        if candidate:
            score = score_job_dict(candidate)
            if score > best_score:
                best_score, best = score, candidate

    if best:
        mapped = map_generic_dict(best, url, platform)
        if mapped:
            return mapped

    # Last resort: visible rendered page.
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    title = h1.get_text(" ", strip=True) if h1 else page_title

    site_name = soup.find("meta", attrs={"property": "og:site_name"})
    company = (
        site_name.get("content", "").strip()
        if site_name and site_name.get("content")
        else None
    )

    main = soup.find("main")
    description = (
        main.get_text("\n", strip=True) if main else body_text.strip()
    )

    if not title:
        raise JobImportError("Could not identify a job title.")

    return JobPosting(
        platform=platform,
        source_url=url,
        canonical_url=final_url,
        title=title.strip(),
        company=company,
        description_text=description[:100_000] or None,
        apply_url=final_url,
        metadata={"fallback": "rendered_visible_text"},
    )


def try_plain_jsonld(url: str, fetcher: Fetcher) -> JobPosting | None:
    try:
        response = fetcher.get(url)
    except Exception:
        return None

    if "html" not in response.headers.get("content-type", "").lower():
        return None

    platform = detect_platform(str(response.url), response.text)
    job_ld = extract_jsonld(response.text)

    return from_jsonld(job_ld, url, platform) if job_ld else None


def import_job(raw_url: str) -> JobPosting:
    """
    Public entry point.

    Order:
      1. ATS-native API when the URL is recognizable.
      2. Cheap HTML + JSON-LD.
      3. Playwright rendered page/network fallback.
    """
    url = normalize_url(raw_url)
    assert_public_host(url)

    platform = detect_platform(url)
    fetcher = Fetcher()

    try:
        adapters = {
            ATS.GREENHOUSE: import_greenhouse,
            ATS.LEVER: import_lever,
            ATS.ASHBY: import_ashby,
            ATS.WORKDAY: import_workday,
        }

        adapter = adapters.get(platform)
        if adapter:
            try:
                result = adapter(url, fetcher)
                if result.title:
                    return result
            except Exception:
                # A custom/embedded career page may not match the hosted ATS URL
                # shape. Fall through instead of failing the entire import.
                pass

        plain = try_plain_jsonld(url, fetcher)
        if plain and plain.title:
            return plain

    finally:
        fetcher.close()

    return browser_extract(url)


if __name__ == "__main__":
    amd_url = (
        "https://careers.amd.com/careers-home/jobs/90947"
        "?jr_id=6a879555680f314a29d39758"
    )
    job = import_job(amd_url)
    print(job.model_dump_json(indent=2))
