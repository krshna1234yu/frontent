# Gifther - OTP Phone Verification System

## Overview
This project includes a robust OTP (One-Time Password) verification system for phone numbers. It uses Twilio for sending SMS messages in production and includes a development mode that simulates SMS sending for testing.

## Setup Instructions

### 1. Install Dependencies
Make sure you have all the required dependencies:

```bash
npm install
```

### 2. Set Up Twilio Account
1. Sign up for a Twilio account at [https://www.twilio.com/](https://www.twilio.com/)
2. Purchase a phone number that can send SMS
3. Get your Account SID and Auth Token from the Twilio dashboard

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add the following:

```
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Environment
NODE_ENV=development  # Change to "production" for production
```

For production, make sure to set `NODE_ENV=production`.

### 4. API Endpoints

#### Send OTP
```
POST /api/auth/send-otp
```
Request body:
```json
{
  "phone": "1234567890", // 10-digit phone number
  "purpose": "registration" // Optional: "registration", "login", "password-reset", "profile-update"
}
```

Response (success):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": "10 minutes"
}
```

In development mode, the response also includes the OTP for testing:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": "10 minutes",
  "otp": "123456"
}
```

#### Verify OTP
```
POST /api/auth/verify-otp
```
Request body:
```json
{
  "phone": "1234567890",
  "otp": "123456"
}
```

Response (success):
```json
{
  "success": true,
  "message": "Phone number verified successfully"
}
```

### 5. Security Features

- OTPs expire after 10 minutes
- Maximum 5 verification attempts per OTP
- Rate limiting: maximum 5 OTP requests per phone number per hour
- OTPs are stored securely in the database
- All OTP records are automatically deleted after expiration
- Client IP address and user agent are logged for audit
- OTPs are never returned in API responses in production

### 6. Development Mode

In development mode (`NODE_ENV=development`):
- Real SMS messages are not sent
- OTPs are logged to the console
- OTPs are included in API responses for easier testing

### 7. Testing

Test the OTP system with the following commands:

```bash
# Send an OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890"}'

# Verify an OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890", "otp": "123456"}'
```

## Troubleshooting

### SMS not being sent
- Check that your Twilio account is active and funded
- Verify the phone number is in the correct format
- Ensure environment variables are set correctly
- Check the server logs for specific error messages

### OTP verification failing
- Ensure you're using the most recently generated OTP
- Check if the OTP has expired (10-minute lifetime)
- Verify you haven't exceeded the maximum attempts (5)
- Make sure the phone number matches the one used to generate the OTP 