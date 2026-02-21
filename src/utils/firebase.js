const admin = require('firebase-admin');

// Firebase Admin SDK'yı başlat
let firebaseApp;

try {
  // Service account key dosyası varsa kullan
  const serviceAccount = require('../../firebase-service-account.json');
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK initialized with service account');
} catch (error) {
  // Service account yoksa environment variable'dan kullan
  if (process.env.FIREBASE_PROJECT_ID) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('✅ Firebase Admin SDK initialized with application default credentials');
  } else {
    console.warn('⚠️ Firebase Admin SDK not initialized - notifications will not work');
  }
}

/**
 * Tek bir kullanıcıya bildirim gönder
 */
async function sendNotificationToUser(fcmToken, notification, data = {}) {
  if (!firebaseApp) {
    console.warn('Firebase not initialized, skipping notification');
    return null;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'order_updates',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    
    // Token geçersizse veya kayıtlı değilse, null döndür
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      return null;
    }
    
    throw error;
  }
}

/**
 * Birden fazla kullanıcıya bildirim gönder
 */
async function sendNotificationToMultipleUsers(fcmTokens, notification, data = {}) {
  if (!firebaseApp || !fcmTokens || fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data,
      tokens: fcmTokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ ${response.successCount} notifications sent successfully`);
    
    if (response.failureCount > 0) {
      console.warn(`⚠️ ${response.failureCount} notifications failed`);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    throw error;
  }
}

/**
 * Topic'e bildirim gönder
 */
async function sendNotificationToTopic(topic, notification, data = {}) {
  if (!firebaseApp) {
    console.warn('Firebase not initialized, skipping notification');
    return null;
  }

  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Topic notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending topic notification:', error);
    throw error;
  }
}

module.exports = {
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  sendNotificationToTopic
};
