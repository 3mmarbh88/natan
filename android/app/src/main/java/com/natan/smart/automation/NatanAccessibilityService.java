package com.natan.smart.automation;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONObject;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class NatanAccessibilityService extends AccessibilityService {
    private static final String TAG = "NATAN_AUTOMATION";
    private static final String NINJA_PACKAGE = NatanAutomationPlugin.TARGET_PACKAGE;
    private static final long STEP_MS = 320L;
    private static final long TIMEOUT_MS = 45_000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long startedAt = 0L;
    private long lastActionAt = 0L;
    private String lastActionKey = "";
    private int scrolls = 0;

    private final Runnable watchdog = new Runnable() {
        @Override public void run() {
            if (!isRunning()) return;
            if (System.currentTimeMillis() - startedAt > TIMEOUT_MS) {
                setStatus("timeout", "Target shift was not found or the booking flow did not finish");
                stopAutomation();
                return;
            }
            inspectAndAct();
            handler.postDelayed(this, STEP_MS);
        }
    };

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "NATAN Accessibility Service connected");
        handler.postDelayed(() -> {
            if (isRunning()) {
                startedAt = System.currentTimeMillis();
                handler.removeCallbacks(watchdog);
                handler.post(watchdog);
            }
        }, 500L);
    }

    @Override
    public void onAccessibilityEvent(android.view.accessibility.AccessibilityEvent event) {
        if (event == null || !isRunning()) return;
        CharSequence pkg = event.getPackageName();
        if (pkg != null && !NINJA_PACKAGE.contentEquals(pkg)) return;
        inspectAndAct();
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "NATAN Accessibility Service interrupted");
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(watchdog);
        super.onDestroy();
    }

    private boolean isRunning() {
        return prefs().getBoolean(NatanAutomationPlugin.RUNNING, false);
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(NatanAutomationPlugin.PREFS, Context.MODE_PRIVATE);
    }

    private JSONObject target() {
        try {
            return new JSONObject(prefs().getString(NatanAutomationPlugin.TARGET_JSON, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private void inspectAndAct() {
        if (!isRunning()) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;
        CharSequence pkg = root.getPackageName();
        if (pkg != null && !NINJA_PACKAGE.contentEquals(pkg)) return;

        String allText = collectText(root);
        String lower = normalize(allText);

        if (containsAny(lower, Arrays.asList("shift booked successfully", "shift booked", "تم حجز المناوبة بنجاح", "تم حجز المناوبة", "اكتمل الحجز"))) {
            setStatus("success", "Ninja confirmed the shift booking");
            stopAutomation(false);
            return;
        }

        if (containsAny(lower, Arrays.asList("booking failed", "unable to book", "could not book", "تعذر الحجز", "فشل الحجز", "غير متاح", "already booked"))) {
            setStatus("failed", allText.length() > 300 ? allText.substring(0, 300) : allText);
            stopAutomation(false);
            return;
        }

        JSONObject t = target();
        if (hasConfirmDialog(lower)) {
            AccessibilityNodeInfo confirm = findClickableByLabels(root, Arrays.asList("confirm", "ok", "yes", "تأكيد", "موافق", "نعم", "تآكيد"));
            if (confirm != null && performClick(confirm, "confirm")) {
                setStatus("confirming", "Confirm pressed; waiting for Ninja success confirmation");
                return;
            }
        }

        AccessibilityNodeInfo targetCard = findMatchingShiftCard(root, t);
        if (targetCard != null) {
            AccessibilityNodeInfo book = findClickableByLabels(targetCard, Arrays.asList("book shift", "book", "حجز فترة الدوام", "حجز دوام", "احجز دوام", "احجز", "حجز"));
            if (book == null) book = findClickableNode(targetCard);
            if (book != null && performClick(book, "book")) {
                setStatus("booking", "Matching shift selected; waiting for confirmation dialog");
                return;
            }
        }

        if (containsAny(lower, Arrays.asList("home", "orders", "my shifts", "دوامي", "الطلبات")) && !containsAny(lower, Arrays.asList("book shift", "حجز دوام", "حجز فترة الدوام"))) {
            AccessibilityNodeInfo shifts = findClickableByLabels(root, Arrays.asList("shifts", "shift", "الوردية", "الورديات", "وردية", "الدوام", "الشفتات"));
            if (shifts != null && performClick(shifts, "open-shifts")) {
                setStatus("opening_shifts", "Opening Ninja shifts screen");
                return;
            }
        }

        AccessibilityNodeInfo refresh = findClickableByLabels(root, Arrays.asList("refresh", "تحديث", "اسحب للتحديث"));
        if (targetCard == null && scrolls < 8) {
            if (scrolls == 0 && refresh != null && performClick(refresh, "refresh")) {
                setStatus("refreshing", "Refreshing Ninja shifts");
                return;
            }
            if (scrollDown(root)) {
                scrolls++;
                setStatus("searching", "Scanning Ninja shifts page");
            }
        }
    }

    private boolean hasConfirmDialog(String text) {
        boolean cancel = containsAny(text, Arrays.asList("cancel", "إلغاء", "الغاء", "إلغاء الأمر"));
        boolean confirm = containsAny(text, Arrays.asList("confirm", "تأكيد", "موافق", "نعم"));
        return cancel && confirm;
    }

    private AccessibilityNodeInfo findMatchingShiftCard(AccessibilityNodeInfo root, JSONObject target) {
        List<AccessibilityNodeInfo> candidates = new ArrayList<>();
        collectNodes(root, candidates);
        String start = normalizeTime(target.optString("startTime", ""));
        String end = normalizeTime(target.optString("endTime", ""));
        String district = normalize(target.optString("district", ""));
        String store = normalize(target.optString("storeNumber", ""));
        String storeName = normalize(target.optString("storeName", ""));
        String date = normalizeDate(target.optString("date", ""));

        AccessibilityNodeInfo best = null;
        int bestScore = 0;
        for (AccessibilityNodeInfo node : candidates) {
            String text = normalize(collectText(node));
            if (text.length() < 5) continue;
            if (containsAny(text, Arrays.asList("unavailable", "not available", "fully booked", "already booked", "expired", "completed", "cancelled", "canceled", "no longer available", "غير متاح", "غير متاحة", "مكتمل", "منتهي", "محجوز", "انتهت", "ملغي", "ملغى", "اكتمل الحجز"))) continue;

            int score = 0;
            if (!start.isEmpty() && text.contains(start)) score += 4;
            if (!end.isEmpty() && text.contains(end)) score += 4;
            if (!district.isEmpty() && text.contains(district)) score += 3;
            if (!store.isEmpty() && text.contains(store)) score += 3;
            if (!storeName.isEmpty() && text.contains(storeName)) score += 2;
            if (!date.isEmpty() && text.contains(date)) score += 2;

            boolean hasBook = containsAny(text, Arrays.asList("book shift", "book", "حجز فترة الدوام", "حجز دوام", "احجز دوام", "احجز", "حجز"));
            if (hasBook) score += 1;

            if (score >= 7 && score > bestScore) {
                best = node;
                bestScore = score;
            }
        }
        return best;
    }

    private AccessibilityNodeInfo findClickableByLabels(AccessibilityNodeInfo root, List<String> labels) {
        List<AccessibilityNodeInfo> nodes = new ArrayList<>();
        collectNodes(root, nodes);
        for (AccessibilityNodeInfo node : nodes) {
            String text = normalize(nodeText(node));
            if (text.isEmpty()) continue;
            for (String label : labels) {
                if (text.equals(normalize(label)) || text.contains(normalize(label))) {
                    AccessibilityNodeInfo clickable = findClickableAncestor(node);
                    if (clickable != null) return clickable;
                }
            }
        }
        return null;
    }

    private AccessibilityNodeInfo findClickableNode(AccessibilityNodeInfo root) {
        if (root == null) return null;
        if (root.isClickable() && root.isEnabled()) return root;
        for (int i = 0; i < root.getChildCount(); i++) {
            AccessibilityNodeInfo child = root.getChild(i);
            AccessibilityNodeInfo found = findClickableNode(child);
            if (found != null) return found;
        }
        return null;
    }

    private AccessibilityNodeInfo findClickableAncestor(AccessibilityNodeInfo node) {
        AccessibilityNodeInfo current = node;
        for (int i = 0; i < 8 && current != null; i++) {
            if (current.isClickable() && current.isEnabled()) return current;
            current = current.getParent();
        }
        return null;
    }

    private boolean performClick(AccessibilityNodeInfo node, String key) {
        if (node == null) return false;
        long now = System.currentTimeMillis();
        if (now - lastActionAt < 650L || key.equals(lastActionKey) && now - lastActionAt < 1600L) return false;
        lastActionAt = now;
        lastActionKey = key;
        boolean clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        if (!clicked) {
            Rect r = new Rect();
            node.getBoundsInScreen(r);
            if (!r.isEmpty()) {
                clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        }
        return clicked;
    }

    private boolean scrollDown(AccessibilityNodeInfo root) {
        List<AccessibilityNodeInfo> nodes = new ArrayList<>();
        collectNodes(root, nodes);
        for (AccessibilityNodeInfo node : nodes) {
            if (node.isScrollable() && node.isEnabled()) {
                if (node.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)) return true;
            }
        }
        return false;
    }

    private void collectNodes(AccessibilityNodeInfo node, List<AccessibilityNodeInfo> out) {
        if (node == null) return;
        out.add(node);
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) collectNodes(child, out);
        }
    }

    private String collectText(AccessibilityNodeInfo root) {
        StringBuilder sb = new StringBuilder();
        List<AccessibilityNodeInfo> nodes = new ArrayList<>();
        collectNodes(root, nodes);
        Set<String> seen = new HashSet<>();
        for (AccessibilityNodeInfo node : nodes) {
            String text = nodeText(node);
            if (!text.isEmpty() && seen.add(text)) sb.append(text).append(' ');
        }
        return sb.toString().trim();
    }

    private String nodeText(AccessibilityNodeInfo node) {
        if (node == null) return "";
        CharSequence t = node.getText();
        if (t != null && t.length() > 0) return t.toString();
        CharSequence d = node.getContentDescription();
        return d == null ? "" : d.toString();
    }

    private String normalize(String value) {
        if (value == null) return "";
        String n = Normalizer.normalize(value, Normalizer.Form.NFKC).trim().toLowerCase(Locale.ROOT);
        n = n.replace('٠','0').replace('١','1').replace('٢','2').replace('٣','3').replace('٤','4').replace('٥','5').replace('٦','6').replace('٧','7').replace('٨','8').replace('٩','9');
        n = n.replace('۰','0').replace('۱','1').replace('۲','2').replace('۳','3').replace('۴','4').replace('۵','5').replace('۶','6').replace('۷','7').replace('۸','8').replace('۹','9');
        return n.replaceAll("\\s+", " ");
    }

    private String normalizeTime(String value) {
        if (value == null) return "";
        String[] parts = value.trim().split(":");
        if (parts.length < 2) return normalize(value);
        return String.format(Locale.ROOT, "%02d:%02d", Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
    }

    private String normalizeDate(String value) {
        if (TextUtils.isEmpty(value)) return "";
        String[] parts = value.substring(0, Math.min(value.length(), 10)).split("[-/]");
        if (parts.length == 3) return normalize(parts[2] + "/" + parts[1] + "/" + parts[0]);
        return normalize(value);
    }

    private boolean containsAny(String text, List<String> values) {
        for (String value : values) {
            if (text.contains(normalize(value))) return true;
        }
        return false;
    }

    private void setStatus(String status, String detail) {
        prefs().edit()
                .putString(NatanAutomationPlugin.STATUS, status)
                .putString(NatanAutomationPlugin.DETAIL, detail)
                .putLong(NatanAutomationPlugin.LAST_UPDATE, System.currentTimeMillis())
                .apply();
    }

    private void stopAutomation() { stopAutomation(true); }

    private void stopAutomation(boolean setStopped) {
        if (setStopped) setStatus("stopped", "Automation stopped");
        prefs().edit().putBoolean(NatanAutomationPlugin.RUNNING, false).apply();
        handler.removeCallbacks(watchdog);
    }
}
