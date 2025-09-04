import React, {useEffect, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  Clipboard,
  Pressable, // Keep Pressable for the display notification button
} from 'react-native';
import notifee, {EventType, AndroidImportance} from '@notifee/react-native';

import messaging from '@react-native-firebase/messaging';
import {getApp} from '@react-native-firebase/app'; // Ensure getApp is imported if used

/**
 * Main App component for handling Firebase notifications in React Native (Android).
 * It requests notification permissions, retrieves the FCM token, and listens for incoming notifications.
 */
function App() {
  const [fcmToken, setFcmToken] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  /**
   * Requests user permission for displaying notifications.
   * On Android, it specifically requests the POST_NOTIFICATIONS permission for Android 13 (API level 33) and above.
   * If permission is granted, it proceeds to get the FCM token.
   */
  const requestUserPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message:
              'This app needs access to your notifications to display important updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted on Android');
          getFCMToken();
        } else {
          console.log('Notification permission denied on Android');
          Alert.alert(
            'Permission Denied',
            'Notification permission was denied. You may not receive notifications.',
          );
        }
      } catch (err) {
        console.warn('Error requesting notification permission:', err);
      }
    } else {
      // Fallback for non-Android platforms (though iOS code is not required by user, it's good practice)
      // Use getApp().messaging() as per user's provided code for consistency
      const authStatus = await getApp().messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        getFCMToken();
      } else {
        console.log('Authorization status:', authStatus);
        Alert.alert(
          'Permission Denied',
          'Notification permission was denied. You may not receive notifications.',
        );
      }
    }
  };

  /**
   * Retrieves the Firebase Cloud Messaging (FCM) token for the device.
   * This token is unique to the app instance on the device and is used to send targeted push notifications.
   * The retrieved token is stored in the component's state.
   */
  const getFCMToken = async () => {
    try {
      // Use getApp().messaging() as per user's provided code for consistency
      const token = await getApp().messaging().getToken();
      if (token) {
        setFcmToken(token);
        console.log('FCM Token:', token);
      } else {
        console.log('No FCM token available.');
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  };

  /**
   * Copies the current FCM token to the device's clipboard.
   * Displays an alert indicating whether the copy operation was successful or if the token is not available.
   */
  const copyFcmTokenToClipboard = () => {
    if (fcmToken) {
      Clipboard.setString(fcmToken);
      Alert.alert('Copied!', 'FCM Token copied to clipboard.');
    } else {
      Alert.alert('Error', 'FCM Token not available to copy.');
    }
  };

  /**
   * Displays a local notification using Notifee with actionable buttons.
   * This function creates a notification channel (if not already existing) and then
   * displays a notification with 'Reply' and 'Mark as Read' actions.
   */
  const onDisplayNotification = async () => {
    // Request permissions (required for iOS, good practice for Android for direct display)
    await notifee.requestPermission();

    // Create a channel (required for Android 8.0+)
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH, // Set importance for head-up notifications
    });

    // Display a notification with actions
    await notifee.displayNotification({
      title: 'New Message from Sarah',
      body: 'Hey, are you free for a quick call today?',
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        actions: [
          {
            title: 'Reply',
            icon: 'https://placehold.co/128x128/000000/FFFFFF?text=R', // Placeholder icon for reply
            pressAction: {
              id: 'reply', // Unique ID
            },
            // Input field to the reply action
            input: {
              placeholder: 'Type your reply...',
            },
          },
          {
            title: 'Mark as Read',
            icon: 'https://placehold.co/128x128/000000/FFFFFF?text=M', // Placeholder icon for mark as read
            pressAction: {
              id: 'mark-as-read', // Unique ID for this action
            },
          },
        ],
      },
    });
  };

  /**
   * making small change with wrong commit message
   * useEffect hook to handle side effects related to Firebase messaging.
   * It requests user permission on component mount and sets up listeners for:
   * - Foreground messages (onMessage): triggered when a notification is received while the app is open.
   * - Notifications opening the app (onNotificationOpenedApp): triggered when a user taps a notification
   * and the app is in the background.
   * - Initial notification (getInitialNotification): checks if the app was launched by a notification
   * from a quit state.
   * - Notifee foreground events (onForegroundEvent): handles interactions with Notifee-displayed notifications
   * while the app is in the foreground.
   * Returns a cleanup function to unsubscribe from listeners when the component unmounts.
   */
  useEffect(() => {
    // Initialize Firebase App if not already done. The getApp() call is typically handled by
    // `@react-native-firebase/app` setup, but explicitly calling it here as per user's previous code.
    getApp();
    requestUserPermission();

    // Listener for messages received while the app is in the foreground.
    // This is for FCM messages, not for Notifee local notifications.
    const unsubscribeOnMessage = getApp()
      .messaging()
      .onMessage(async remoteMessage => {
        console.log(
          'FCM Message received in foreground:',
          JSON.stringify(remoteMessage),
        );
        setNotificationMessage(
          `FCM Foreground: ${remoteMessage.notification?.title || ''} - ${
            remoteMessage.notification?.body || ''
          }`,
        );
        Alert.alert(
          remoteMessage.notification?.title || 'New FCM Notification',
          remoteMessage.notification?.body || 'You have a new message!',
          [{text: 'OK', onPress: () => console.log('OK Pressed')}],
        );
      });

    // Listener for when a notification is tapped by the user, and the app is in the background.
    const unsubscribeOnNotificationOpenedApp = getApp()
      .messaging()
      .onNotificationOpenedApp(remoteMessage => {
        console.log(
          'Notification caused app to open from background state:',
          remoteMessage,
        );
        setNotificationMessage(
          `Opened from Background/Quit (FCM): ${
            remoteMessage.notification?.title || ''
          } - ${remoteMessage.notification?.body || ''}`,
        );
        // You can add navigation logic here based on remoteMessage.data
      });

    // Checks if the app was opened by a notification when it was initially launched from a quit state.
    getApp()
      .messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage,
          );
          setNotificationMessage(
            `Opened from Quit (FCM): ${
              remoteMessage.notification?.title || ''
            } - ${remoteMessage.notification?.body || ''}`,
          );
          // You can add initial navigation logic here based on remoteMessage.data
        }
      });

    // Notifee foreground event listener: This is called when a Notifee-displayed notification
    // is interacted with while the app is in the foreground.
    const unsubscribeNotifeeForegroundEvent = notifee.onForegroundEvent(
      ({type, detail}) => {
        switch (type) {
          case EventType.PRESS: // This event is called when the main body of a Notifee notification is pressed.
            console.log(
              'Notifee foreground event: User pressed notification body',
              detail.notification,
            );
            setNotificationMessage(
              `Notifee Pressed: ${detail.notification?.title || ''} - ${
                detail.notification?.body || ''
              }`,
            );
            // Handle notification body press when app is in foreground
            // detail.notification.data will contain the data you passed to displayNotification
            break;
          case EventType.DISMISSED: // This event is called when a Notifee notification is dismissed (e.g., swiped away).
            console.log(
              'Notifee event: EventType.DISMISSED',
              detail.notification,
            );
            setNotificationMessage(
              `Notifee Dismissed: ${detail.notification?.title || ''}`,
            );
            break;
          case EventType.DELIVERED: // This event is called when a Notifee notification is successfully delivered/displayed to the user.
            console.log(
              'Notifee event: EventType.DELIVERED',
              detail.notification,
            );
            // No need to update message here as it's just about delivery
            break;
          case EventType.ACTION_PRESS: // This event is called when a user presses an action button on a Notifee notification.
            console.log(
              'Notifee event: EventType.ACTION_PRESS',
              detail.notification,
              detail.pressAction,
            );
            // This is where you handle the action button press!
            // detail.pressAction.id will be 'reply' or 'mark-as-read' as defined in onDisplayNotification
            // detail.input will contain the text typed by the user if it's an input action
            if (detail.pressAction?.id === 'reply') {
              const replyText = detail.input;
              console.log('User replied:', replyText);
              setNotificationMessage(
                `Action: Reply -> "${replyText || 'No reply'}" from Notifee: ${
                  detail.notification?.title
                }`,
              );
              Alert.alert(
                'Reply Action',
                `You replied: "${replyText || 'No reply'}"`,
              );
            } else if (detail.pressAction?.id === 'mark-as-read') {
              console.log('User marked as read.');
              setNotificationMessage(
                `Action: Marked as Read from Notifee: ${detail.notification?.title}`,
              );
              Alert.alert(
                'Mark as Read Action',
                'Notification marked as read.',
              );
            } else if (detail.pressAction?.id === 'default') {
              console.log('default action');
              Alert.alert('Default Action', 'Notification marked as read.');
            }
            break;
          case EventType.APP_BLOCKED: // This event is called if the app's notification settings are blocked by the user.
            console.log('Notifee event: EventType.APP_BLOCKED', detail.blocked);
            setNotificationMessage(
              `App Notifications Blocked: ${detail.blocked ? 'Yes' : 'No'}`,
            );
            break;
        }
      },
    );

    // Cleanup function: Unsubscribe from all listeners when the component unmounts to prevent memory leaks.
    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeNotifeeForegroundEvent(); // Clean up Notifee listener
    };
  }, []); // Empty dependency array ensures this effect runs only once on component mount

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Notification Example (Android)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Your FCM Token:</Text>
        <TouchableOpacity
          onPress={copyFcmTokenToClipboard}
          style={styles.tokenContainer}>
          <Text style={styles.tokenText}>{fcmToken || 'Loading token...'}</Text>
        </TouchableOpacity>
        {fcmToken ? (
          <Text style={styles.hintText}>
            Tap above to copy token. Use this to send test notifications from
            your Firebase console or backend.
          </Text>
        ) : null}
      </View>

      {/* Button to display a Notifee notification with actions */}
      <Pressable
        style={styles.displayNotificationBtn}
        onPress={onDisplayNotification}>
        <Text style={styles.buttonText}>Show Actionable Notifee</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.label}>Last Received Notification/Action:</Text>
        <Text style={styles.messageText}>
          {notificationMessage || 'Waiting for a notification or action...'}
        </Text>
      </View>

      <Text style={styles.footerText}>
        Ensure your Firebase project is correctly set up in Android Studio.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  tokenContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 14,
    color: '#007BFF',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    marginTop: 30,
    textAlign: 'center',
  },
  displayNotificationBtn: {
    height: 44,
    width: 250, // Increased width to fit text
    marginTop: 12,
    backgroundColor: '#007BFF', // Match other button style
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
