package com.natan.smart.automation;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Rect;
import android.graphics.Path;
import android.accessibilityservice.GestureDescription;
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
    private static volatile String lastScreenSnapshot = "";
    private static volatile String lastScreenPackage = "";
    private static volatile long lastSnapshotTimestamp = 0L;

    public static String getLastScreenSnapshot() { return lastScreenSnapshot; }
    public static String getLastScreenPackage() { return lastScreenPackage; }
    public static long getLastSnapshotTimestamp() { return lastSnapshotTimestamp; }
    private static final String TAG = "NATAN_AUTOMATION";
    private static final long STEP_MS = 320L;
    private static final long REFRESH_INTERVAL_MS = 20_000L;

    public static boolean isNinjaPackage(CharSequence pkg) {
        if (pkg == null) return false;
        String p = pkg.toString().toLowerCase(Locale.ROOT);
        for (String known : NatanAutomationPlugin.KNOWN_NINJA_PACKAGES) {
            if (p.equals(known)) return true;
        }
        return p.contains("ninja") || p.contains("ananinja") || p.contains("captain") || p.contains("courier") || p.contains("samurai") || p.contains("nova");
    }

    private AccessibilityNodeInfo findNinjaRootNode() {
        AccessibilityNodeInfo active = getRootInActiveWindow();
        if (active != null) {
            CharSequence pkg = active.getPackageName();
            if (isNinjaPackage(pkg) || isNinjaContent(active)) {
                return active;
            }
        }
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            try {
                List<android.view.accessibility.AccessibilityWindowInfo> windows = getWindows();
                if (windows != null) {
                    for (android.view.accessibility.AccessibilityWindowInfo window : windows) {
                        AccessibilityNodeInfo wRoot = window.getRoot();
                        if (wRoot != null) {
                            CharSequence pkg = wRoot.getPackageName();
                            if (isNinjaPackage(pkg) || isNinjaContent(wRoot)) {
                                return wRoot;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return active;
    }

    private boolean isNinjaContent(AccessibilityNodeInfo node) {
        if (node == null) return false;
        String text = normalize(collectText(node));
        return containsAny(text, Arrays.asList("ninja", "نينجا", "حجز فترة الدوام", "حجز دوام", "احجز دوام", "الورديات", "دوامي", "المناوبات", "شفتات"));
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long startedAt = 0L;
    private long lastActionAt = 0L;
    private String lastActionKey = "";
    private int scrolls = 0;
    private long lastRefreshAt = 0L;
    private long lastInspectionStartedAt = 0L;
    private String lastReportedStatus = "";
    private boolean watchdogStarted = false;

    private final Runnable watchdog = new Runnable() {
        @Override public void run() {
            if (!isRunning()) return;
            if (startedAt == 0L) startedAt = System.currentTimeMillis();
            inspectAndAct();
            handler.postDelayed(this, STEP_MS);
        }
    };

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "NATAN Accessibility Service connected");
        ensureWatchdogStarted();
    }

    @Override
    public void onAccessibilityEvent(android.view.accessibility.AccessibilityEvent event) {
        if (event == null || !isRunning()) return;
        ensureWatchdogStarted();
        CharSequence pkg = event.getPackageName();
        if (pkg != null && !isNinjaPackage(pkg)) {
            // Check if there is still a Ninja window active before skipping
            AccessibilityNodeInfo root = findNinjaRootNode();
            if (root == null || (!isNinjaPackage(root.getPackageName()) && !isNinjaContent(root))) {
                return;
            }
        }
        inspectAndAct();
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "NATAN Accessibility Service interrupted");
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(watchdog);
        watchdogStarted = false;
        super.onDestroy();
    }

    private void ensureWatchdogStarted() {
        if (!isRunning() || watchdogStarted) return;
        if (startedAt == 0L) startedAt = System.currentTimeMillis();
        watchdogStarted = true;
        handler.post(watchdog);
    }

    private void reportStatusIfChanged(String status, String detail) {
        if (!status.equals(lastReportedStatus)) {
            setStatus(status, detail);
            lastReportedStatus = status;
        }
    }

    private boolean isRunning() {
        return prefs().getBoolean(NatanAutomationPlugin.RUNNING, false);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(NatanAutomationPlugin.PREFS, Context.MODE_PRIVATE);
    }

    private Context getContext() {
        return this;
    }

    private JSONObject target() {
        try {
            return new JSONObject(prefs().getString(NatanAutomationPlugin.TARGET_JSON, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private JSONObject criteria() {
        try {
            return new JSONObject(prefs().getString("criteria_json", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private void inspectAndAct() {
        if (!isRunning()) return;
        // Accessibility events and the watchdog can arrive close together.
        // Coalesce near-duplicate inspections to keep the main thread responsive.
        long inspectionNow = System.currentTimeMillis();
        if (inspectionNow - lastInspectionStartedAt < 180L) return;
        lastInspectionStartedAt = inspectionNow;
        ensureWatchdogStarted();
        AccessibilityNodeInfo root = findNinjaRootNode();
        if (root == null) {
            reportStatusIfChanged("waiting_ninja", "No active window is available to Accessibility. Unlock the phone and bring Ninja to the foreground.");
            return;
        }
        CharSequence pkg = root.getPackageName();
        if (pkg != null && !pkg.toString().isEmpty()) {
            lastScreenPackage = pkg.toString();
        }

        boolean isNinja = isNinjaPackage(pkg) || isNinjaContent(root);
        if (!isNinja) {
            reportStatusIfChanged("waiting_ninja", "Ninja is not the active screen (current package: " + lastScreenPackage + "). Open Ninja and keep its shifts screen visible.");
            return;
        }
        lastReportedStatus = "";

        String allText = collectText(root);
        if (!allText.isEmpty()) {
            lastScreenSnapshot = allText;
            lastSnapshotTimestamp = System.currentTimeMillis();
        }
        String lower = normalize(allText);

        // Never try to automate credentials. Ask the user to sign in normally,
        // then resume navigation and monitoring when the shifts UI appears.
        if (containsAny(lower, Arrays.asList("log in", "login", "sign in", "تسجيل الدخول", "سجل الدخول", "تسجيل دخول"))) {
            reportStatusIfChanged("login_required", "Sign in to Ninja normally, then keep Ninja open; NATAN will resume monitoring.");
            return;
        }

        if (containsAny(lower, Arrays.asList("shift booked successfully", "booking confirmed", "successfully booked", "تم حجز المناوبة بنجاح", "تم تأكيد الحجز", "اكتمل الحجز بنجاح"))) {
            setStatus("success", "Ninja confirmed the shift booking");
            stopAutomation(false);
            return;
        }

        if (containsAny(lower, Arrays.asList("booking failed", "unable to book", "could not book", "failed to book", "تعذر الحجز", "فشل الحجز", "غير متاح", "already booked", "booking unsuccessful"))) {
            setStatus("failed", allText.length() > 300 ? allText.substring(0, 300) : allText);
            stopAutomation(false);
            return;
        }

        JSONObject t = target();
        JSONObject criteria = criteria();
        if (hasConfirmDialog(lower) && (!criteria.has("autoConfirmDialog") || criteria.optBoolean("autoConfirmDialog", true))) {
            AccessibilityNodeInfo confirm = findClickableByLabels(root, Arrays.asList("confirm", "ok", "yes", "تأكيد", "موافق", "نعم", "تآكيد"));
            if (confirm != null && performClick(confirm, "confirm")) {
                setStatus("confirming", "Confirm pressed; waiting for Ninja success confirmation");
                return;
            }
        }

        AccessibilityNodeInfo targetCard = criteria.length() > 0
                ? findMatchingShiftCardByCriteria(root, criteria)
                : findMatchingShiftCard(root, t);
        if (targetCard != null) {
            AccessibilityNodeInfo book = findClickableByLabels(targetCard, Arrays.asList("book shift", "book", "حجز فترة الدوام", "حجز دوام", "احجز دوام", "احجز", "حجز"));
            if (book == null) book = findClickableNode(targetCard);
            if (book != null && performClick(book, "book")) {
                setStatus("booking", "Matching shift selected; waiting for confirmation dialog");
                return;
            }
        }

        boolean alreadyOnShiftScreen = containsAny(lower, Arrays.asList(
                "book shift", "available shifts", "shifts available", "shift details",
                "حجز دوام", "حجز فترة الدوام", "المناوبات المتاحة", "الورديات المتاحة",
                "تفاصيل المناوبة", "احجز دوام"));
        if (!alreadyOnShiftScreen) {
            AccessibilityNodeInfo shifts = findClickableByLabels(root, Arrays.asList(
                    "shifts", "shift", "available shifts", "my shifts",
                    "الوردية", "الورديات", "وردية", "الدوام", "الشفتات", "المناوبات"));
            if (shifts != null && performClick(shifts, "open-shifts")) {
                setStatus("opening_shifts", "Opening Ninja shifts screen");
                return;
            }
        }

        AccessibilityNodeInfo refresh = findClickableByLabels(root, Arrays.asList("refresh", "تحديث", "اسحب للتحديث", "سحب للتحديث"));
        if (targetCard == null) {
            long now = System.currentTimeMillis();
            long refreshInterval = criteria.optLong("refreshIntervalMs", 1500L);
            if (refreshInterval < 700L) refreshInterval = 700L;

            if (now - lastRefreshAt >= refreshInterval) {
                boolean refreshed = refresh != null && performClick(refresh, "refresh");
                if (!refreshed) refreshed = performPullToRefresh(root);
                if (refreshed) {
                    lastRefreshAt = now;
                    scrolls = 0;
                    setStatus("refreshing", "Ninja pull-down refresh executed; waiting for new shifts");
                    return;
                }
                lastRefreshAt = now;
            } else if (scrolls < 3 && scrollDown(root)) {
                scrolls++;
                setStatus("searching", "Scanning visible Ninja shifts");
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

    /**
     * On-device "AI" ranker: interprets the accessible UI text with normalized
     * Arabic/English aliases, hard exclusions, and weighted preference scoring.
     * It deliberately fails closed when the screen does not provide enough
     * evidence; no Ninja API or external AI key is required.
     */
    private AccessibilityNodeInfo findMatchingShiftCardByCriteria(AccessibilityNodeInfo root, JSONObject c) {
        List<AccessibilityNodeInfo> candidates = new ArrayList<>();
        collectNodes(root, candidates);
        String city = normalize(c.optString("cityLabel", ""));
        String districts = normalize(c.optString("districts", ""));
        String branchNumbers = normalize(c.optString("branchNumbers", ""));
        String days = normalize(c.optString("days", ""));
        String startWindow = normalizeTime(c.optString("startTime", "00:00"));
        String endWindow = normalizeTime(c.optString("endTime", "23:59"));
        double minHours = c.optDouble("minDurationHours", 0);
        double maxHours = c.optDouble("maxDurationHours", 99);
        boolean onlyPeak = c.optBoolean("onlyPeakHours", false);

        AccessibilityNodeInfo best = null;
        int bestScore = 0;
        int secondScore = 0;
        String bestFingerprint = "";
        boolean hasBranchFilter = !districts.isEmpty() || !branchNumbers.isEmpty();
        for (AccessibilityNodeInfo node : candidates) {
            String text = normalize(collectText(node));
            if (text.length() < 10 || !hasBookLabel(text)) continue;
            if (containsAny(text, Arrays.asList(
                    "unavailable", "not available", "fully booked", "already booked", "expired",
                    "completed", "cancelled", "canceled", "no longer available", "booking closed",
                    "غير متاح", "غير متاحة", "غير متوفر", "مكتمل", "منتهي", "محجوز",
                    "انتهت", "ملغي", "ملغى", "اكتمل الحجز", "لا يوجد شفت", "لا توجد مناوبات"))) continue;

            int score = 0;
            int matchedSignals = 0;

            if (hasBranchFilter) {
                if (matchesDistrictOrBranch(text, districts, branchNumbers)) {
                    score += 6;
                    matchedSignals++;
                } else {
                    continue;
                }
            }

            if (!city.isEmpty()) {
                if (containsToken(text, city)) {
                    score += 3;
                    matchedSignals++;
                } else if (!hasBranchFilter) {
                    continue;
                }
            }

            int[] pair = extractTimePair(text);
            if (pair != null) {
                double hours = durationHours(pair[0], pair[1]);
                if (hours < minHours || hours > maxHours) continue;
                if (!withinWindow(pair[0], startWindow, endWindow)) continue;
                score += 4;
                matchedSignals++;
                if (withinWindow(pair[1], startWindow, endWindow)) score += 1;
            } else if (minHours > 0 || maxHours < 99 || !"00:00".equals(startWindow) || !"23:59".equals(endWindow)) {
                if (!hasBranchFilter) continue;
            }

            if (!days.isEmpty()) {
                if (containsToken(text, days)) {
                    score += 3;
                    matchedSignals++;
                }
            }
            if (onlyPeak) {
                if (containsAny(text, Arrays.asList("peak", "ذروة", "مميز", "prime", "حوافز", "بونص", "bonus"))) {
                    score += 3;
                    matchedSignals++;
                } else continue;
            } else if (containsAny(text, Arrays.asList("peak", "ذروة", "مميز", "prime", "حوافز", "بونص", "bonus"))) {
                score += 1; // prefer bonus shifts only as a tie-breaker
            }

            score += 2; // explicit booking action is present
            // Reject generic page/container nodes that combine multiple cards.
            String fingerprint = text.length() > 180 ? text.substring(0, 180) : text;
            if (fingerprint.equals(bestFingerprint)) continue;
            if (score > bestScore) {
                secondScore = bestScore;
                best = node;
                bestScore = score;
                bestFingerprint = fingerprint;
            } else if (score > secondScore) {
                secondScore = score;
            }
        }

        // Minimum score threshold
        int minimumScore = hasBranchFilter ? 6 : 4;
        if (bestScore < minimumScore) {
            setStatus("searching", "Scanning visible Ninja shifts (waiting for match); continuing to scan");
            return null;
        }
        setStatus("matching", "On-device matcher selected a shift matching configured criteria (score " + bestScore + ")");
        return best;
    }

    private boolean matchesDistrictOrBranch(String text, String districts, String branchNumbers) {
        if ((districts == null || districts.isEmpty()) && (branchNumbers == null || branchNumbers.isEmpty())) {
            return true;
        }
        if (branchNumbers != null && !branchNumbers.isEmpty()) {
            for (String num : branchNumbers.split("\\|")) {
                String cleanNum = num.replace("#", "").trim();
                if (!cleanNum.isEmpty() && (text.contains("#" + cleanNum) || text.contains(cleanNum))) {
                    return true;
                }
            }
        }
        if (districts != null && !districts.isEmpty()) {
            for (String d : districts.split("\\|")) {
                String clean = normalize(d);
                if (clean.isEmpty()) continue;
                if (text.contains(clean)) return true;
                for (String part : clean.split("[\\s()#]+")) {
                    if (part.length() >= 3 && text.contains(part)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean hasBookLabel(String text) {
        return containsAny(text, Arrays.asList(
            "book shift", "book", "حجز فترة الدوام", "حجز دوام", "احجز دوام",
            "احجز", "حجز", "حجز المناوبة", "حجز الوردية", "حجز الشفت",
            "احجز الآن", "احجز الان", "طلب الحجز", "استلام الوردية", "تسجيل الدوام", "claim",
            "تأكيد", "تاكيد", "موافق", "قبول", "accept", "select", "اختيار"
        ));
    }

    private boolean containsToken(String text, String csv) {
        if (csv == null || csv.trim().isEmpty()) return false;
        for (String token : csv.split("\\|")) {
            String t = normalize(token);
            if (!t.isEmpty() && text.contains(t)) return true;
        }
        return false;
    }

    private int[] extractTimePair(String text) {
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(
            "([01]?\\d|2[0-3])[:.]([0-5]\\d)\\s*(am|pm|ص|م)?\\s*(?:-|–|—|to|الى|إلى)\\s*([01]?\\d|2[0-3])[:.]([0-5]\\d)\\s*(am|pm|ص|م)?",
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher m = p.matcher(text);
        if (m.find()) {
            int h1 = Integer.parseInt(m.group(1));
            int min1 = Integer.parseInt(m.group(2));
            String mod1 = m.group(3);
            int h2 = Integer.parseInt(m.group(4));
            int min2 = Integer.parseInt(m.group(5));
            String mod2 = m.group(6);

            if (mod1 != null) {
                String m1 = mod1.toLowerCase(Locale.ROOT);
                if ((m1.equals("pm") || m1.equals("م")) && h1 < 12) h1 += 12;
                else if ((m1.equals("am") || m1.equals("ص")) && h1 == 12) h1 = 0;
            }
            if (mod2 != null) {
                String m2 = mod2.toLowerCase(Locale.ROOT);
                if ((m2.equals("pm") || m2.equals("م")) && h2 < 12) h2 += 12;
                else if ((m2.equals("am") || m2.equals("ص")) && h2 == 12) h2 = 0;
            } else if (mod1 != null && h2 < h1 && h2 < 12) {
                h2 += 12;
            }
            return new int[]{h1 * 60 + min1, h2 * 60 + min2};
        }

        java.util.regex.Matcher m2 = java.util.regex.Pattern.compile("(?<!\\d)([01]?\\d|2[0-3])[:.]([0-5]\\d)\\s*(?:-|–|—|to|الى|إلى)\\s*([01]?\\d|2[0-3])[:.]([0-5]\\d)(?!\\d)").matcher(text);
        if (m2.find()) {
            return new int[]{Integer.parseInt(m2.group(1))*60 + Integer.parseInt(m2.group(2)), Integer.parseInt(m2.group(3))*60 + Integer.parseInt(m2.group(4))};
        }
        return null;
    }

    private double durationHours(int start, int end) {
        int d = end - start;
        if (d < 0) d += 24 * 60;
        return d / 60.0;
    }

    private boolean withinWindow(int minutes, String start, String end) {
        int a = toMinutes(start), b = toMinutes(end);
        if (a <= b) return minutes >= a && minutes <= b;
        return minutes >= a || minutes <= b;
    }

    private int toMinutes(String value) {
        try { String[] p = value.split(":"); return Integer.parseInt(p[0])*60 + Integer.parseInt(p[1]); }
        catch (Exception e) { return 0; }
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
                    return clickable != null ? clickable : node;
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
                if (android.os.Build.VERSION.SDK_INT >= 24) {
                    Path clickPath = new Path();
                    clickPath.moveTo(r.centerX(), r.centerY());
                    GestureDescription.StrokeDescription clickStroke =
                            new GestureDescription.StrokeDescription(clickPath, 0, 80);
                    GestureDescription clickGesture = new GestureDescription.Builder()
                            .addStroke(clickStroke)
                            .build();
                    clicked = dispatchGesture(clickGesture, null, null);
                } else {
                    clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
            }
        }
        return clicked;
    }

    /**
     * Sends a downward swipe over the active Ninja screen to trigger the
     * app's native pull-to-refresh gesture. This is distinct from
     * ACTION_SCROLL_FORWARD, which only moves through a list.
     */
    private boolean performPullToRefresh(AccessibilityNodeInfo root) {
        if (root == null || android.os.Build.VERSION.SDK_INT < 24) return false;
        Rect bounds = new Rect();
        root.getBoundsInScreen(bounds);
        if (bounds.isEmpty() || bounds.width() < 100 || bounds.height() < 250) return false;

        int x = bounds.centerX();
        // Start pulling down from ~22% of screen height
        int startY = bounds.top + Math.max(100, (int) (bounds.height() * 0.22));
        // Drag downwards to ~65% of screen height (ample travel distance to trigger pull-to-refresh)
        int endY = bounds.top + Math.max(startY + 250, (int) (bounds.height() * 0.65));
        if (endY <= startY + 120) return false;

        Path path = new Path();
        path.moveTo(x, startY);
        path.lineTo(x, endY);
        GestureDescription.StrokeDescription stroke =
                new GestureDescription.StrokeDescription(path, 0, 360);
        GestureDescription gesture = new GestureDescription.Builder()
                .addStroke(stroke)
                .build();
        return dispatchGesture(gesture, null, null);
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
        // Normalize Arabic-Indic and Eastern-Arabic digits
        n = n.replace('٠','0').replace('١','1').replace('٢','2').replace('٣','3').replace('٤','4').replace('٥','5').replace('٦','6').replace('٧','7').replace('٨','8').replace('٩','9');
        n = n.replace('۰','0').replace('۱','1').replace('۲','2').replace('۳','3').replace('۴','4').replace('۵','5').replace('۶','6').replace('۷','7').replace('۸','8').replace('۹','9');
        // Remove Arabic diacritics (tashkeel) and tatweel
        n = n.replaceAll("[\\u064B-\\u065F\\u0670\\u0640]", "");
        // Normalize Alef variations
        n = n.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ٱ', 'ا');
        // Normalize Ta Marbuta and Ha
        n = n.replace('ة', 'ه');
        // Normalize Alef Maqsura and Ya
        n = n.replace('ى', 'ي');
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
        lastReportedStatus = status;
    }

    private void stopAutomation() { stopAutomation(true); }

    private void stopAutomation(boolean setStopped) {
        if (setStopped) setStatus("stopped", "Automation stopped");
        prefs().edit().putBoolean(NatanAutomationPlugin.RUNNING, false).apply();
        handler.removeCallbacks(watchdog);
    }
}
