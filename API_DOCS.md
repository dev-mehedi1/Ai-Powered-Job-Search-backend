# Job Aggregator API Documentation

This document outlines the REST API endpoints available in the AI-Powered Job Aggregator backend.

## Base URL
All API endpoints are prefixed with `/api/v1`.

## Authentication
Admin endpoints require a JSON Web Token (JWT) provided in the `Authorization` header.

**Format:**
```
Authorization: Bearer <your_access_token>
```

---

## 1. Authentication Endpoints

### 1.1 Register Admin
Register a new administrator.
* **URL:** `/auth/register`
* **Method:** `POST`
* **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "strongPassword123"
  }
  ```
* **Response:**
  * `201 Created`: Returns user details and tokens (access & refresh).

### 1.2 Login
Authenticate an administrator.
* **URL:** `/auth/login`
* **Method:** `POST`
* **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "strongPassword123"
  }
  ```
* **Response:**
  * `200 OK`: Returns user details and tokens.

### 1.3 Refresh Token
Get a new access token using a refresh token.
* **URL:** `/auth/refresh`
* **Method:** `POST`
* **Body:**
  ```json
  {
    "refreshToken": "<your_refresh_token>"
  }
  ```
* **Response:**
  * `200 OK`: Returns a new access token.

### 1.4 Logout
Invalidate the current refresh token.
* **URL:** `/auth/logout`
* **Method:** `POST`
* **Headers:** `Authorization: Bearer <token>`
* **Response:**
  * `200 OK`

### 1.5 Get Profile
Get the currently authenticated admin's profile.
* **URL:** `/auth/profile`
* **Method:** `GET`
* **Headers:** `Authorization: Bearer <token>`
* **Response:**
  * `200 OK`: Returns user profile.

---

## 2. Public Job Search Endpoints

### 2.1 Search Jobs (Hybrid Search)
Perform a vector + full-text hybrid search across the job database.
* **URL:** `/jobs/search`
* **Method:** `GET`
* **Query Parameters:**
  * `q` (string): The search query (e.g., "Software Engineer in NYC").
  * `location` (string): Filter by location.
  * `employmentType` (string): Filter by type (e.g., `FULL_TIME`).
  * `salaryMin` (number): Minimum salary limit.
  * `salaryMax` (number): Maximum salary limit.
  * `page` (number): Pagination page (default: 1).
  * `limit` (number): Results per page (default: 20).
* **Response:**
  * `200 OK`: Returns an array of matched jobs and total count.

### 2.2 Get Job Details
Retrieve detailed information about a single active job.
* **URL:** `/jobs/:id`
* **Method:** `GET`
* **Response:**
  * `200 OK`: Returns full job object.

---

## 3. Admin: Job Management Endpoints (Requires Auth)

### 3.1 List All Jobs
* **URL:** `/admin/jobs`
* **Method:** `GET`
* **Query Parameters:** `status`, `sourceId`, `employmentType`, `search`, `page`, `limit`.
* **Response:** `200 OK`

### 3.2 Get Job Statistics
* **URL:** `/admin/jobs/stats`
* **Method:** `GET`
* **Response:** `200 OK`: Returns total, active, inactive, and deleted counts.

### 3.3 Update Job Status
* **URL:** `/admin/jobs/:id/status`
* **Method:** `PATCH`
* **Body:**
  ```json
  {
    "status": "ACTIVE" // ACTIVE, INACTIVE, or DELETED
  }
  ```
* **Response:** `200 OK`

### 3.4 Bulk Update Job Status
* **URL:** `/admin/jobs/bulk-status`
* **Method:** `POST`
* **Body:**
  ```json
  {
    "ids": ["uuid-1", "uuid-2"],
    "status": "INACTIVE"
  }
  ```
* **Response:** `200 OK`

---

## 4. Admin: Source Management Endpoints (Requires Auth)

Sources define the websites that the crawler will target.

### 4.1 Create Source
* **URL:** `/admin/sources`
* **Method:** `POST`
* **Body:**
  ```json
  {
    "name": "Acme Jobs",
    "baseUrl": "https://acme-jobs.com",
    "frequency": 24
  }
  ```
* **Response:** `201 Created`

### 4.2 List Sources
* **URL:** `/admin/sources`
* **Method:** `GET`
* **Response:** `200 OK`

### 4.3 Start/Stop Source Crawling
* **URL:** `/admin/sources/:id/start` OR `/admin/sources/:id/stop`
* **Method:** `POST`
* **Response:** `200 OK` (enables or disables the cron crawling for this source).

### 4.4 Trigger Immediate Crawl
* **URL:** `/admin/sources/:id/crawl-now`
* **Method:** `POST`
* **Response:** `200 OK`: Initiates a background crawling job immediately.

---

## 5. Admin: Analytics Endpoints (Requires Auth)

### 5.1 Dashboard Statistics
* **URL:** `/admin/analytics/dashboard`
* **Method:** `GET`
* **Response:** `200 OK`: Returns aggregated stats on crawling success rates, search queries, job distribution by source, and growth metrics.

---

*Note: For interactive API exploration, start the server and navigate to `http://localhost:<PORT>/api-docs` to view the Swagger interface.*
