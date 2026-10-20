package com.natan.smart.automation;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NatanAutomation")
public class NatanAutomationPlugin extends Plugin {
    public static final String PREFS = "natan_automation";
    public static final String TARGET_JSON = "target_json";
    public static final String RUNNING = "running";
    public static final String STATUS = "status";
    public static final String DETAIL = "detail";
    public static final String LAST_UPDATE = "last_update";
    // Verified package in the supplied production Ninja APK.
    public static final String TARGET_PACKAGE = "com.mehedydev.nova";
    public static final String[] KNOWN_NINJA_PACKAGES = new String[] {
        // Prefer the verified package before trying legacy/alternate package names.
        "com.mehedydev.nova",
        "com.ananinja.driver",
        "com.ananinja.rider",
        "com.ananinja.courier",
        "com.ananinja.captain",
        "com.ananinja",
        "com.ninja.driver",
        "com.ninja.captain",
        "com.ninja.courier",
        "com.ninja.delivery",
        "com.ninja.ksa",
        "com.ninja.driver.ksa",
        "com.ninja.ksa.driver",
        "com.ninja.rider",
        "sa.ninja.driver",
        "sa.ninja",
        "com.ninja.app",
        "com.ananinja.driver.ksa",
        "com.mehedydev.nova"
    };

    public static Intent getLaunchIntentForNinja(Context context) {
        if (context == null) return null;
        PackageManager pm = context.getPackageManager();
        for (String pkg : KNOWN_NINJA_PACKAGES) {
            try {
                Intent intent = pm.getLaunchIntentForPackage(pkg);
                if (intent != null) return intent;
            } catch (Exception ignored) {}
        }
        try {
            java.util.List<android.content.pm.ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            for (android.content.pm.ApplicationInfo app : apps) {
                if (app.packageName != null) {
                    String p = app.packageName.toLowerCase(java.util.Locale.ROOT);
                    if (p.contains("ninja") || p.contains("ananinja")) {
                        Intent intent = pm.getLaunchIntentForPackage(app.packageName);
                        if (intent != null) return intent;
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void startNinjaAutoBooking(PluginCall call) {
        String criteria = call.getString("criteriaJson", "");
        if (criteria.trim().isEmpty()) {
            call.reject("Missing auto-booking criteria");
            return;
        }

        prefs().edit()
                .putString("criteria_json", criteria)
                .putBoolean(RUNNING, true)
                .putString(STATUS, "starting")
                .putString(DETAIL, "Starting Ninja auto-booker with configured NATAN conditions")
                .putLong(LAST_UPDATE, System.currentTimeMillis())
                .apply();

        if (!isAccessibilityEnabled()) {
            prefs().edit()
                    .putBoolean(RUNNING, false)
                    .putString(STATUS, "accessibility_required")
                    .putString(DETAIL, "Enable NATAN Accessibility Service")
                    .putLong(LAST_UPDATE, System.currentTimeMillis())
                    .apply();
            call.resolve(statusObject());
            return;
        }

        Intent launch = getLaunchIntentForNinja(getContext());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            getContext().startActivity(launch);
        } else {
            // Keep running even if launch intent is not direct, so user can bring Ninja to foreground
            prefs().edit()
                    .putString(STATUS, "waiting_ninja")
                    .putString(DETAIL, "Ninja app not auto-launched; please open Ninja manually and keep shifts visible.")
                    .putLong(LAST_UPDATE, System.currentTimeMillis())
                    .apply();
        }
        call.resolve(statusObject());
    }

    @PluginMethod
    public void startNinjaAutomation(PluginCall call) {
        String target = call.getString("targetJson", "");
        if (target.trim().isEmpty()) {
            call.reject("Missing target shift");
            return;
        }

        prefs().edit()
                .putString(TARGET_JSON, target)
                .putString("criteria_json", "{}")
                .putBoolean(RUNNING, true)
                .putString(STATUS, "starting")
                .putString(DETAIL, "Starting Ninja automation with verified Ninja UI flow")
                .putLong(LAST_UPDATE, System.currentTimeMillis())
                .apply();

        if (!isAccessibilityEnabled()) {
            prefs().edit()
                    .putBoolean(RUNNING, false)
                    .putString(STATUS, "accessibility_required")
                    .putString(DETAIL, "Enable NATAN Accessibility Service")
                    .putLong(LAST_UPDATE, System.currentTimeMillis())
                    .apply();
            call.resolve(statusObject());
            return;
        }

        Intent launch = getLaunchIntentForNinja(getContext());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            getContext().startActivity(launch);
        } else {
            prefs().edit()
                    .putString(STATUS, "waiting_ninja")
                    .putString(DETAIL, "Ninja app not auto-launched; please open Ninja manually and keep shifts visible.")
                    .putLong(LAST_UPDATE, System.currentTimeMillis())
                    .apply();
        }
        call.resolve(statusObject());
    }

    @PluginMethod
    public void getNinjaScreenSnapshot(PluginCall call) {
        if (!isAccessibilityEnabled()) {
            call.reject("NATAN Accessibility Service is not enabled");
            return;
        }
        String snapshot = NatanAccessibilityService.getLastScreenSnapshot();
        JSObject ret = new JSObject();
        ret.put("packageName", NatanAccessibilityService.getLastScreenPackage());
        ret.put("text", snapshot == null ? "" : snapshot);
        ret.put("timestamp", NatanAccessibilityService.getLastSnapshotTimestamp());
        call.resolve(ret);
    }

    @PluginMethod
    public void getAutomationStatus(PluginCall call) {
        call.resolve(statusObject());
    }

    @PluginMethod
    public void stopNinjaAutomation(PluginCall call) {
        prefs().edit()
                .putBoolean(RUNNING, false)
                .putString("criteria_json", "{}")
                .putString(STATUS, "stopped")
                .putString(DETAIL, "Automation stopped")
                .putLong(LAST_UPDATE, System.currentTimeMillis())
                .apply();
        call.resolve(statusObject());
    }

    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                    7101
            );
            call.reject("Location permission is required. Grant it and tap again.");
            return;
        }

        LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        Location best = null;
        if (manager != null) {
            try {
                Location gps = manager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                Location network = manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                best = newerLocation(gps, network);
            } catch (SecurityException ignored) {
            }
        }

        if (best == null) {
            call.reject("No recent device location is available. Turn on Location and try again.");
            return;
        }

        JSObject ret = new JSObject();
        ret.put("latitude", best.getLatitude());
        ret.put("longitude", best.getLongitude());
        ret.put("accuracy", best.hasAccuracy() ? best.getAccuracy() : -1);
        call.resolve(ret);
    }

    private Location newerLocation(Location a, Location b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.getTime() >= b.getTime() ? a : b;
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void isAccessibilityEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isAccessibilityEnabled());
        call.resolve(ret);
    }

    private boolean isAccessibilityEnabled() {
        String enabled = Settings.Secure.getString(
                getContext().getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        if (enabled == null) return false;
        ComponentName expected = new ComponentName(getContext(), NatanAccessibilityService.class);
        String expectedFlat = expected.flattenToString();
        for (String item : enabled.split(":")) {
            if (expectedFlat.equalsIgnoreCase(item)) return true;
        }
        return false;
    }

    private JSObject statusObject() {
        JSObject ret = new JSObject();
        SharedPreferences p = prefs();
        ret.put("running", p.getBoolean(RUNNING, false));
        ret.put("status", p.getString(STATUS, "idle"));
        ret.put("detail", p.getString(DETAIL, ""));
        ret.put("lastUpdate", p.getLong(LAST_UPDATE, 0));
        return ret;
    }
    @PluginMethod
    public void setMockLocation(PluginCall call) {
        Double lat = call.getDouble("latitude", null);
        Double lng = call.getDouble("longitude", null);
        if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            call.reject("Invalid latitude/longitude");
            return;
        }
        prefs().edit()
                .putLong("mock_lat_bits", Double.doubleToLongBits(lat))
                .putLong("mock_lng_bits", Double.doubleToLongBits(lng))
                .putBoolean("mock_active", true)
                .putString("mock_status", "starting")
                .putString("mock_detail", "Starting Android Mock Location. If Android rejects it, select NATAN in Developer Options.")
                .apply();
        Intent service = new Intent(getContext(), com.natan.smart.NatanBackgroundService.class);
        service.setAction(com.natan.smart.NatanBackgroundService.ACTION_START_MOCK);
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(service);
            } else {
                getContext().startService(service);
            }
            call.resolve(mockLocationStatus());
        } catch (Exception e) {
            call.reject("Unable to start location service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopMockLocation(PluginCall call) {
        Intent service = new Intent(getContext(), com.natan.smart.NatanBackgroundService.class);
        service.setAction(com.natan.smart.NatanBackgroundService.ACTION_STOP_MOCK);
        try { getContext().startService(service); } catch (Exception ignored) {}
        prefs().edit().putBoolean("mock_active", false).putString("mock_status", "stopped").apply();
        call.resolve(mockLocationStatus());
    }

    @PluginMethod
    public void getMockLocationStatus(PluginCall call) {
        call.resolve(mockLocationStatus());
    }

    @PluginMethod
    public void openMockLocationSettings(PluginCall call) {
        Intent intent;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            intent = new Intent("android.settings.MOCK_LOCATION_APP_SETTINGS");
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                call.resolve();
            } catch (Exception err) {
                call.reject("Unable to open battery settings: " + err.getMessage());
            }
        }
    }

    private JSObject mockLocationStatus() {
        JSObject ret = new JSObject();
        SharedPreferences p = prefs();
        ret.put("active", p.getBoolean("mock_active", false));
        ret.put("status", p.getString("mock_status", "stopped"));
        ret.put("detail", p.getString("mock_detail", ""));
        ret.put("latitude", Double.longBitsToDouble(p.getLong("mock_lat_bits", Double.doubleToLongBits(0))));
        ret.put("longitude", Double.longBitsToDouble(p.getLong("mock_lng_bits", Double.doubleToLongBits(0))));
        ret.put("lastUpdate", p.getLong("mock_last_update", 0));
        return ret;
    }

}
