# Tuition Management API V1

Simple REST API for the Sri Lankan tuition-class management system.

## Stack

- Express 5
- TypeScript
- PostgreSQL
- `pg`
- bcrypt
- express-session
- Zod

## Architecture

```text
React Web / Future Mobile
          |
          | REST / HTTPS
          v
   Express API V1
          |
          v
      PostgreSQL
```

This is intentionally a modular monolith. There are no microservices.

## Domain

```text
Institution
  |
  +-- TeacherInstitution -- Teacher -- UserAccount
  |
  +-- InstitutionMembership -- UserAccount
  |
  +-- Class -- ClassSession
  |      |
  |      +-- Enrollment -- Student -- StudentQrCredential
  |      |
  |      +-- Attendance
  |
  +-- Payment (through Enrollment)
```

## Roles

### ADMIN
- Access institution(s) where they have membership
- Create classes
- View classes/students/sessions
- Manage enrollments
- Manage QR credentials
- Record payments

### STAFF
- Access institution(s) where they have membership
- View classes/students/sessions
- Start/close sessions
- Scan QR attendance
- Record manual payments

### TEACHER
- Logs in using their own account
- Sees all classes where they are the teacher
- Can create/list sessions for their classes
- Can open/close their sessions
- Can record attendance for their sessions

Students do not log in in V1.

## Authentication

V1 uses an HTTP-only session cookie.

Login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "teacher1@example.com",
  "password": "password"
}
```

The API stores the authenticated user in the server session.

For production, replace Express's default in-memory session store with a PostgreSQL/Redis-backed store.

## API

### Auth

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### Classes

```text
GET  /api/v1/classes
POST /api/v1/classes
GET  /api/v1/classes/:id
GET  /api/v1/classes/:id/students
POST /api/v1/classes/:id/students
```

### Sessions

```text
POST /api/v1/classes/:id/sessions
GET  /api/v1/classes/:id/sessions
POST /api/v1/sessions/:id/open
POST /api/v1/sessions/:id/close
POST /api/v1/sessions/:id/attendance
```

### Students

```text
GET  /api/v1/students
GET  /api/v1/students/:id
POST /api/v1/students/:id/qr
```

### Payments

```text
POST /api/v1/payments
GET  /api/v1/enrollments/:id/payments
```

## Attendance flow

1. Staff/teacher opens the class session.
2. Student shows their permanent QR.
3. Browser scanner reads the opaque QR token.
4. Frontend sends the token to the attendance endpoint.
5. API hashes the token with SHA-256.
6. API finds an active QR credential.
7. API resolves the student.
8. API verifies the student is actively enrolled in the session's class.
9. API inserts attendance.
10. Database unique constraint prevents the same student being recorded twice for one session.

Database rule:

```sql
UNIQUE(enrollment_id, class_session_id)
```

## QR security

The QR does not contain:

- student ID
- student name
- phone
- email

It contains only a random opaque token.

The raw token is not stored in PostgreSQL. Only its SHA-256 hash is stored.

When a new QR is issued, the previous active QR for the student is revoked.

## Payment rule

Payment belongs to an enrollment.

A monthly payment uses the first day of the month:

```text
2026-09-01
2026-10-01
2026-11-01
```

Database rule:

```sql
UNIQUE(enrollment_id, billing_month)
```

V1 allows an existing month's payment to be corrected by recording it again; the latest amount/user/time becomes the current payment record.

## Authorization

The API never trusts a URL ID by itself.

Examples:

- A teacher can only access classes where `class.teacher_id` equals their teacher ID.
- A staff member can only access classes/sessions belonging to an institution where they have `institution_membership`.
- A teacher cannot record attendance for another teacher's session.
- A staff member cannot record attendance for another institution's session.
- A class can only be created when the teacher is linked to that institution through `teacher_institution`.

## Database setup

Use the `schema.sql` and `seed.sql` from the database project.

Example:

```bash
createdb tuition

psql tuition < schema.sql
psql tuition < seed.sql
```

The API expects the database schema described by those files.

## Install

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Update `DATABASE_URL` and `SESSION_SECRET`.

## Development

```bash
npm run dev
```

API:

```text
http://localhost:3000
```

Health:

```text
GET http://localhost:3000/health
```

## Production build

```bash
npm run build
npm start
```

## Example API calls

### Login

```bash
curl -i \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"staff1@example.com","password":"password"}' \
  http://localhost:3000/api/v1/auth/login
```

### Get classes

```bash
curl \
  -b cookies.txt \
  http://localhost:3000/api/v1/classes
```

### Create session

```bash
curl \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "sessionDate":"2026-09-06",
    "startTime":"09:00",
    "endTime":"11:00"
  }' \
  http://localhost:3000/api/v1/classes/1/sessions
```

### Open session

```bash
curl \
  -b cookies.txt \
  -X POST \
  http://localhost:3000/api/v1/sessions/1/open
```

### Scan attendance

```bash
curl \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"qrToken":"TOKEN_FROM_QR_ISSUANCE"}' \
  http://localhost:3000/api/v1/sessions/1/attendance
```

### Record payment

```bash
curl \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId":1,
    "billingMonth":"2026-09-01",
    "amount":2500
  }' \
  http://localhost:3000/api/v1/payments
```

## Recommended V1 deployment improvement

Before production:

1. Use a persistent session store.
2. Put API behind HTTPS.
3. Add login rate limiting.
4. Add CSRF protection if using cross-site cookies.
5. Add structured request logging.
6. Add database migrations.
7. Add automated integration tests for login, authorization, attendance and payments.

Do not add microservices yet. The current system is small enough for one API.
