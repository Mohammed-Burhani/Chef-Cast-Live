import { Platform } from 'react-native';
import * as React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

let toastHandler: ((message: string, type: ToastType) => void) | null = null;

export const toast = {
  success: (message: string) => toastHandler?.(message, 'success'),
  error: (message: string) => toastHandler?.(message, 'error'),
  info: (message: string) => toastHandler?.(message, 'info'),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; type: ToastType }>>([]);
  const nextId = React.useRef(0);

  React.useEffect(() => {
    toastHandler = (message: string, type: ToastType) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };

    return () => {
      toastHandler = null;
    };
  }, []);

  return (
    <>
      {children}
      <View style={[styles.container, Platform.OS === 'web' ? styles.webPosition : styles.mobilePosition]} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </View>
    </>
  );
};

const ToastItem: React.FC<{ message: string; type: ToastType }> = ({ message, type }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    gap: 8,
  },
  webPosition: {
    top: 24,
    right: 24,
    alignItems: 'flex-end',
  },
  mobilePosition: {
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
