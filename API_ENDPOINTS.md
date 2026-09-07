# API V1 endpoint map

| Method | Endpoint | Access |
|---|---|---|
| GET | /health | Public |
| POST | /api/v1/auth/login | Public |
| POST | /api/v1/auth/logout | Authenticated |
| GET | /api/v1/auth/me | Authenticated |
| GET | /api/v1/classes | Authenticated |
| POST | /api/v1/classes | ADMIN |
| GET | /api/v1/classes/:id | Authorized |
| GET | /api/v1/classes/:id/students | Authorized |
| POST | /api/v1/classes/:id/students | ADMIN/STAFF |
| POST | /api/v1/classes/:id/sessions | ADMIN/STAFF/TEACHER |
| GET | /api/v1/classes/:id/sessions | Authorized |
| POST | /api/v1/sessions/:id/open | Authorized |
| POST | /api/v1/sessions/:id/close | Authorized |
| POST | /api/v1/sessions/:id/attendance | Authorized |
| GET | /api/v1/students | Authorized |
| GET | /api/v1/students/:id | Authorized |
| POST | /api/v1/students/:id/qr | Authorized |
| POST | /api/v1/payments | ADMIN/STAFF |
| GET | /api/v1/enrollments/:id/payments | Authorized |
