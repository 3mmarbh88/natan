import { SaudiCity } from '../types';

export const SAUDI_CITIES: SaudiCity[] = [
  {
    id: 'riyadh',
    name: 'الرياض',
    nameEn: 'Riyadh',
    region: 'المنطقة الوسطى',
    districts: [
      'الصحافة (دارك ستور نينجا 01)',
      'الملقا (مستودع أنس بن مالك)',
      'الياسمين (مركز التوزيع الشمالي)',
      'النرجس (فرع طريق الملك سلمان)',
      'العليا (دارك ستور التحلية)',
      'السليمانية (فرع العروبة)',
      'الروضة (مستودع خالد بن الوليد)',
      'النسيم (دارك ستور الشرق)',
      'اليرموك (فرع الإمام الشافعي)',
      'الرمال (مستودع المطار)',
      'حطين (دارك ستور البوليفارد)',
      'طويق وغرب الرياض (فرع نجم الدين)'
    ]
  },
  {
    id: 'jeddah',
    name: 'جدة',
    nameEn: 'Jeddah',
    region: 'المنطقة الغربية',
    districts: [
      'الصفا (دارك ستور الأربعين)',
      'الروضة (فرع الكيال)',
      'الزهراء (مستودع حلمي كتبي)',
      'الحمراء (فرع الأندلس)',
      'المرجان وأبحر (فرع الشمال)',
      'السامر والمنار (دارك ستور الشرق)',
      'البغدادية والبلد (المركز الرئيسي)'
    ]
  },
  {
    id: 'dammam_khobar',
    name: 'الدمام والخبر',
    nameEn: 'Dammam & Khobar',
    region: 'المنطقة الشرقية',
    districts: [
      'حبوبة HABOBA (#495)',
      'الشاطئ Shatie (#266)',
      'ظهران Dahran (#420)',
      'الظهران صيدلية DAHARAN PH (#471)',
      'الأمل Al Amal (#532)',
      'ضاحية الملك فهد King Fahad (#534)',
      'شعلة Shulah (#544)',
      'طيبة Taibah (#546)',
      'العروبة AL-Orouba (#557)',
      'النور An Nur (#376)',
      'الندى Nada (#100)',
      'المنار Almanar (#415)'
    ]
  },
  {
    id: 'makkah',
    name: 'مكة المكرمة',
    nameEn: 'Makkah',
    region: 'المنطقة الغربية',
    districts: [
      'العزيزية (دارك ستور محبس الجن)',
      'الشوقية (فرع الدائري الثالث)',
      'بطحاء قريش (المستودع الجنوبي)'
    ]
  },
  {
    id: 'madinah',
    name: 'المدينة المنورة',
    nameEn: 'Madinah',
    region: 'المنطقة الغربية',
    districts: [
      'سلطانة (دارك ستور الدائري الثاني)',
      'الهجرة (فرع طريق الهجرة)',
      'العزيزية (المدينة الغربية)'
    ]
  }
];

export const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

export const SAUDI_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  riyadh: { lat: 24.7136, lng: 46.6753 },
  jeddah: { lat: 21.5433, lng: 39.1728 },
  dammam_khobar: { lat: 26.4207, lng: 50.0888 },
  makkah: { lat: 21.3891, lng: 39.8579 },
  madinah: { lat: 24.5247, lng: 39.5692 },
};

export function getClosestSaudiCity(lat: number, lng: number): SaudiCity {
  let closest = SAUDI_CITIES[0];
  let minDistance = Infinity;

  for (const city of SAUDI_CITIES) {
    const coords = SAUDI_CITY_COORDINATES[city.id];
    if (!coords) continue;
    const dist = Math.hypot(coords.lat - lat, coords.lng - lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  return closest;
}
