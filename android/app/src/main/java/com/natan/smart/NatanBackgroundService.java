package com.natan.smart;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.Context;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;

/**
 * NATAN background service.
 *
 * When the user explicitly selects NATAN as Android's mock-location app, this
 * service can publish the selected point through Android's official test
 * location provider. It does not hide mock-location state or bypass another
 * app's anti-spoofing checks.
 */
public class NatanBackgroundService extends Service {

    public static final String ACTION_START_MOCK = "com.natan.smart.action.START_MOCK_LOCATION";
    public static final String ACTION_STOP_MOCK = "com.natan.smart.action.STOP_MOCK_LOCATION";
    public static final String PREFS = "natan_automation";
    public static final String MOCK_LAT = "mock_lat";
    public static final String MOCK_LNG = "mock_lng";
    public static final String MOCK_ACTIVE = "mock_active";
    private static final String CHANNEL_ID = "natan_background";
    private static final int NOTIFICATION_ID = 1001;
    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private boolean mockProviderAdded = false;

    private final Runnable publisher = new Runnable() {
        @Override public void run() {
            publishSelectedLocation();
            handler.postDelayed(this, 2000L);
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification());
        if (intent != null && ACTION_STOP_MOCK.equals(intent.getAction())) {
            stopMockProvider();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null && ACTION_START_MOCK.equals(intent.getAction())) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(MOCK_ACTIVE, true).apply();
            startMockProvider();
        }
        return START_STICKY;
    }

    private void startMockProvider() {
        LocationManager manager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return;
        try {
            if (!mockProviderAdded) {
                try { manager.removeTestProvider(LocationManager.GPS_PROVIDER); } catch (Exception ignored) {}
                manager.addTestProvider(LocationManager.GPS_PROVIDER, true, false, false, false, true, true, true, 1, 1);
                manager.setTestProviderEnabled(LocationManager.GPS_PROVIDER, true);
                mockProviderAdded = true;
            }
            handler.removeCallbacks(publisher);
            handler.post(publisher);
        } catch (SecurityException e) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putBoolean(MOCK_ACTIVE, false)
                    .putString("mock_status", "mock_app_required")
                    .putString("mock_detail", "Select NATAN as the Android mock-location app in Developer Options.")
                    .apply();
            stopSelf();
        } catch (Exception e) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putBoolean(MOCK_ACTIVE, false)
                    .putString("mock_status", "error")
                    .putString("mock_detail", e.getMessage() == null ? "Unable to start mock location." : e.getMessage())
                    .apply();
            stopSelf();
        }
    }

    private void publishSelectedLocation() {
        if (!mockProviderAdded) return;
        android.content.SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!p.getBoolean(MOCK_ACTIVE, false)) return;
        double lat = Double.longBitsToDouble(p.getLong("mock_lat_bits", Double.doubleToLongBits(0)));
        double lng = Double.longBitsToDouble(p.getLong("mock_lng_bits", Double.doubleToLongBits(0)));
        Location l = new Location(LocationManager.GPS_PROVIDER);
        l.setLatitude(lat);
        l.setLongitude(lng);
        l.setAccuracy(3f);
        l.setTime(System.currentTimeMillis());
        l.setElapsedRealtimeNanos(SystemClock.elapsedRealtimeNanos());
        try {
            manager().setTestProviderLocation(LocationManager.GPS_PROVIDER, l);
            p.edit().putString("mock_status", "active")
                    .putString("mock_detail", "Android mock location is active for the selected point.")
                    .putLong("mock_last_update", System.currentTimeMillis()).apply();
        } catch (SecurityException e) {
            p.edit().putBoolean(MOCK_ACTIVE, false).putString("mock_status", "mock_app_required").apply();
        }
    }

    private LocationManager manager() { return (LocationManager) getSystemService(Context.LOCATION_SERVICE); }

    private void stopMockProvider() {
        handler.removeCallbacks(publisher);
        LocationManager manager = manager();
        if (manager != null) {
            try { manager.setTestProviderEnabled(LocationManager.GPS_PROVIDER, false); } catch (Exception ignored) {}
            try { manager.removeTestProvider(LocationManager.GPS_PROVIDER); } catch (Exception ignored) {}
        }
        mockProviderAdded = false;
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(MOCK_ACTIVE, false).putString("mock_status", "stopped").apply();
    }

    private Notification buildNotification() {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return builder.setContentTitle("NATAN")
                .setContentText("NATAN يشارك الموقع المحدد عبر Android Mock Location")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true).build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "خدمة موقع NATAN", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override public void onDestroy() {
        stopMockProvider();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
