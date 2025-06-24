import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {getApp} from '@react-native-firebase/app';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';

// This handler will be called when a data message is received
// and the app is in the background or quit state.
getApp().messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background Data Message received:', remoteMessage);

  // Extract relevant data from the remoteMessage.data payload based on your script's CUSTOM_DATA
  const { action, orderId, source, eventType, timestamp } = remoteMessage.data || {};

  // You can perform any background processing here
  // For example, saving to AsyncStorage, making an API call, etc.
  console.log('Processed background data:', { action, orderId, source, eventType, timestamp });

  // Create a Notifee channel (required for Android 8.0+ notifications)
  // It's safe to call this multiple times; Notifee will ensure it's only created once.
  const channelId = await notifee.createChannel({
    id: 'data_message_channel',
    name: 'Data Message Updates',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  // Display a notification using Notifee based on the data message
  await notifee.displayNotification({
    title: action || 'New Background Update', // Using 'action' from your data as title
    body: `Order: ${orderId || 'N/A'} | Event: ${eventType || 'N/A'}`, // Combining 'orderId' and 'eventType' for body
    data: remoteMessage.data, // Pass the entire data payload for later retrieval on press
    android: {
      channelId,
      smallIcon: 'ic_launcher',
      color: '#4285F4',
      pressAction: {
        id: 'default',
      },
    },
  });

  console.log('Notifee notification displayed from background handler.');
});

// Optional: Notifee background event listener for when user interacts with notifications
// This is important for handling presses on notifications created by Notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;

    if (type === EventType.PRESS) {
        console.log('Notifee Background Event: User pressed notification', notification);
        // You can use notification.data here to navigate or perform actions
    }
    if (type === EventType.DISMISSED) {
        console.log('Notifee Background Event: User dismissed notification', notification);
    }
});


AppRegistry.registerComponent(appName, () => App);
