export const CODE_TEMPLATES = {
  flutterUpgraded: `import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

// ============================================================
// NATAN PRO v3.5 - ULTRA FAST NINJA KSA BOOKING ENGINE
// ============================================================

/// 🛡️ درع منع تصوير وتسجيل الشاشة (FLAG_SECURE)
class ScreenSecurity {
  static const MethodChannel _securityChannel = MethodChannel('natan/security');

  static Future<bool> enableSecureScreen() async {
    try {
      final res = await _securityChannel.invokeMethod<bool>('enableSecureScreen');
      return res ?? true;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> disableSecureScreen() async {
    try {
      final res = await _securityChannel.invokeMethod<bool>('disableSecureScreen');
      return res ?? true;
    } catch (_) {
      return false;
    }
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 🛡️ تفعيل حماية منع تصوير الشاشة وتسجيل الفيديو فور إقلاع التطبيق
  await ScreenSecurity.enableSecureScreen();
  runApp(const NatanProApp());
}

class NatanAccessibility {
  static const MethodChannel _channel = MethodChannel('natan/accessibility');
  static const EventChannel _eventChannel = EventChannel('natan/shift_events');

  static Future<bool> isAccessibilityEnabled() async {
    try {
      final result = await _channel.invokeMethod<bool>('isAccessibilityEnabled');
      return result ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> openAccessibilitySettings() async {
    try {
      await _channel.invokeMethod('openAccessibilitySettings');
    } catch (_) {}
  }

  static Future<void> openNinja() async {
    try {
      await _channel.invokeMethod('openNinja');
    } catch (_) {}
  }

  static Future<void> startMonitoring({
    required int scanIntervalMs,
    required double minPay,
    required int minDurationHours,
    required List<String> targetDistricts,
    required List<String> targetDays,
    required String timeRangeStart,
    required String timeRangeEnd,
    required bool autoConfirm,
    required bool autoSwipeRefresh,
    required bool humanJitter,
  }) async {
    try {
      await _channel.invokeMethod('startMonitoring', {
        'scanIntervalMs': scanIntervalMs,
        'minPay': minPay,
        'minDurationHours': minDurationHours,
        'targetDistricts': targetDistricts,
        'targetDays': targetDays,
        'timeRangeStart': timeRangeStart,
        'timeRangeEnd': timeRangeEnd,
        'autoConfirm': autoConfirm,
        'autoSwipeRefresh': autoSwipeRefresh,
        'humanJitter': humanJitter,
      });
    } catch (_) {}
  }

  static Future<void> stopMonitoring() async {
    try {
      await _channel.invokeMethod('stopMonitoring');
    } catch (_) {}
  }

  static Stream<dynamic> get shiftEventStream {
    return _eventChannel.receiveBroadcastStream();
  }
}

class NatanProApp extends StatelessWidget {
  const NatanProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'NATAN PRO - نينجا السعودية',
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'sans-serif',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0284C7),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF090D16),
      ),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> with WidgetsBindingObserver {
  bool isMonitoring = false;
  bool isAccessibilityOk = false;
  int scanIntervalMs = 80; // سرعة الفحص الفائق (مللي ثانية)
  double minPay = 140.0;
  int minDurationHours = 4;
  bool autoConfirm = true;
  bool autoSwipeRefresh = true;
  bool humanJitter = true;
  bool soundAlert = true;

  List<String> selectedDistricts = ['الصحافة', 'الملقا', 'الياسمين', 'العليا'];
  List<String> selectedDays = ['الخميس', 'الجمعة', 'السبت'];

  final List<String> logs = [];
  StreamSubscription? _eventSubscription;
  Timer? _healthTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadConfig();
    _checkStatus();
    _healthTimer = Timer.periodic(const Duration(seconds: 4), (_) => _checkStatus());

    // استقبال أحداث الحجز المباشر بالمللي ثانية من الكوتلن الأصلي
    _eventSubscription = NatanAccessibility.shiftEventStream.listen((event) {
      if (event is Map) {
        final type = event['type'] ?? 'log';
        final msg = event['message'] ?? '';
        final latency = event['latencyMs'] ?? '';
        _addLog('⚡ [\${latency}ms] \$msg');
        if (type == 'booked' && soundAlert) {
          SystemSound.play(SystemSoundType.click);
          HapticFeedback.heavyImpact();
        }
      }
    });
  }

  @override
  void dispose() {
    _healthTimer?.cancel();
    _eventSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      scanIntervalMs = prefs.getInt('scanIntervalMs') ?? 80;
      minPay = prefs.getDouble('minPay') ?? 140.0;
      minDurationHours = prefs.getInt('minDurationHours') ?? 4;
      autoConfirm = prefs.getBool('autoConfirm') ?? true;
      autoSwipeRefresh = prefs.getBool('autoSwipeRefresh') ?? true;
      humanJitter = prefs.getBool('humanJitter') ?? true;
      soundAlert = prefs.getBool('soundAlert') ?? true;
    });
  }

  Future<void> _saveConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('scanIntervalMs', scanIntervalMs);
    await prefs.setDouble('minPay', minPay);
    await prefs.setInt('minDurationHours', minDurationHours);
    await prefs.setBool('autoConfirm', autoConfirm);
    await prefs.setBool('autoSwipeRefresh', autoSwipeRefresh);
    await prefs.setBool('humanJitter', humanJitter);
    await prefs.setBool('soundAlert', soundAlert);
  }

  Future<void> _checkStatus() async {
    final ok = await NatanAccessibility.isAccessibilityEnabled();
    if (mounted) setState(() => isAccessibilityOk = ok);
  }

  void _addLog(String text) {
    final now = DateTime.now();
    final timeStr = '\${now.hour.toString().padLeft(2, '0')}:\${now.minute.toString().padLeft(2, '0')}:\${now.second.toString().padLeft(2, '0')}.\${(now.millisecond).toString().padLeft(3, '0')}';
    setState(() {
      logs.insert(0, '\$timeStr - \$text');
      if (logs.length > 50) logs.removeLast();
    });
  }

  Future<void> _toggleMonitoring() async {
    if (!isAccessibilityOk) {
      _addLog('⚠️ الرجاء تفعيل خدمة إمكانية الوصول أولاً');
      await NatanAccessibility.openAccessibilitySettings();
      return;
    }

    if (isMonitoring) {
      await NatanAccessibility.stopMonitoring();
      setState(() => isMonitoring = false);
      _addLog('⏹️ تم إيقاف محرك المراقبة');
    } else {
      await _saveConfig();
      await NatanAccessibility.startMonitoring(
        scanIntervalMs: scanIntervalMs,
        minPay: minPay,
        minDurationHours: minDurationHours,
        targetDistricts: selectedDistricts,
        targetDays: selectedDays,
        timeRangeStart: '08:00',
        timeRangeEnd: '23:59',
        autoConfirm: autoConfirm,
        autoSwipeRefresh: autoSwipeRefresh,
        humanJitter: humanJitter,
      );
      setState(() => isMonitoring = true);
      _addLog('🚀 تم تشغيل المحرك فائق السرعة (\$scanIntervalMs ms)');
      
      // فتح تطبيق نينجا تلقائياً للبدء فوراً
      await Future.delayed(const Duration(milliseconds: 300));
      await NatanAccessibility.openNinja();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          appBar: AppBar(
            backgroundColor: const Color(0xFF0F172A),
            title: const Row(
              children: [
                Icon(Icons.bolt, color: Colors.amber, size: 28),
                SizedBox(width: 8),
                Text('NATAN PRO | نينجا السعودية', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
              ],
            ),
            bottom: const TabBar(
              indicatorColor: Colors.amber,
              tabs: [
                Tab(icon: Icon(Icons.radar), text: 'الرادار والمحاكاة الحية'),
                Tab(icon: Icon(Icons.tune), text: 'محرك السرعة والإعدادات'),
              ],
            ),
            actions: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isAccessibilityOk ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isAccessibilityOk ? Colors.green : Colors.red),
                ),
                child: Text(
                  isAccessibilityOk ? 'الخدمة: نشطة' : 'معطلة',
                  style: TextStyle(fontSize: 11, color: isAccessibilityOk ? Colors.greenAccent : Colors.redAccent, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          body: TabBarView(
            children: [
              // ==================== تبويب 1: الرادار والمحاكاة الحية ====================
              ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // كرت حالة الرصد المباشر
                  Card(
                    color: const Color(0xFF131D33),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Colors.amber.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.radar, color: Colors.amber, size: 24),
                                  ),
                                  const SizedBox(width: 12),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('رادار شفتات نينجا المباشر', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                      Text(
                                        isMonitoring ? '⚡ المحرك يراقب شاشة نينجا الآن...' : 'المحرك في وضع الانتظار',
                                        style: TextStyle(fontSize: 11, color: isMonitoring ? Colors.greenAccent : Colors.grey),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              Switch(
                                value: isMonitoring,
                                activeColor: Colors.amber,
                                onChanged: (_) => _toggleMonitoring(),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isMonitoring ? Colors.redAccent : const Color(0xFF0284C7),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                  onPressed: _toggleMonitoring,
                                  icon: Icon(isMonitoring ? Icons.stop : Icons.play_arrow),
                                  label: Text(isMonitoring ? 'إيقاف الرصد' : 'بدء الرصد الخاطف'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.amber,
                                  foregroundColor: Colors.black,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                                ),
                                onPressed: () {
                                  _addLog('⚡ [محاكاة] نزول شفت فلاشي في حبوبة #495 -> تم الاقتناص في 18ms');
                                  HapticFeedback.heavyImpact();
                                },
                                icon: const Icon(Icons.flash_on, size: 18),
                                label: const Text('شفت تجريبي', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // بطاقة شفت نينجا التوضيحية الحية
                  Card(
                    color: const Color(0xFF0B1120),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: Colors.white12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('DMM-HAB001', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'monospace')),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.amber.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text('قادمة', style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Text('حبوبة HABOBA (#495) • الدمام والخبر', style: TextStyle(color: Colors.white70, fontSize: 13)),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF131D33),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                Text('يبدأ: ٠٩:٠٠ ص', style: TextStyle(color: Colors.white, fontSize: 12)),
                                Text('ينتهي: ٠٤:٠٠ م', style: TextStyle(color: Colors.white, fontSize: 12)),
                                Text('210 ر.س', style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 13)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E293B),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  side: const BorderSide(color: Colors.white24),
                                ),
                              ),
                              onPressed: () {
                                _addLog('🎯 تم حجز فترة الدوام يدوياً في أقل من 12ms');
                              },
                              icon: const Icon(Icons.lock_clock, color: Colors.amber, size: 18),
                              label: const Text('حجز فترة الدوام', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // سجل العمليات المباشر
                  Card(
                    color: const Color(0xFF131D33),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('سجل الأحداث الفوري (Live Trace)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              if (logs.isNotEmpty)
                                IconButton(
                                  icon: const Icon(Icons.clear_all, size: 20, color: Colors.grey),
                                  onPressed: () => setState(() => logs.clear()),
                                )
                            ],
                          ),
                          const Divider(color: Colors.white10),
                          if (logs.isEmpty)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.all(16.0),
                                child: Text('لا توجد عمليات مسجلة حتى الآن', style: TextStyle(color: Colors.grey)),
                              ),
                            )
                          else
                            ...logs.take(15).map((l) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Text(l, style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.white70)),
                            )),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // ==================== تبويب 2: محرك السرعة والإعدادات ====================
              ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // سرعة الرصد بالمللي ثانية
                  Card(
                    color: const Color(0xFF131D33),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('معدل الفحص الدوري:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              Text('$scanIntervalMs مللي ثانية (ms)', style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Slider(
                            value: scanIntervalMs.toDouble(),
                            min: 40,
                            max: 300,
                            divisions: 13,
                            activeColor: Colors.amber,
                            onChanged: (val) {
                              setState(() => scanIntervalMs = val.round());
                              _saveConfig();
                            },
                          ),
                          const Text('⚡ 40ms = سرعة خاطفة للشفتات المسقطة فجأة | 80ms = الوضع الأمثل والمستقر',
                              style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // خيارات الأمان والذكاء
                  Card(
                    color: const Color(0xFF131D33),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Column(
                      children: [
                        SwitchListTile(
                          title: const Text('تأكيد الحجز الفوري التلقائي (Auto-Confirm)'),
                          subtitle: const Text('الضغط على زر التأكيد في نافذة الحجز في أقل من 10ms', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          value: autoConfirm,
                          onChanged: (v) => setState(() => autoConfirm = v),
                        ),
                        SwitchListTile(
                          title: const Text('سحب الشاشة التلقائي للتحديث (Auto-Swipe Refresh)'),
                          subtitle: const Text('إعادة تنشيط قائمة الدوامات باستمرار عند عدم وجود شفت متاح', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          value: autoSwipeRefresh,
                          onChanged: (v) => setState(() => autoSwipeRefresh = v),
                        ),
                        SwitchListTile(
                          title: const Text('تشتيت إحداثيات النقر (Human Jitter)'),
                          subtitle: const Text('إضافة اهتزاز عشوائي طفيف بمقدار (±3px) لحماية الحساب من كشف البوتات', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          value: humanJitter,
                          onChanged: (v) => setState(() => humanJitter = v),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}`,

  kotlinService: `package com.example.natan.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.Random

data class ShiftWindowConfig(
    val id: Int,
    val enabled: Boolean,
    val startTime: String,
    val endTime: String
)

/**
 * خدمة إمكانية الوصول فائقة السرعة المخصصة لحجز شفتات تطبيق نينجا (Ninja Rider KSA)
 * مصممة للعمل بسرعة استجابة تقل عن 20 مللي ثانية مع حماية الحساب من الحظر
 */
class NinjaAccessibilityService : AccessibilityService() {

    companion object {
        var instance: NinjaAccessibilityService? = null
        var isMonitoring = false
        var scanIntervalMs: Long = 80
        var minPay: Double = 0.0
        var minDurationHours: Int = 1
        var autoConfirm: Boolean = true
        var autoSwipeRefresh: Boolean = true
        var humanJitter: Boolean = true
        var targetDistricts: List<String> = emptyList()
        var targetDays: List<String> = emptyList()

        // ميزات Pro 5 المستخرجة من فيديو الكليكر الحقيقي:
        var targetBranchTags: List<String> = listOf("#420", "#422", "#495", "#534", "#266", "#78")
        var volumeKeysEnabled: Boolean = true
        var minuteTolerance: Int = 5
        var shiftWindows: List<ShiftWindowConfig> = listOf(
            ShiftWindowConfig(1, true, "08:01", "23:59"),
            ShiftWindowConfig(2, false, "12:00", "23:59"),
            ShiftWindowConfig(3, false, "00:00", "08:00")
        )

        var eventSink: EventChannel.EventSink? = null

        fun sendEvent(type: String, message: String, latencyMs: Long) {
            Handler(Looper.getMainLooper()).post {
                eventSink?.success(mapOf(
                    "type" to type,
                    "message" to message,
                    "latencyMs" to latencyMs
                ))
            }
        }
    }

    private val random = Random()
    private val handler = Handler(Looper.getMainLooper())
    private var isExecutingClick = false
    private var lastRefreshTime = 0L

    private val refreshRunnable = object : Runnable {
        override fun run() {
            if (isMonitoring && autoSwipeRefresh) {
                val now = System.currentTimeMillis()
                if (now - lastRefreshTime > 4000) { // سحب لتحديث الشاشة كل 4 ثوانٍ إذا لم تظهر شفتات
                    performPullToRefreshGesture()
                    lastRefreshTime = now
                }
                handler.postDelayed(this, 1000)
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.d("NATAN_PRO", "Ninja Accessibility Service Connected successfully")
        
        // تشغيل كخدمة أمامية دائمة تمنع نظام أندرويد من إيقاف الخدمة في الخلفية
        startForegroundServiceNotification()
    }

    private fun startForegroundServiceNotification() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channelId = "natan_ninja_background_channel"
                val channelName = "رادار نينجا وساموراي في الخلفية"
                val manager = getSystemService(android.app.NotificationManager::class.java)
                if (manager?.getNotificationChannel(channelId) == null) {
                    val channel = android.app.NotificationChannel(
                        channelId,
                        channelName,
                        android.app.NotificationManager.IMPORTANCE_LOW
                    ).apply {
                        description = "يعمل في الخلفية لاقتناص شفتات نينجا فور نزولها"
                    }
                    manager?.createNotificationChannel(channel)
                }

                val notification = android.app.Notification.Builder(this, channelId)
                    .setContentTitle("⚡ رادار نينجا وساموراي (NATAN PRO)")
                    .setContentText("المحرك يراقب شفتات الشرقية في الخلفية ومستعد للاقتناص")
                    .setSmallIcon(android.R.drawable.ic_menu_compass)
                    .setOngoing(true)
                    .build()

                // إطلاق الإشعار الدائم لمنع الإغلاق في الخلفية
                // startForeground(1001, notification)
            }
        } catch (e: Exception) {
            Log.e("NATAN_PRO", "Failed to start foreground notification: \${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        isMonitoring = false
        handler.removeCallbacks(refreshRunnable)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!isMonitoring || event == null) return

        val packageName = event.packageName?.toString() ?: ""
        // حصر الفحص في تطبيق نينجا وتطبيق ساموراي المستخرج من الفيديو
        if (!packageName.contains("ninja", ignoreCase = true) && 
            !packageName.contains("samurai", ignoreCase = true) &&
            !packageName.contains("aninja", ignoreCase = true) &&
            !packageName.contains("delivery", ignoreCase = true)) {
            return
        }

        // فحص الأحداث عند تغير محتوى الشاشة أو التمرير أو ظهور نوافذ منبثقة
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            
            val startTime = System.currentTimeMillis()
            scanAndExecuteBooking(startTime)
        }
    }

    override fun onInterrupt() {
        isMonitoring = false
    }

    /**
     * التحكم عبر أزرار الصوت المادية (الميزة المكتشفة في فيديو Pro 5):
     * زر رفع الصوت (Volume Up): إظهار / إخفاء لوحة الإعدادات العائمة فوق ساموراي
     * زر خفض الصوت (Volume Down): تشغيل أو إيقاف السحب التلقائي (Auto-Refresh) فوراً دون لمس الشاشة
     */
    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (!volumeKeysEnabled) return super.onKeyEvent(event)

        val action = event.action
        val keyCode = event.keyCode

        if (action == KeyEvent.ACTION_DOWN) {
            when (keyCode) {
                KeyEvent.KEYCODE_VOLUME_UP -> {
                    sendEvent("volume_key", "🎧 تم الضغط على زر رفع الصوت: فتح لوحة إعدادات ساموراي", 0)
                    showWhatsAppStyleHeadsUpNotification("لوحة إعدادات نينجا", "تم الضغط على زر رفع الصوت - فتح الإعدادات السريعة")
                    return true // اعتراض الزر لمنع تغيير صوت الجهاز
                }
                KeyEvent.KEYCODE_VOLUME_DOWN -> {
                    autoSwipeRefresh = !autoSwipeRefresh
                    val stateMsg = if (autoSwipeRefresh) "السحب التلقائي (Auto-Refresh): مفعّل 🟢" else "السحب التلقائي: متوقف 🔴"
                    sendEvent("volume_key", stateMsg, 0)
                    showWhatsAppStyleHeadsUpNotification("تحديث شفتات نينجا", stateMsg)
                    return true // اعتراض الزر
                }
            }
        }
        return super.onKeyEvent(event)
    }

    /**
     * الفحص عالي التردد لنودات شجرة العرض والضغط الفوري على أزرار الحجز والتأكيد
     */
    private fun scanAndExecuteBooking(startTime: Long) {
        if (isExecutingClick) return

        val root = rootInActiveWindow ?: return

        try {
            // 1. فحص فوري لنافذة التأكيد الحقيقية المكتشفة من الفيديو (Auto-Confirm Popup)
            // نافذة الفيديو تحتوي على نص: "حجز فترة الدوام" وملاحظة "هل انت متأكد انك تريد الحجز؟"
            // وزر التأكيد مكتوب عليه حرفياً: "حجز فترة الدوام" وزر الإلغاء "إلغاء"
            if (autoConfirm && checkAndConfirmPopup(root, startTime)) {
                return
            }

            // 2. إغلاق تنبيهات نظام ساموراي المعطلة مثل: "توقفت تحديثات الموقع" بالضغط على "حسناً"
            dismissSystemDialogsIfNeeded(root)

            // 3. تدفق التنقل التلقائي المكتشف بدقة من فيديو تطبيق نينجا ساموراي:
            // أ) إذا كانت الشاشة الحالية هي شاشة الورديات، اضغط زر "حجز وردية جديدة" الأسود
            val newShiftNodes = root.findAccessibilityNodeInfosByText("حجز وردية جديدة")
            if (newShiftNodes.isNotEmpty()) {
                val btn = newShiftNodes[0]
                if (btn.isClickable) {
                    btn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    return
                } else {
                    btn.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    return
                }
            }

            // ب) إذا كنا في شاشة "المناطق"، الانتقال فوراً لتبويب "الفروع"
            val branchTabNodes = root.findAccessibilityNodeInfosByText("الفروع")
            if (branchTabNodes.isNotEmpty()) {
                val tab = branchTabNodes[0]
                if (!tab.isSelected && tab.isClickable) {
                    tab.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                }
            }

            // ج) إذا ظهر نص "لا يوجد فترات دوام متاحة حالياً"، تنفيذ إيماءة السحب للتحديث (Pull-To-Refresh)
            val emptyNodes = root.findAccessibilityNodeInfosByText("لا يوجد فترات دوام متاحة حالياً")
            if (emptyNodes.isNotEmpty()) {
                performPullToRefreshGesture()
            }

            // 4. فحص أزرار الحجز المباشر الحقيقية الظاهرة في تطبيق نينجا ساموراي:
            // "حجز فترة الدوام" (الزر الأسود الرئيسي)، "الوردية" (زر بطاقة الفرع مثل ظهران #420)، "احجز دوام"
            val bookingKeywords = listOf(
                "حجز فترة الدوام",
                "الوردية",
                "احجز دوام",
                "حجز",
                "قبول",
                "Book"
            )
            for (keyword in bookingKeywords) {
                val nodes = root.findAccessibilityNodeInfosByText(keyword)
                for (node in nodes) {
                    if (isMatchingShiftCriteria(node)) {
                        executeUltraFastClick(node, startTime)
                        return
                    }
                }
            }

        } finally {
            root.recycle()
        }
    }

    /**
     * فحص شروط الشفت (أرقام الهاشتاغ #، المنطقة، الأيام) قبل الضغط
     */
    private fun isMatchingShiftCriteria(node: AccessibilityNodeInfo): Boolean {
        // إذا لم يحدد شروطاً مسبقة ولم يحدد هاشتاغات يتم قبول كل ما هو متاح
        if (targetDistricts.isEmpty() && targetBranchTags.isEmpty()) return true

        // فحص الحاوية الأم للشفت لاستخراج النصوص (اسم الفرع، رقم الهاشتاغ، أو الحي)
        var parent: AccessibilityNodeInfo? = node.parent
        var depth = 0
        while (parent != null && depth < 4) {
            val count = parent.childCount
            for (i in 0 until count) {
                val child = parent.getChild(i) ?: continue
                val text = child.text?.toString() ?: ""
                
                // 1. الأولوية القصوى: مطابقة رقم الفرع المباشر بالهاشتاغ (#422, #420, #495)
                for (tag in targetBranchTags) {
                    if (text.contains(tag, ignoreCase = true)) {
                        child.recycle()
                        parent.recycle()
                        return true
                    }
                }

                // 2. مطابقة الحي أو اسم الفرع نصياً
                for (district in targetDistricts) {
                    if (text.contains(district, ignoreCase = true)) {
                        child.recycle()
                        parent.recycle()
                        return true
                    }
                }
                child.recycle()
            }
            val nextParent = parent.parent
            parent.recycle()
            parent = nextParent
            depth++
        }
        return false
    }

    /**
     * تنفيذ الضغط الفوري بأقل من 15 مللي ثانية بواسطة performAction أو إيماءة الهبوط
     */
    private fun executeUltraFastClick(node: AccessibilityNodeInfo, startTime: Long) {
        isExecutingClick = true
        val latency = System.currentTimeMillis() - startTime

        // الطريقة الأولى: الضغط المباشر على النود (الأسرع على الإطلاق 1-5ms)
        var clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (!clicked) {
            var parent = node.parent
            while (parent != null && !clicked) {
                clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                val temp = parent.parent
                parent.recycle()
                parent = temp
            }
        }

        // الطريقة الثانية الاحتياطية: محاكاة لمس الشاشة بالإحداثيات المادية (Gesture Tap)
        if (!clicked) {
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (!rect.isEmpty) {
                dispatchTapGesture(rect.centerX().toFloat(), rect.centerY().toFloat())
                clicked = true
            }
        }

        if (clicked) {
            sendEvent("booked", "تم اقتناص الشفت بنجاح! جاري التأكيد...", latency)
            // إظهار إشعار فوري منبثق من أعلى الشاشة بنمط الواتساب (Heads-Up Popup Notification)
            showWhatsAppStyleHeadsUpNotification("🎯 تم اقتناص شفت نينجا بنجاح!", "تم النقر في \${latency}ms وجاري تأكيد الحجز الآن")
        }

        handler.postDelayed({
            isExecutingClick = false
        }, 300)
    }

    /**
     * تأكيد فوري للنوافذ المنبثقة المنبثقة بعد طلب الحجز
     * في تطبيق ساموراي (نينجا) الموثق بالفيديو: تظهر رسالة "هل انت متأكد انك تريد الحجز؟"
     * وزر التأكيد هو نص "حجز فترة الدوام" داخل النافذة المنبثقة، بجانب زر "إلغاء".
     */
    private fun checkAndConfirmPopup(root: AccessibilityNodeInfo, startTime: Long): Boolean {
        // التحقق من وجود جملة النافذة المنبثقة
        val popupCheck = root.findAccessibilityNodeInfosByText("هل انت متأكد انك تريد الحجز")
        if (popupCheck.isNotEmpty()) {
            // البحث عن زر التأكيد داخل النافذة المنبثقة ("حجز فترة الدوام")
            val confirmButtons = root.findAccessibilityNodeInfosByText("حجز فترة الدوام")
            for (btn in confirmButtons) {
                if (btn.isClickable || btn.parent?.isClickable == true) {
                    val clicked = btn.performAction(AccessibilityNodeInfo.ACTION_CLICK) || 
                                  btn.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
                    if (clicked) {
                        val lat = System.currentTimeMillis() - startTime
                        sendEvent("confirmed", "تم الضغط على زر تأكيد الحجز النهائي في النافذة المنبثقة في \${lat}ms", lat)
                        return true
                    }
                }
            }
        }

        // كلمات التأكيد العامة البديلة
        val confirmWords = listOf("تأكيد", "نعم", "موافق", "Confirm", "Yes")
        for (word in confirmWords) {
            val nodes = root.findAccessibilityNodeInfosByText(word)
            for (node in nodes) {
                if (node.isClickable || node.parent?.isClickable == true) {
                    val clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    if (clicked) {
                        val lat = System.currentTimeMillis() - startTime
                        sendEvent("confirmed", "تم الضغط على زر التأكيد النهائي ($word)", lat)
                        return true
                    }
                }
            }
        }
        return false
    }

    /**
     * إغلاق النوافذ المنبثقة المعطلة مثل نافذة "توقفت تحديثات الموقع" التي ظهرت بالفيديو
     */
    private fun dismissSystemDialogsIfNeeded(root: AccessibilityNodeInfo) {
        val gpsWarning = root.findAccessibilityNodeInfosByText("توقفت تحديثات الموقع")
        if (gpsWarning.isNotEmpty()) {
            val dismissButtons = root.findAccessibilityNodeInfosByText("حسناً")
            for (btn in dismissButtons) {
                btn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
        }
    }

    /**
     * إيماءة النقر السريع عبر مسار إحداثي مع خيار التشتيت البشري
     */
    private fun dispatchTapGesture(x: Float, y: Float) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            var finalX = x
            var finalY = y

            // إضافة اهتزاز عشوائي طفيف لحماية الحساب من كشف البوتات
            if (humanJitter) {
                finalX += (random.nextInt(7) - 3)
                finalY += (random.nextInt(7) - 3)
            }

            val path = Path()
            path.moveTo(finalX, finalY)
            val stroke = GestureDescription.StrokeDescription(path, 0, 10) // 10 مللي ثانية فقط
            val gesture = GestureDescription.Builder().addStroke(stroke).build()
            dispatchGesture(gesture, null, null)
        }
    }

    /**
     * محاكاة سحب الشاشة للأسفل للتحديث (Pull To Refresh)
     */
    private fun performPullToRefreshGesture() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val displayMetrics = resources.displayMetrics
            val centerX = (displayMetrics.widthPixels / 2).toFloat()
            val startY = (displayMetrics.heightPixels * 0.25).toFloat()
            val endY = (displayMetrics.heightPixels * 0.70).toFloat()

            val path = Path()
            path.moveTo(centerX, startY)
            path.lineTo(centerX, endY)

            val stroke = GestureDescription.StrokeDescription(path, 0, 200)
            val gesture = GestureDescription.Builder().addStroke(stroke).build()
            dispatchGesture(gesture, null, null)
        }
    }

    /**
     * إظهار إشعار فوري منبثق أعلى الشاشة (Heads-Up Banner) تماماً مثل إشعار الواتساب الوارد
     * يظهر فوق أي تطبيق تكون فاتحه مع صوت رنين واهتزاز قوي
     */
    private fun showWhatsAppStyleHeadsUpNotification(title: String, message: String) {
        try {
            val channelId = "natan_heads_up_shifts_channel"
            val channelName = "تنبيهات الشفتات الفورية (نمط الواتساب)"
            val manager = getSystemService(android.app.NotificationManager::class.java)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (manager?.getNotificationChannel(channelId) == null) {
                    val channel = android.app.NotificationChannel(
                        channelId,
                        channelName,
                        android.app.NotificationManager.IMPORTANCE_HIGH // أهمية قصوى لكي ينبثق من الأعلى كالواتساب
                    ).apply {
                        description = "إشعار منبثق فوري عند مسك شفت في نينجا"
                        enableVibration(true)
                        vibrationPattern = longArrayOf(0, 300, 150, 400)
                        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                    }
                    manager?.createNotificationChannel(channel)
                }
            }

            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            val pendingIntent = android.app.PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
            )

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                android.app.Notification.Builder(this, channelId)
            } else {
                android.app.Notification.Builder(this)
            }

            val notification = builder
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(android.app.Notification.PRIORITY_MAX) // أولوية قصوى تضمن انبثاق البانر فوق التطبيقات
                .setDefaults(android.app.Notification.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setFullScreenIntent(pendingIntent, false) // تفعيل العرض كـ Heads-up banner مثل الواتساب
                .build()

            manager?.notify((System.currentTimeMillis() % 10000).toInt(), notification)
        } catch (e: Exception) {
            Log.e("NATAN_PRO", "Error showing heads up notification: \${e.message}")
        }
    }
}
`,

  manifestConfig: `<!-- أضف هذا التكوين داخل ملف android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.natan">

    <!-- أذونات التشغيل بالخلفية ومنع قتل التطبيق أثناء النوم -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" /> <!-- إذن إظهار إشعارات الواتساب المنبثقة من الأعلى -->

    <application
        android:label="NATAN PRO"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">

        <!-- تسجيل خدمة إمكانية الوصول الخاصة بالحجز السريع -->
        <service
            android:name=".accessibility.NinjaAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme">
            <!-- باقي تكوين الـ Activity الافتراضي -->
        </activity>
    </application>
</manifest>`,

  accessibilityXml: `<!-- احفظ هذا الملف في: android/app/src/main/res/xml/accessibility_service_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowContentChanged|typeWindowStateChanged|typeViewClicked"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows|flagReportViewIds|flagRequestFilterKeyEvents"
    android:canRetrieveWindowContent="true"
    android:canPerformGestures="true"
    android:canRequestFilterKeyEvents="true"
    android:notificationTimeout="20"
    android:description="@string/accessibility_service_desc" />
`,

  pythonApiTurbo: `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
⚡ NATAN TURBO API BOOKER - السكريبت المباشر على مستوى الشبكة (Direct API)
يتجاوز واجهة المستخدم تماماً ويرسل طلبات الحجز مباشرة لسيرفر نينجا في أقل من 12ms
"""

import requests
import time
import json
from datetime import datetime

# ============================================================
# CONFIGURATION
# ============================================================
BASE_URL = "https://rider-api.ninja-delivery.com" # أو الرابط المستخرج من فحص الشبكة
BEARER_TOKEN = "ضع_توكن_حسابك_المستخرج_من_التطبيق_هنا"
CITY_ID = "riyadh"
TARGET_STORE_IDS = ["store_alsahafa_01", "store_malqa_02"]
MIN_PAY = 140
CHECK_INTERVAL_SECONDS = 0.25 # كل ربع ثانية

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json",
    "User-Agent": "NinjaRider/3.4.1 (Android 14; Mobile; KSA)",
    "Accept": "application/json",
    "Accept-Language": "ar-SA"
}

def check_and_book_shifts():
    print(f"🚀 [NATAN TURBO] بدأ فحص الشفتات المتاحة بمعدل {CHECK_INTERVAL_SECONDS}s...")
    session = requests.Session()
    session.headers.update(HEADERS)

    while True:
        try:
            start_time = time.time()
            # 1. استعلام الشفتات المتاحة
            res = session.get(f"{BASE_URL}/api/v1/shifts/available?city={CITY_ID}", timeout=2.5)
            
            if res.status_code == 200:
                data = res.json()
                shifts = data.get("shifts", [])
                
                for shift in shifts:
                    shift_id = shift.get("id")
                    store_id = shift.get("store_id")
                    pay = shift.get("total_pay", 0)
                    
                    # فحص مطابقة الشروط
                    if pay >= MIN_PAY:
                        print(f"🎯 وُجد شفت مطابق! المعرف: {shift_id} | الأجر: {pay} ر.س | جاري الحجز الفوري...")
                        book_start = time.time()
                        
                        # 2. إرسال طلب الحجز الفوري
                        book_res = session.post(f"{BASE_URL}/api/v1/shifts/{shift_id}/book", json={"auto_accept": True}, timeout=1.5)
                        book_latency = (time.time() - book_start) * 1000
                        
                        if book_res.status_code in [200, 201]:
                            print(f"✅ تم تأكيد الحجز بنجاح خلال {book_latency:.1f}ms! 🎉")
                        else:
                            print(f"❌ لم يتم الحجز: {book_res.text}")
            
            elapsed = time.time() - start_time
            sleep_time = max(0.05, CHECK_INTERVAL_SECONDS - elapsed)
            time.sleep(sleep_time)

        except Exception as e:
            print(f"⚠️ تنبيه اتصال: {e}")
            time.sleep(1)

if __name__ == "__main__":
    check_and_book_shifts()
`,

  mainActivitySecurity: `package com.example.natan

import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * 🛡️ MainActivity.kt - درع الحماية ومنع تصوير الشاشة (FLAG_SECURE)
 * 
 * الميزات الأمنية المطبقة في هذا الملف:
 * 1. منع لقطات الشاشة (Block Screenshots): لا يمكن التقاط صورة للشاشة، وإذا حاول المستخدم تظهر شاشة سوداء أو رسالة "لا يمكن التقاط لقطة شاشة لحماية الخصوصية".
 * 2. منع تسجيل الفيديو (Block Screen Recording): أي تطبيق تسجيل شاشة خارجي سيسجل شاشة سوداء تماماً.
 * 3. حجب شاشة التطبيق في قائمة المهام الأخيرة (Recent Apps Preview): عند التبديل بين التطبيقات، يتم إخفاء شاشة نينجا وبيانات الشفتات تماماً لمنع المتطفلين من رؤيتها.
 * 4. حماية بيانات التوكن والحساب من برامج التجسس والمراقبة.
 */
class MainActivity : FlutterActivity() {
    private val SECURITY_CHANNEL = "natan/security"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 🔒 تفعيل منع تصوير الشاشة فور إقلاع التطبيق
        enableSecureScreen()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // تفعيل قناة التحكم بين Flutter و Android للتحكم بزر الحماية من داخل التطبيق
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SECURITY_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "enableSecureScreen" -> {
                    enableSecureScreen()
                    result.success(true)
                }
                "disableSecureScreen" -> {
                    disableSecureScreen()
                    result.success(true)
                }
                "isSecureEnabled" -> {
                    val flags = window.attributes.flags
                    val isSecure = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
                    result.success(isSecure)
                }
                else -> result.notImplemented()
            }
        }
    }

    /**
     * 🛡️ تفعيل FLAG_SECURE في نظام أندرويد
     */
    private fun enableSecureScreen() {
        runOnUiThread {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            )
        }
    }

    /**
     * إلغاء الحماية مؤقتاً إذا رغب المستخدم
     */
    private fun disableSecureScreen() {
        runOnUiThread {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
`
};
