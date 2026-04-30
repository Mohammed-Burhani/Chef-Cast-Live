/**
 * Push Notifications System for ChefCast: Live
 * 
 * Notification Types:
 * - Episode Starting Soon (30 minutes before broadcast)
 * - Episode Live Now (when episode.is_live flips to true)
 * - Question Incoming (optional alert when new question is pushed)
 * - Badge Earned (immediate notification on badge unlock)
 * - Mystery Box Active (when Mystery Box challenge goes live)
 * - Final Rank (after episode ends with rank and score summary)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification categories
 */
export enum NotificationCategory {
  EPISODE = 'episode',
  QUIZ = 'quiz',
  BADGE = 'badge',
  MYSTERY_BOX = 'mystery_box',
  RANK = 'rank',
}

/**
 * Configure notification handler behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permissions not granted');
    return false;
  }

  // Configure notification channels for Android
  if (Platform.OS === 'android') {
    await configureAndroidChannels();
  }

  return true;
}

/**
 * Configure Android notification channels
 */
async function configureAndroidChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync('episode', {
    name: 'Episode Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B35',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('quiz', {
    name: 'Quiz Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4ECDC4',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('badge', {
    name: 'Badge Unlocks',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#FFD93D',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('mystery_box', {
    name: 'Mystery Box',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A8E6CF',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('rank', {
    name: 'Rank Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#95E1D3',
    sound: 'default',
  });
}

/**
 * Get Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: trigger || null,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Notification Templates
 */

export async function sendEpisodeStartingSoonNotification(
  episodeTitle: string,
  episodeId: string,
  startTime: Date
): Promise<string> {
  const minutesUntil = Math.floor((startTime.getTime() - Date.now()) / (1000 * 60));
  
  return await scheduleLocalNotification(
    '🔔 Episode Starting Soon',
    `${episodeTitle} starts in ${minutesUntil} minutes. Get ready to compete!`,
    {
      category: NotificationCategory.EPISODE,
      episodeId,
      action: 'open_episode',
    },
    {
      seconds: Math.max(0, (startTime.getTime() - Date.now() - 30 * 60 * 1000) / 1000),
    }
  );
}

export async function sendEpisodeLiveNowNotification(
  episodeTitle: string,
  episodeId: string
): Promise<string> {
  return await scheduleLocalNotification(
    '🔴 LIVE NOW',
    `${episodeTitle} is live! Join the quiz now and compete for the top spot.`,
    {
      category: NotificationCategory.EPISODE,
      episodeId,
      action: 'join_live_quiz',
    }
  );
}

export async function sendQuestionIncomingNotification(
  questionNumber: number
): Promise<string> {
  return await scheduleLocalNotification(
    '❓ New Question',
    `Question ${questionNumber} is about to appear. Get ready!`,
    {
      category: NotificationCategory.QUIZ,
      action: 'focus_quiz',
    }
  );
}

export async function sendBadgeEarnedNotification(
  badgeName: string,
  xpReward: number
): Promise<string> {
  return await scheduleLocalNotification(
    '🏆 Badge Unlocked!',
    `You earned "${badgeName}" and gained ${xpReward} XP!`,
    {
      category: NotificationCategory.BADGE,
      action: 'view_badges',
    }
  );
}

export async function sendMysteryBoxActiveNotification(
  ingredient: string,
  episodeId: string
): Promise<string> {
  return await scheduleLocalNotification(
    '📦 Mystery Box Challenge',
    `Tonight's secret ingredient is ${ingredient}. Submit your dish idea now!`,
    {
      category: NotificationCategory.MYSTERY_BOX,
      episodeId,
      action: 'open_mystery_box',
    }
  );
}

export async function sendFinalRankNotification(
  rank: number,
  totalParticipants: number,
  score: number,
  episodeTitle: string
): Promise<string> {
  const percentile = Math.round((1 - rank / totalParticipants) * 100);
  
  return await scheduleLocalNotification(
    '🎯 Final Results',
    `You ranked #${rank} out of ${totalParticipants} (top ${percentile}%) with ${score} points in ${episodeTitle}!`,
    {
      category: NotificationCategory.RANK,
      action: 'view_results',
    }
  );
}

/**
 * Notification action handlers
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Handle notifications received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // Handle notification interactions (taps)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response:', response);
    onNotificationResponse?.(response);
    
    const { data } = response.notification.request.content;
    
    // Handle different notification actions
    switch (data?.action) {
      case 'open_episode':
        // Navigate to episode screen
        break;
      case 'join_live_quiz':
        // Navigate to live quiz
        break;
      case 'focus_quiz':
        // Bring quiz to foreground
        break;
      case 'view_badges':
        // Navigate to badges screen
        break;
      case 'open_mystery_box':
        // Navigate to mystery box screen
        break;
      case 'view_results':
        // Navigate to results screen
        break;
    }
  });

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get notification settings
 */
export async function getNotificationSettings() {
  const settings = await Notifications.getPermissionsAsync();
  return {
    granted: settings.status === 'granted',
    canAskAgain: settings.canAskAgain,
    ios: settings.ios,
    android: settings.android,
  };
}

/**
 * Badge count management (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(count);
  }
}

export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === 'ios') {
    return await Notifications.getBadgeCountAsync();
  }
  return 0;
}

export async function clearBadgeCount(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { 
 *   requestNotificationPermissions,
 *   sendEpisodeLiveNowNotification,
 *   setupNotificationListeners 
 * } from '@/lib/notifications';
 * 
 * // Request permissions on app start
 * await requestNotificationPermissions();
 * 
 * // Setup listeners
 * const cleanup = setupNotificationListeners(
 *   (notification) => {
 *     console.log('Received:', notification);
 *   },
 *   (response) => {
 *     console.log('User tapped:', response);
 *   }
 * );
 * 
 * // Send notification when episode goes live
 * await sendEpisodeLiveNowNotification('Italian Risotto Night', 'ep-001');
 * 
 * // Cleanup on unmount
 * return cleanup;
 * ```
 */
