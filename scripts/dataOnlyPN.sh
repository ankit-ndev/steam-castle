#!/bin/bash

# --- Configuration ---

# IMPORTANT: Replace with the actual filename of your service account key JSON file
# Make sure this file is in the same directory as your script, or provide the full path.
SERVICE_ACCOUNT_KEY_FILE="service-account-creds.json" # <-- Using the filename you mentioned

# IMPORTANT: Replace with the FCM registration token of the device you want to target.
TARGET_TOKEN="fcm-token-here" # <-- Using the token you provided

# Your Firebase Project ID (like 'paranoid-galaxy').
PROJECT_ID="project-id-from-project-settings"

# Custom Data Payload (as a JSON string)
# This data goes directly to your app's background handling logic or intent.
CUSTOM_DATA='{
  "action": "check_status",
  "orderId": "ABC789-xxttr",
  "source": "script",
  "eventType": "silent_update",
  "timestamp": "'$(date +%s)'"
}'

# --- Script Logic ---

echo "--- Starting FCM Data-Only Send Script via cURL ---"

echo "Activating service account using key file: ${SERVICE_ACCOUNT_KEY_FILE}"
gcloud auth activate-service-account --key-file="${SERVICE_ACCOUNT_KEY_FILE}"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to activate service account. Please check the key file path and contents."
  exit 1
fi

echo "Obtaining access token..."
ACCESS_TOKEN=$(gcloud auth print-access-token)

if [ $? -ne 0 ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to obtain access token. Ensure gcloud can authenticate with the service account."
  exit 1
fi

echo "Access token obtained."

FCM_API_ENDPOINT="https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send"

# Construct the JSON request body for the API
# IMPORTANT: The 'notification' block is entirely removed for a data-only message.
JSON_PAYLOAD=$(cat <<EOF
{
  "message": {
    "token": "${TARGET_TOKEN}",
    "data": ${CUSTOM_DATA},
    "android": {
      "priority": "HIGH"
    }
  }
}
EOF
)

echo "Sending data-only message via cURL to: ${FCM_API_ENDPOINT}"
echo "Payload:"
echo "${JSON_PAYLOAD}"

curl -X POST "${FCM_API_ENDPOINT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${JSON_PAYLOAD}"

if [ $? -ne 0 ]; then
  echo "ERROR: cURL command failed."
  exit 1
fi

echo ""
echo "--- cURL request sent. Check the response above for API status. ---"