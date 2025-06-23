package com.steamcastle

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

// MyFirebaseMessagingService handles incoming FCM messages and token refreshes.
class MyFirebaseMessagingService : FirebaseMessagingService() {

    private val TAG = "MyFirebaseMsgService"
    private val CHANNEL_ID = "default_channel_id" // Default notification channel ID
    private val CHANNEL_NAME = "Default Channel" // Default notification channel name

    /**
     * Called when message is received.
     * This method is called when a notification message is received while the app is in the foreground.
     * When the app is in the background, this method is not called, and the system automatically displays
     * the notification. When the user taps on the background notification, the onNotificationOpenedApp
     * listener in React Native is triggered.
     *
     * @param remoteMessage Object representing the FCM message received.
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}")

        // Check if message contains a data payload.
        remoteMessage.data.isNotEmpty().let {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            // Handle data payload here. You might want to send a local broadcast
            // or update UI if your app is in the foreground.
            // For simple foreground notifications, you can display a local notification.
            remoteMessage.notification?.let { notification ->
                sendNotification(notification.title, notification.body, remoteMessage.data)
            }
        }

        // Check if message contains a notification payload.
        remoteMessage.notification?.let {
            Log.d(TAG, "Message Notification Body: ${it.body}")
            // For notification messages, display a notification.
            // If the app is in the foreground, this will show a head-up notification.
            // If the app is in the background, Firebase automatically handles the display.
            sendNotification(it.title, it.body, remoteMessage.data)
        }
    }

    /**
     * Called if the FCM registration token is updated. This may occur if the previous token had
     * been compromised (e.g. device restore) or if the OS has reinstalled the app.
     *
     * @param token The new token.
     */
    override fun onNewToken(token: String) {
        Log.d(TAG, "Refreshed token: $token")

        // If you want to send messages to this application instance or
        // manage this apps subscriptions on the server side, send the
        // FCM registration token to your app server.
        sendRegistrationToServer(token)
    }

    /**
     * Persist token to third-party servers.
     *
     * @param token The new token.
     */
    private fun sendRegistrationToServer(token: String?) {
        // TODO: Implement this method to send token to your app server.
        Log.d(TAG, "Sending token to server: $token")
    }

    /**
     * Create and show a simple notification containing the received FCM message.
     * This method is used to display local notifications, primarily when the app is in the foreground.
     * For background notifications, Firebase handles the display automatically based on the notification payload.
     *
     * @param messageTitle FCM message title.
     * @param messageBody FCM message body.
     * @param data Optional data payload to pass to the activity when notification is tapped.
     */
    private fun sendNotification(messageTitle: String?, messageBody: String?, data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            // Attach data payload to the intent
            data.forEach { (key, value) -> putExtra(key, value) }
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0 /* Request code */, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE // Use FLAG_IMMUTABLE for API 23+
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher) // Set your app icon
            .setContentTitle(messageTitle ?: "FCM Message") // Use messageTitle or a default
            .setContentText(messageBody ?: "New Message") // Use messageBody or a default
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH) // For head-up notifications

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Since Android 8.0 (API level 26) notification channels are required.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH // For head-up notifications
            )
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(0 /* ID of notification */, notificationBuilder.build())
    }
}