# Usage Guide - AI-Powered Job Aggregator

Welcome to the Usage Guide! This document explains how you can interact with the system once the server is running. You can use tools like **Postman**, **cURL**, or the built-in **Swagger UI** (`http://localhost:5000/api-docs`) to test these features.

## 1. Finding & Viewing Jobs (Public Endpoints)

These endpoints do **not** require any authentication. They are designed for your frontend application to fetch data for users.

### 🔍 Searching for Jobs (Hybrid AI Search)
The system uses an AI-powered hybrid search combining vector similarity and traditional keyword matching. 

**Endpoint:** `GET /api/v1/jobs/search`

**Examples:**

1. **Basic Semantic Search:**
   Find jobs matching an intent, even if they don't use the exact keywords.
   ```http
   GET /api/v1/jobs/search?q=I want to build machine learning models
   ```

2. **Filtered Search:**
   Combine semantic search with exact filters.
   ```http
   GET /api/v1/jobs/search?q=Software Engineer&location=Remote&employmentType=FULL_TIME
   ```

3. **Salary & Pagination:**
   Get page 2 of jobs paying over $100,000.
   ```http
   GET /api/v1/jobs/search?salaryMin=100000&page=2&limit=10
   ```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "title": "Senior AI Engineer",
      "company": "TechCorp",
      "location": "Remote",
      "salaryMin": 120000,
      "salaryMax": 160000
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "totalPages": 5
  }
}
```

### 📄 Viewing Job Details
Get the full details of a specific job posting.

**Endpoint:** `GET /api/v1/jobs/:id`

**Example:**
```http
GET /api/v1/jobs/abc-123
```

---

## 2. Managing the Platform (Admin Endpoints)

Admin endpoints require an `Authorization` header containing a valid JWT Bearer token.

### 🔑 Step 1: Login to get your Token
**Endpoint:** `POST /api/v1/auth/login`

**Body:**
```json
{
  "email": "admin@jobaggregator.local",
  "password": "admin123"
}
```
*Copy the `accessToken` from the response.*

### 🕷️ Step 2: Adding and Managing Sources (Websites to Crawl)
Sources define where the AI crawler goes to find jobs.

**Add a new source:**
`POST /api/v1/admin/sources`
```json
{
  "name": "RemoteOK",
  "baseUrl": "https://remoteok.com",
  "crawlFrequency": "12" 
}
```
*(Note: Requires the JWT token in your `Authorization: Bearer <token>` header)*

**Trigger an immediate crawl:**
If you don't want to wait for the schedule, you can force the crawler to run immediately.
`POST /api/v1/admin/sources/{source_id}/crawl-now`

### 📊 Step 3: View Dashboard Analytics
See how many jobs have been crawled, success rates, and what people are searching for.

**Endpoint:** `GET /api/v1/admin/analytics/dashboard`
*(Requires Auth)*

### 🛠️ Step 4: Moderating Jobs
If you need to hide a job or delete it.

**Endpoint:** `PATCH /api/v1/admin/jobs/{job_id}/status`
*(Requires Auth)*

**Body:**
```json
{
  "status": "INACTIVE"
}
```
*(Valid statuses: `ACTIVE`, `INACTIVE`, `DELETED`)*

---

## Testing with Swagger UI

The absolute easiest way to learn and test the API is through the Swagger Interface.

1. Ensure your server is running (`npm run dev`).
2. Open your browser and go to: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
3. Click the green **Authorize** button at the top right.
4. If you don't have a token, scroll down to the `POST /api/v1/auth/login` endpoint, click **Try it out**, enter the admin credentials, and copy the returned `accessToken`.
5. Paste the token into the Authorize box and click **Authorize**.
6. You can now click **Try it out** on any endpoint in the list!
