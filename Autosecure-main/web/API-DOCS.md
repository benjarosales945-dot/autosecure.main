# AutoSecure License API Documentation

## Base URL
```
http://localhost:3001
```

## Endpoints

### 1. Validar License Key
**Endpoint:** `POST /api/validate-license`

**Request:**
```json
{
  "license": "AS-xxxxxxxxxxxxxxxx"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "userId": "user_1234567890",
  "expiresAt": "2026-03-02T12:00:00.000Z",
  "firstTime": false
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "message": "Invalid license key"
}
```

**Response (Expired):**
```json
{
  "success": false,
  "message": "License expired",
  "expired": true
}
```

---

### 2. Verificar Token
**Endpoint:** `POST /api/verify-token`

**Request:**
```json
{
  "token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user_1234567890",
  "license": "AS-xxxxxxxxxxxxxxxx"
}
```

---

### 3. Obtener Datos del Usuario
**Endpoint:** `GET /api/user-data`

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "userId": "user_1234567890",
  "accounts": [
    {
      "id": 1,
      "user_id": "user_1234567890",
      "email": "user@example.com",
      "newName": "PlayerName",
      "secured": 1,
      "time": "2025-12-01T10:30:00Z"
    }
  ],
  "settings": {},
  "license": {
    "license": "AS-xxxxxxxxxxxxxxxx",
    "user_id": "user_1234567890",
    "expiry": "2026-03-02T12:00:00.000Z"
  }
}
```

---

### 4. Health Check
**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "success": true,
  "message": "API is running"
}
```

---

## JavaScript Integration Example

```javascript
// 1. Validar license key
async function validateLicense(license) {
  const response = await fetch('http://localhost:3001/api/validate-license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license })
  });
  return await response.json();
}

// 2. Usar el token para obtener datos
async function getUserData(token) {
  const response = await fetch('http://localhost:3001/api/user-data', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// 3. Ejemplo de flujo completo
async function loginWithLicense(license) {
  const result = await validateLicense(license);
  
  if (result.success) {
    localStorage.setItem('token', result.token);
    localStorage.setItem('userId', result.userId);
    
    const userData = await getUserData(result.token);
    console.log('User accounts:', userData.accounts);
  }
}
```

---

## Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "No token provided"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "License key required"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Server error: [error message]"
}
```
