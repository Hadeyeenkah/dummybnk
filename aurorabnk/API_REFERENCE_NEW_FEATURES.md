# API Reference - Admin Features

## Base URL
```
http://localhost:5001/api
```

---

## Transaction Management

### Edit Transaction
**Update an existing user transaction**

```
PATCH /admin/users/:userId/transactions/:transactionId
```

**Headers:**
```
Content-Type: application/json
Cookie: (authentication token)
```

**Request Body:**
```json
{
  "description": "Corrected transaction description",
  "amount": 150.00,
  "category": "Shopping",
  "accountType": "checking",
  "date": "2024-05-30"
}
```

**Response (Success - 200):**
```json
{
  "message": "Transaction updated successfully",
  "transaction": {
    "id": "507f1f77bcf86cd799439011",
    "description": "Corrected transaction description",
    "amount": 150.00,
    "category": "Shopping",
    "accountType": "checking",
    "date": "2024-05-30T00:00:00.000Z",
    "status": "completed"
  }
}
```

**Error Response (404):**
```json
{
  "message": "Transaction not found"
}
```

**Parameters:**
- `userId`: MongoDB ObjectId of the user
- `transactionId`: MongoDB ObjectId of the transaction
- `description` (optional): Transaction description (string)
- `amount` (optional): Transaction amount (number, can be negative)
- `category` (optional): Transaction category (string)
- `accountType` (optional): "checking" or "savings"
- `date` (optional): ISO date string (YYYY-MM-DD)

---

## Messaging

### Send Message to User
**Send a message that appears on user's dashboard**

```
POST /admin/users/:userId/messages
```

**Headers:**
```
Content-Type: application/json
Cookie: (authentication token)
```

**Request Body:**
```json
{
  "message": "Your account security has been updated. Please log in to review changes."
}
```

**Response (Success - 201):**
```json
{
  "message": "Message sent successfully",
  "data": {
    "message": "Your account security has been updated. Please log in to review changes.",
    "sender": "Bank Admin",
    "createdAt": "2024-05-30T14:25:00.000Z",
    "read": false
  }
}
```

**Error Response (400):**
```json
{
  "message": "Message cannot be empty"
}
```

**Parameters:**
- `userId`: MongoDB ObjectId of the user
- `message` (required): Message text (1-1000 characters)

---

### Get User Messages
**Retrieve all messages sent to a user**

```
GET /admin/users/:userId/messages
```

**Headers:**
```
Cookie: (authentication token)
```

**Response (Success - 200):**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "message": "Your account security has been updated.",
      "sender": "Bank Admin",
      "createdAt": "2024-05-30T14:25:00.000Z",
      "read": false
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "message": "Welcome to Aurora Bank!",
      "sender": "Bank Admin",
      "createdAt": "2024-05-28T10:00:00.000Z",
      "read": true
    }
  ]
}
```

**Parameters:**
- `userId`: MongoDB ObjectId of the user

---

### Mark Message as Read
**Mark a specific message as read by user**

```
PATCH /admin/users/:userId/messages/:messageId/read
```

**Headers:**
```
Cookie: (authentication token)
```

**Response (Success - 200):**
```json
{
  "message": "Message marked as read"
}
```

**Error Response (404):**
```json
{
  "message": "Message not found"
}
```

**Parameters:**
- `userId`: MongoDB ObjectId of the user
- `messageId`: MongoDB ObjectId of the message

---

## Authentication

All endpoints require:
1. **Admin Role**: User must have `role: 'admin'` in their account
2. **Valid Session**: Session cookie must be valid and not expired
3. **User Ownership**: For message endpoints, the user making the request must match the userId in the URL (or be admin)

**Response if not authenticated (401/403):**
```json
{
  "message": "Unauthorized"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider adding:
- Max 100 messages per admin per hour
- Max 1000 transaction edits per admin per day
- Request throttling to prevent abuse

---

## Data Validation

### Transaction Fields
| Field | Type | Valid Values | Example |
|-------|------|--------------|---------|
| description | string | 1-500 chars | "Grocery Store" |
| amount | number | any positive/negative | 150.50 or -150.50 |
| category | string | Income, Shopping, Dining, Bills, Transfer, Other | "Shopping" |
| accountType | string | "checking", "savings" | "checking" |
| date | string | ISO date (YYYY-MM-DD) | "2024-05-30" |

### Message Fields
| Field | Type | Valid Values | Example |
|-------|------|--------------|---------|
| message | string | 1-1000 chars | "Account security update..." |

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid data provided |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized (must be admin) |
| 404 | Not Found | User/Transaction/Message doesn't exist |
| 500 | Server Error | Internal server error |

---

## Example cURL Requests

### Edit Transaction
```bash
curl -X PATCH http://localhost:5001/api/admin/users/507f1f77bcf86cd799439010/transactions/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=abc123..." \
  -d '{
    "description": "Updated description",
    "amount": 250.00,
    "category": "Shopping",
    "accountType": "checking",
    "date": "2024-05-30"
  }'
```

### Send Message
```bash
curl -X POST http://localhost:5001/api/admin/users/507f1f77bcf86cd799439010/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=abc123..." \
  -d '{
    "message": "Important account security update. Please log in to review."
  }'
```

### Get Messages
```bash
curl -X GET http://localhost:5001/api/admin/users/507f1f77bcf86cd799439010/messages \
  -H "Cookie: connect.sid=abc123..."
```

---

## Frontend Integration

### React Fetch Example - Edit Transaction
```javascript
const handleEditTransaction = async (userId, transactionId, updatedData) => {
  try {
    const response = await fetch(
      `${apiBase}/admin/users/${userId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Transaction updated:', data.transaction);
    } else {
      const error = await response.json();
      console.error('Error:', error.message);
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
};
```

### React Fetch Example - Send Message
```javascript
const handleSendMessage = async (userId, message) => {
  try {
    const response = await fetch(
      `${apiBase}/admin/users/${userId}/messages`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Message sent:', data.data);
    } else {
      const error = await response.json();
      console.error('Error:', error.message);
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
};
```

---

## Database Schema

### User.messages Field
```javascript
messages: [
  {
    _id: ObjectId,
    message: String,
    sender: String (default: "Bank Admin"),
    createdAt: Date (default: current timestamp),
    read: Boolean (default: false)
  }
]
```

### Transaction Fields (Updated)
All existing transaction fields remain unchanged. Transactions can be edited via the new PATCH endpoint.

---

## Future Enhancements

Potential features for future implementation:
- [ ] Message scheduling (send at specific time)
- [ ] Message templates
- [ ] Bulk message sending to multiple users
- [ ] Message deletion/archiving
- [ ] User read receipts/notifications
- [ ] Message categories (security, promotional, informational)
- [ ] Audit logging for transaction edits
- [ ] Admin signature/identification in messages
- [ ] Rich text formatting for messages
- [ ] Message attachments
