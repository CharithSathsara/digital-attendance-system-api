# API examples

Assume the API is running on `http://localhost:3000`.

## 1. Health

```http
GET /health
```

## 2. Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "staff1@example.com",
  "password": "password"
}
```

## 3. Current user

```http
GET /api/v1/auth/me
```

## 4. Get classes

```http
GET /api/v1/classes
```

## 5. Get students in class

```http
GET /api/v1/classes/1/students
```

## 6. Enroll student

```http
POST /api/v1/classes/1/students
Content-Type: application/json

{
  "studentId": 1
}
```

## 7. Create session

```http
POST /api/v1/classes/1/sessions
Content-Type: application/json

{
  "sessionDate": "2026-09-07",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

## 8. Open session

```http
POST /api/v1/sessions/1/open
```

## 9. Generate student QR

```http
POST /api/v1/students/1/qr
```

Response contains an opaque `qrToken`. Generate the QR image in the frontend from this token.

## 10. Record attendance

```http
POST /api/v1/sessions/1/attendance
Content-Type: application/json

{
  "qrToken": "opaque-token-from-student-qr"
}
```

## 11. Record payment

```http
POST /api/v1/payments
Content-Type: application/json

{
  "enrollmentId": 1,
  "billingMonth": "2026-09-01",
  "amount": 2500
}
```

## 12. Payment history

```http
GET /api/v1/enrollments/1/payments
```

## 13. Close session

```http
POST /api/v1/sessions/1/close
```
