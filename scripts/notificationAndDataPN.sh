#!/bin/bash

# --- Configuration ---

# IMPORTANT: Replace with the actual filename of your service account key JSON file
# Make sure this file is in the same directory as your script, or provide the full path.
SERVICE_ACCOUNT_KEY_FILE="service-account-creds.json" # <-- Using the filename you mentioned

# IMPORTANT: Replace with the FCM registration token of the device you want to target.
TARGET_TOKEN="fcm-token-here" # <-- Using the token you provided

# Your Firebase Project ID (like 'paranoid-galaxy').
PROJECT_ID="project-id-from-project-settings" # <-- Using your project ID

# The Title of your notification
NOTIFICATION_TITLE="Notification via cURL"

# The Body text of your notification
NOTIFICATION_BODY="Sent directly to the FCM API!"

# Custom Data Payload (as a JSON string)
# This data goes directly to your app's background handling logic or intent.
CUSTOM_DATA='{
  "action": "check_status",
  "orderId": "ABC789",
  "source": "script",
  "sentAt": "'$(date +%s)'"
}'

# --- Script Logic ---

echo "--- Starting FCM Send Script via cURL ---"

# 1. Activate the service account to allow gcloud to print an access token
# We still use this step because gcloud is the easiest way in shell to get an access token from the key file.
echo "Activating service account using key file: ${SERVICE_ACCOUNT_KEY_FILE}"
gcloud auth activate-service-account --key-file="${SERVICE_ACCOUNT_KEY_FILE}"

# Check if the activation failed
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to activate service account. Please check the key file path and contents."
  echo "NOTE: While we're not using 'gcloud firebase messaging', we still need gcloud to generate an access token."
  exit 1
fi

# 2. Obtain an access token for the service account
echo "Obtaining access token..."
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Check if obtaining token failed
if [ $? -ne 0 ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to obtain access token. Ensure gcloud can authenticate with the service account."
  exit 1
fi

echo "Access token obtained."

# 3. Define the FCM v1 API endpoint
FCM_API_ENDPOINT="https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send"

# 4. Construct the JSON request body for the API
# We use a heredoc (<<EOF) to define a multi-line string in the shell script.
# The JSON structure follows the FCM v1 API format.
JSON_PAYLOAD=$(cat <<EOF
{
  "message": {
    "token": "${TARGET_TOKEN}",
    "notification": {
      "title": "${NOTIFICATION_TITLE}",
      "body": "${NOTIFICATION_BODY}"
    },
    "data": ${CUSTOM_DATA}
  }
}
EOF
)

# 5. Send the POST request using curl
echo "Sending message via cURL to: ${FCM_API_ENDPOINT}"
echo "Payload:"
echo "${JSON_PAYLOAD}"

curl -X POST "${FCM_API_ENDPOINT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${JSON_PAYLOAD}"

# Check if curl command failed
if [ $? -ne 0 ]; then
  echo "ERROR: cURL command failed."
  exit 1
fi

echo "" # Add a newline for cleaner output after curl
echo "--- cURL request sent. Check the response above for API status. ---"
# Note: The API will return JSON indicating success or failure.
# You might want to parse the curl output for detailed success/error checking.

# --- End of Script ---
