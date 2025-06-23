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
} from 'react-native';
import notifee from '@notifee/react-native';

import messaging from '@react-native-firebase/messaging';

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
      const authStatus = await messaging().requestPermission();
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
      const token = await messaging().getToken();
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
   * useEffect hook to handle side effects related to Firebase messaging.
   * It requests user permission on component mount and sets up listeners for:
   * - Foreground messages (onMessage): triggered when a notification is received while the app is open.
   * - Notifications opening the app (onNotificationOpenedApp): triggered when a user taps a notification
   * and the app is in the background.
   * - Initial notification (getInitialNotification): checks if the app was launched by a notification
   * from a quit state.
   * Returns a cleanup function to unsubscribe from listeners when the component unmounts.
   */
  useEffect(() => {
    requestUserPermission();

    // Listener for messages received while the app is in the foreground.
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log(
        'FCM Message received in foreground:',
        JSON.stringify(remoteMessage),
      );
      setNotificationMessage(
        `Foreground Notification: ${
          remoteMessage.notification?.title || ''
        } - ${remoteMessage.notification?.body || ''}`,
      );
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || 'You have a new message!',
        [{text: 'OK', onPress: () => console.log('OK Pressed')}],
      );
    });

    // Listener for when a notification is tapped by the user, and the app is in the background.
    const unsubscribeOnNotificationOpenedApp =
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log(
          'Notification caused app to open from background state:',
          remoteMessage,
        );
        setNotificationMessage(
          `Opened from Background/Quit: ${
            remoteMessage.notification?.title || ''
          } - ${remoteMessage.notification?.body || ''}`,
        );
        // You can add navigation logic here based on remoteMessage.data
      });

    // Checks if the app was opened by a notification when it was initially launched from a quit state.
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage,
          );
          setNotificationMessage(
            `Opened from Quit: ${remoteMessage.notification?.title || ''} - ${
              remoteMessage.notification?.body || ''
            }`,
          );
          // You can add initial navigation logic here based on remoteMessage.data
        }
      });

    // Cleanup function: Unsubscribe from all listeners when the component unmounts to prevent memory leaks.
    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
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

      <View style={styles.card}>
        <Text style={styles.label}>Last Received Notification:</Text>
        <Text style={styles.messageText}>
          {notificationMessage || 'Waiting for a notification...'}
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
});

export default App;
