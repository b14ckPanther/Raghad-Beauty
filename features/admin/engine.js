/* Raghad Beauty admin engine.
   Schema-driven: every screen is a list of blocks, each block either a
   collection (list + edit drawer) or a single settings form. Every change is
   written to Supabase through `db` and the storefront is revalidated. */
import { IC, RB_MARK } from '../storefront/icons';

export function mountAdmin(host, S, db, ctx) {
  var uid = function (p) { return (p || 'id') + '-' + Math.random().toString(36).slice(2, 8); };
  var ac = new AbortController(), sig = { signal: ac.signal };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var cur = function () { return S.settings.currency; };
  var opts = function (list, label) { return function () { return S[list].map(function (x) { return [x.id, x[label || 'name']]; }); }; };
  var objOpts = function (key) { return function () { return Object.keys(S.labels[key]).map(function (k) { return [k, S.labels[key][k]]; }); }; };

  /* ---------- schemas ---------- */
  var COLL = {
    products: {
      title: 'المنتجات', add: 'منتج جديد', search: true, reorder: true,
      thumb: function (r) { return { img: r.thumb, c: r.bg }; },
      name: function (r) { return '<span class="ltr">' + esc(r.name) + '</span>' + (r.sourceNote ? '<span class="tag warn">يحتاج تأكيد</span>' : ''); },
      sub: function (r) { return esc(r.nameAr) + ' - ' + (r.price == null ? '<span class="tag err">بدون سعر</span>' : '<span class="ltr">' + r.price + ' ' + cur() + '</span>'); },
      toggles: [['available', 'متوفر'], ['visible', 'ظاهر في المتجر'], ['featured', 'في الواجهة']],
      blank: function () { return { id: uid('p'), brand: 'skala', category: 'hair-cream', line: '', name: '', nameAr: '', summary: '', benefits: [], actives: '', need: [], hair: [], texture: '', usage: [], size: '', price: null, compareAt: null, img: '', thumb: '', bg: '#e9c4d6', r1: '#b4125f', r2: '#f2a12a', available: true, visible: true, featured: false, family: false, sourceNote: '' }; },
      fields: [
        { k: 'sourceNote', type: 'note' }, { k: 'sourceNote', label: 'ملاحظة داخلية (لا تظهر للزبائن)', hint: 'امسحيها بعد تأكيد المعلومة' },
        { k: 'img', label: 'صورة المنتج', type: 'image' },
        { k: 'name', label: 'الاسم كما على العبوة', ltr: true, req: true, half: true }, { k: 'nameAr', label: 'الاسم بالعربية', req: true, half: true },
        { k: 'brand', label: 'العلامة التجارية', type: 'select', opts: opts('brands'), half: true }, { k: 'category', label: 'القسم', type: 'select', opts: opts('categories'), half: true },
        { k: 'price', label: 'السعر', type: 'number', nullable: true, hint: 'بدون سعر لا يمكن طلب المنتج', half: true }, { k: 'compareAt', label: 'السعر قبل الخصم', type: 'number', nullable: true, hint: 'اختياري', half: true },
        { k: 'line', label: 'السلسلة', ltr: true, hint: 'مثل Expert أو Brasil', half: true }, { k: 'size', label: 'الحجم', ltr: true, half: true },
        { k: 'summary', label: 'وصف مختصر', type: 'textarea' },
        { k: 'benefits', label: 'الفوائد', type: 'lines', hint: 'فائدة واحدة في كل سطر' },
        { k: 'actives', label: 'المواد الفعالة' },
        { k: 'need', label: 'نوع المنتج', type: 'multi', opts: opts('needs') },
        { k: 'hair', label: 'يناسب شعر', type: 'multi', opts: function () { return [['all', 'كل الأنواع']].concat(opts('hairTypes')()); } },
        { k: 'texture', label: 'القوام', type: 'select', opts: function () { return [['', 'غير محدد']].concat(objOpts('textures')()); }, half: true },
        { k: 'usage', label: 'طرق الاستخدام', type: 'multi', opts: objOpts('usages') },
        { k: 'family', label: 'للأطفال والعائلة', type: 'toggle' },
        { k: 'bg', label: 'لون خلفية المنتج', type: 'color', half: true }, { k: 'r1', label: 'لون الخصلة 1', type: 'color', half: true }, { k: 'r2', label: 'لون الخصلة 2', type: 'color', half: true }
      ]
    },
    categories: { title: 'الأقسام', add: 'قسم جديد', reorder: true, icon: 'grid', name: function (r) { return esc(r.name); }, sub: function (r) { return S.products.filter(function (p) { return p.category === r.id; }).length + ' منتج'; }, toggles: [['visible', 'ظاهر']], blank: function () { return { id: uid('cat'), name: '', visible: true }; }, fields: [{ k: 'name', label: 'اسم القسم', req: true }] },
    brands: { title: 'العلامات التجارية', add: 'علامة جديدة', reorder: true, icon: 'tag', name: function (r) { return '<span class="ltr">' + esc(r.name) + '</span>'; }, sub: function (r) { return esc(r.nameAr) + (r.origin ? ' - ' + esc(r.origin) : ''); }, toggles: [['visible', 'ظاهرة']], blank: function () { return { id: uid('b'), name: '', nameAr: '', origin: '', visible: true }; }, fields: [{ k: 'name', label: 'الاسم بالإنجليزية', ltr: true, req: true, half: true }, { k: 'nameAr', label: 'الاسم بالعربية', half: true }, { k: 'origin', label: 'بلد المنشأ' }] },
    needs: { title: 'أنواع المنتج (ترطيب، بروتين...)', add: 'نوع جديد', reorder: true, icon: 'drop', name: function (r) { return esc(r.name); }, sub: function () { return ''; }, blank: function () { return { id: uid('n'), name: '', icon: 'drop' }; }, fields: [{ k: 'name', label: 'الاسم', req: true }, { k: 'icon', label: 'الأيقونة', type: 'select', opts: function () { return [['drop', 'قطرة'], ['bond', 'روابط'], ['leaf', 'ورقة'], ['feather', 'ريشة']]; } }] },
    hairTypes: { title: 'أنواع الشعر', add: 'نوع شعر جديد', reorder: true, icon: 'hair_wavy', name: function (r) { return esc(r.name); }, sub: function (r) { return 'شدة التجعيد في المجسم: ' + Math.round(r.curl * 100) + '%'; }, blank: function () { return { id: uid('h'), name: '', curl: 0.5 }; }, fields: [{ k: 'name', label: 'الاسم', req: true }, { k: 'curl', label: 'شدة التجعيد (0 إلى 1)', type: 'number', step: '0.05', hint: 'تتحكم بشكل الخصلة ثلاثية الأبعاد في الواجهة' }] },
    coupons: {
      title: 'الكوبونات', add: 'كوبون جديد', icon: 'tag',
      name: function (r) { var ex = r.expires && r.expires < today(); return '<span class="ltr">' + esc(r.code) + '</span>' + (ex ? '<span class="tag err">منتهي</span>' : r.active ? '<span class="tag ok">فعال</span>' : '<span class="tag">متوقف</span>'); },
      sub: function (r) { return (r.type === 'percent' ? 'خصم ' + r.value + '%' : 'خصم ' + r.value + ' ' + cur()) + (r.min ? ' - للطلبات من ' + r.min + ' ' + cur() : '') + (r.expires ? ' - حتى <span class="ltr">' + esc(r.expires) + '</span>' : ''); },
      toggles: [['active', 'فعال']],
      blank: function () { return { id: uid('c'), code: '', type: 'percent', value: 10, min: 0, expires: '', active: true, label: '' }; },
      fields: [{ k: 'code', label: 'رمز الكوبون', ltr: true, req: true, upper: true, half: true }, { k: 'label', label: 'وصف داخلي', half: true }, { k: 'type', label: 'نوع الخصم', type: 'select', opts: function () { return [['percent', 'نسبة مئوية %'], ['fixed', 'مبلغ ثابت']]; }, half: true }, { k: 'value', label: 'قيمة الخصم', type: 'number', req: true, half: true }, { k: 'min', label: 'أقل مبلغ للطلب', type: 'number', hint: '0 = بدون حد أدنى', half: true }, { k: 'expires', label: 'ينتهي في', type: 'date', hint: 'اتركيه فارغا لكوبون دائم', half: true }]
    },
    regions: { title: 'مناطق التوصيل', add: 'منطقة جديدة', reorder: true, icon: 'truck', name: function (r) { return esc(r.name); }, sub: function (r) { return (r.fee ? '<span class="ltr">' + r.fee + ' ' + cur() + '</span>' : 'مجانا') + (r.km ? ' - <span class="ltr">' + r.km + ' km</span>' : '') + (r.towns ? ' - ' + esc(r.towns) : ''); }, toggles: [['active', 'متاحة']], blank: function () { return { id: uid('r'), name: '', towns: '', km: 0, fee: null, eta: '', active: true }; }, fields: [{ k: 'name', label: 'اسم المنطقة', req: true }, { k: 'towns', label: 'البلدات ضمن المنطقة', type: 'textarea', hint: 'تظهر للزبونة تحت اسم المنطقة لتعرف أين تقع بلدتها' }, { k: 'km', label: 'المسافة من نحف (كم)', type: 'number', half: true }, { k: 'fee', label: 'رسوم التوصيل', type: 'number', nullable: true, hint: 'اتركيها فارغة لتحسب تلقائيا من المسافة', half: true }, { k: 'eta', label: 'مدة التوصيل', hint: 'اختياري، مثل: 1-3 أيام' }] },
    payments: { title: 'طرق الدفع', add: 'طريقة دفع جديدة', reorder: true, icon: 'wallet', name: function (r) { return esc(r.name); }, sub: function (r) { return (r.number ? '<span class="ltr">' + esc(r.number) + '</span> - ' : '') + esc(r.note); }, toggles: [['active', 'متاحة']], blank: function () { return { id: uid('pay'), name: '', number: '', note: '', active: true }; }, fields: [{ k: 'name', label: 'اسم الطريقة', req: true }, { k: 'number', label: 'رقم التحويل (Bit مثلا)', ltr: true, hint: 'اتركيه فارغا للدفع نقدا' }, { k: 'note', label: 'توضيح يظهر للزبونة', type: 'textarea' }] },
    sections: { title: 'أقسام الصفحة الرئيسية', fixed: true, reorder: true, icon: 'layers', name: function (r) { return esc(r.title); }, sub: function () { return 'حركيه للأعلى أو الأسفل لتغيير ترتيبه في الصفحة'; }, toggles: [['visible', 'ظاهر']], fields: [{ k: 'title', label: 'الاسم الداخلي' }] },
    promos: { title: 'شريط العروض', add: 'عرض جديد', reorder: true, icon: 'tag', name: function (r) { return esc(r.text); }, sub: function (r) { return r.code ? 'الكوبون: <span class="ltr">' + esc(r.code) + '</span>' : ''; }, toggles: [['visible', 'ظاهر']], blank: function () { return { id: uid('pr'), text: '', code: '', visible: true }; }, fields: [{ k: 'text', label: 'نص العرض', req: true }, { k: 'code', label: 'رمز كوبون يظهر بجانبه', ltr: true, upper: true, hint: 'اختياري' }] },
    usageGuide: { title: 'طرق الاستخدام', fixed: true, icon: 'jar', name: function (r) { return esc(r.title); }, sub: function (r) { return esc(r.text); }, fields: [{ k: 'title', label: 'العنوان', req: true }, { k: 'text', label: 'الشرح', type: 'textarea' }] },
    socials: {
      title: 'حسابات التواصل الاجتماعي', add: 'حساب أو رابط جديد', reorder: true,
      icon: function (r) { return IC[r.platform] ? r.platform : 'link'; }, name: function (r) { return esc(r.label); }, sub: function (r) { return '<span class="ltr">' + esc(r.url) + '</span>'; }, toggles: [['visible', 'ظاهر']],
      blank: function () { return { id: uid('s'), platform: 'link', label: '', url: 'https://', visible: true }; },
      fields: [{ k: 'platform', label: 'المنصة', type: 'select', opts: function () { return [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['x', 'X (Twitter)'], ['youtube', 'YouTube'], ['whatsapp', 'WhatsApp'], ['link', 'رابط مخصص']]; } }, { k: 'label', label: 'الاسم الظاهر', req: true }, { k: 'url', label: 'الرابط', ltr: true, req: true, url: true }]
    },
    nav: { title: 'روابط القائمة', add: 'رابط جديد', reorder: true, icon: 'menu', name: function (r) { return esc(r.label); }, sub: function (r) { return '<span class="ltr">' + esc(r.target) + '</span>'; }, toggles: [['visible', 'ظاهر']], blank: function () { return { id: uid('n'), label: '', target: '#catalog', visible: true }; }, fields: [{ k: 'label', label: 'النص', req: true }, { k: 'target', label: 'الوجهة', ltr: true, hint: 'قسم في الصفحة مثل #catalog أو رابط كامل' }] }
  };
  var SINGLE = {
    ordering: { title: 'واتساب والطلب', obj: 'settings', fields: [{ k: 'whatsapp', label: 'رقم واتساب لاستقبال الطلبات', ltr: true, digits: true, hint: 'بالصيغة الدولية بدون + أو أصفار، مثل 9725XXXXXXXX' }, { k: 'currency', label: 'رمز العملة', ltr: true }, { k: 'orderNote', label: 'ملاحظة الطلب والدفع', type: 'textarea', hint: 'تظهر في صفحة المنتج وفي التذييل' }] },
    delivery: { title: 'قواعد التوصيل والحد الأدنى للطلب', obj: 'settings', fields: [{ k: 'minOrder', label: 'الحد الأدنى للطلب', type: 'number', hint: '0 = بدون حد أدنى. يحسب على مجموع المنتجات قبل الخصم والتوصيل' }, { k: 'deliveryRate', label: 'السعر لكل كم', type: 'number', step: '0.1', hint: 'الرسوم = المسافة × هذا الرقم', half: true }, { k: 'deliveryStep', label: 'التقريب للأعلى إلى أقرب', type: 'number', hint: 'مثلا 10: 27 تصبح 30 و 33 تصبح 40', half: true }, { k: 'deliveryMinFee', label: 'أقل رسوم توصيل', type: 'number', half: true }, { k: 'deliveryMaxFee', label: 'أعلى رسوم توصيل', type: 'number', hint: '0 = بدون سقف', half: true }, { k: 'deliveryNote', label: 'جملة تظهر فوق قائمة المناطق عند الطلب' }] },
    hero: { title: 'الواجهة الرئيسية', obj: 'hero', fields: [{ k: 'visible', label: 'إظهار الواجهة', type: 'toggle' }, { k: 'title', label: 'العنوان الكبير', req: true }, { k: 'text', label: 'النص تحت العنوان', type: 'textarea' }, { k: 'autoplay', label: 'تبديل المنتجات تلقائيا', type: 'toggle' }] },
    copy: { title: 'نصوص الأقسام', obj: 'copy', fields: [{ k: 'catalogTitle', label: 'عنوان قسم المنتجات' }, { k: 'catalogText', label: 'وصف قسم المنتجات', type: 'textarea' }, { k: 'howTitle', label: 'عنوان طرق الاستخدام' }, { k: 'howText', label: 'وصف طرق الاستخدام', type: 'textarea' }, { k: 'reviewsTitle', label: 'عنوان التقييمات' }, { k: 'reviewsText', label: 'وصف التقييمات', type: 'textarea' }, { k: 'contactTitle', label: 'عنوان قسم التواصل' }, { k: 'contactText', label: 'نص قسم التواصل', type: 'textarea' }] },
    branding: { title: 'العلامة والألوان', obj: 'settings', fields: [{ k: 'storeNameAr', label: 'اسم المتجر بالعربية', req: true, half: true }, { k: 'storeName', label: 'اسم المتجر بالإنجليزية', ltr: true, req: true, half: true }, { k: 'tagline', label: 'الجملة التعريفية' }, { k: 'accent', label: 'اللون الأساسي (الأزرار)', type: 'color', half: true }, { k: 'ink', label: 'لون النص', type: 'color', half: true }, { k: 'paper', label: 'لون الخلفية', type: 'color', half: true }] },
    footer: { title: 'التذييل', obj: 'footer', fields: [{ k: 'about', label: 'نبذة المتجر', type: 'textarea' }, { k: 'rights', label: 'نص الحقوق' }, { k: 'designerName', label: 'تصميم وتطوير', readonly: true, hint: 'ثابت: portfolio.darb.co.il', half: true }, { k: 'creditName', label: 'صاحب الحقوق', ltr: true, readonly: true, hint: 'ثابت: darb.co.il', half: true }] },
    settings: { title: 'محركات البحث واللغة', obj: 'settings', fields: [{ k: 'seoTitle', label: 'عنوان الصفحة في جوجل', hint: 'حتى 70 حرفا', max: 70 }, { k: 'seoDescription', label: 'وصف الصفحة في جوجل', type: 'textarea', hint: 'حتى 320 حرفا', max: 320 }, { k: '_lang', label: 'لغة المتجر', readonly: true, value: 'العربية (من اليمين لليسار)', hint: 'المتجر مجهز لإضافة لغات أخرى لاحقا دون إعادة تصميم. لا يظهر مبدل اللغة عند الإطلاق.' }] }
  };
  var NAV = [
    ['', [['dash', 'الرئيسية', 'home']]],
    ['المتجر', [['products', 'المنتجات', 'jar'], ['categories', 'الأقسام والعلامات', 'grid'], ['filters', 'فلاتر الشعر', 'hair_wavy']]],
    ['الطلبات', [['coupons', 'الكوبونات', 'tag'], ['regions', 'مناطق التوصيل', 'truck'], ['payments', 'طرق الدفع', 'wallet'], ['ordering', 'واتساب والطلب', 'whatsapp']]],
    ['محتوى الصفحة', [['hero', 'الواجهة الرئيسية', 'image'], ['sections', 'ترتيب الأقسام', 'layers'], ['content', 'النصوص والعروض', 'note'], ['reviews', 'التقييمات', 'star']]],
    ['الهوية والتواصل', [['branding', 'العلامة والألوان', 'brush'], ['socials', 'حسابات التواصل', 'link'], ['footer', 'القوائم والتذييل', 'menu']]],
    ['النظام', [['settings', 'الإعدادات', 'settings']]]
  ];
  var SCREENS = {
    products: { lead: 'كل ما يظهر في بطاقة المنتج وصفحته. التغيير يظهر في المتجر فور الحفظ.', blocks: [['c', 'products']] },
    categories: { lead: 'المتجر جاهز لعلامات وأقسام جديدة. القسم المخفي لا يظهر للزبائن.', blocks: [['c', 'categories'], ['c', 'brands']] },
    filters: { lead: 'هذه الخيارات تظهر في مرشد الشعر أعلى قائمة المنتجات.', blocks: [['c', 'hairTypes'], ['c', 'needs']] },
    coupons: { lead: 'الكوبون يعمل فقط إن كان فعالا وغير منتهي والطلب يبلغ الحد الأدنى.', blocks: [['c', 'coupons']] },
    regions: { lead: 'المناطق المتاحة فقط تظهر للزبونة عند الطلب، وتضاف رسومها إلى المجموع ورسالة واتساب. لتوسيع التوصيل لاحقا فعلي المنطقة أو أضيفي منطقة جديدة.', blocks: [['c', 'regions'], ['s', 'delivery'], ['x', 'recalc']] },
    payments: { lead: 'تختار الزبونة طريقة الدفع عند الطلب، وتظهر في رسالة واتساب. رقم Bit يعدل من هنا.', blocks: [['c', 'payments']] },
    ordering: { lead: 'إلى هذا الرقم تصل رسالة الطلب الجاهزة.', blocks: [['s', 'ordering'], ['x', 'wapreview']] },
    hero: { lead: 'أول ما تراه الزبونة. المنتجات المعروضة هي المنتجات المعلمة "في الواجهة" (حتى 6).', blocks: [['s', 'hero'], ['x', 'featured']] },
    sections: { lead: 'أظهري أو أخفي أي قسم وغيري ترتيبه.', blocks: [['c', 'sections']] },
    content: { lead: 'كل النصوص الظاهرة للزبائن قابلة للتعديل من هنا.', blocks: [['c', 'promos'], ['s', 'copy'], ['c', 'usageGuide']] },
    branding: { lead: 'الاسم والألوان تطبق على كامل المتجر.', blocks: [['s', 'branding']] },
    socials: { lead: 'أضيفي أي منصة أو رابط مخصص. المنصات المعروفة تظهر بأيقونتها.', blocks: [['c', 'socials']] },
    footer: { lead: 'روابط القائمة العلوية ومحتوى أسفل الصفحة.', blocks: [['c', 'nav'], ['s', 'footer']] },
    settings: { lead: '', blocks: [['s', 'settings']] }
  };
  var titleOf = function (id) { var t = ''; NAV.forEach(function (g) { g[1].forEach(function (i) { if (i[0] === id) t = i[1]; }); }); return t; };

  /* delivery fee from distance: km x rate, rounded up to the step, within min and max */
  function feeFor(km) {
    var st = S.settings, step = Number(st.deliveryStep) || 1, fee = Math.ceil((Number(km) || 0) * (Number(st.deliveryRate) || 0) / step - 1e-9) * step;
    fee = Math.max(fee, Number(st.deliveryMinFee) || 0);
    if (Number(st.deliveryMaxFee) > 0) fee = Math.min(fee, Number(st.deliveryMaxFee));
    return fee;
  }

  /* ---------- shell ---------- */
  var route = 'dash', rvFilter = 'pending', query = '';
  function toast(m) { var t = $('#toast'); t.innerHTML = IC.check + '<span>' + esc(m) + '</span>'; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2200); }
  var saving = 0;
  /* optimistic: the screen already shows the change; `work` writes it to Supabase */
  function commit(m, work) {
    nav(); saving++;
    Promise.resolve(work).then(function () { return db.revalidate(); }).then(function () { toast(m || 'تم الحفظ. المتجر محدث.'); }, function (err) {
      toast('تعذر الحفظ: ' + ((err && err.message) || 'خطأ غير معروف')); console.error(err);
    }).then(function () { saving--; });
  }
  var pending = function () { return S.reviews.filter(function (r) { return r.status === 'pending'; }).length; };

  function shell() {
    host.innerHTML = '<div class="shell"><aside class="side" id="side"><div class="hd">' + RB_MARK + '<span>' + esc(S.settings.storeNameAr) + '<small>لوحة التحكم</small></span></div><nav id="nav" aria-label="أقسام لوحة التحكم"></nav><div class="ft"><span class="ltr">' + esc(ctx.email) + '</span><button id="out" style="display:block;margin-top:6px;font-weight:700;text-decoration:underline">تسجيل الخروج</button></div></aside>' +
      '<div><header class="bar"><button class="ib" id="menu" aria-label="القائمة">' + IC.menu + '</button><h1 id="ttl"></h1><button class="btn sm ghost" id="pv">' + IC.eye + '<span>معاينة</span></button><a class="btn sm dark" href="/" target="_blank" rel="noopener">' + IC.external + '<span>المتجر</span></a></header><main class="main" id="main"></main></div></div>' +
      '<div class="scrim" id="scrim"></div><aside class="drawer" id="drawer" role="dialog" aria-modal="true"></aside><div class="toast" id="toast" role="status"></div>' +
      '<div class="pvw" id="pvw"><button class="ib x" aria-label="إغلاق المعاينة">' + IC.close + '</button><div class="ph"><iframe title="معاينة المتجر" id="pvf"></iframe></div></div>';
    $('#menu').onclick = function () { $('#side').classList.add('on'); $('#scrim').classList.add('on'); };
    $('#scrim').onclick = closeAll;
    $('#out').onclick = function () { ctx.signOut(); };
    $('#pv').onclick = function () { $('#pvf').src = '/?preview=' + Date.now(); $('#pvw').classList.add('on'); };
    $('#pvw').onclick = function (e) { if (e.target.closest('.ph')) return; this.classList.remove('on'); $('#pvf').src = 'about:blank'; };
    addEventListener('hashchange', go, sig); go();
  }
  function closeAll() { $('#side').classList.remove('on'); $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); }
  function nav() {
    $('#nav').innerHTML = NAV.map(function (g) { return (g[0] ? '<h4>' + g[0] + '</h4>' : '') + g[1].map(function (i) { return '<a href="#' + i[0] + '"' + (i[0] === route ? ' aria-current="page"' : '') + '>' + IC[i[2]] + i[1] + (i[0] === 'reviews' && pending() ? '<span class="n">' + pending() + '</span>' : '') + '</a>'; }).join(''); }).join('');
  }
  function go() {
    route = location.hash.slice(1) || 'dash'; if (route !== 'dash' && route !== 'reviews' && !SCREENS[route]) route = 'dash';
    query = ''; closeAll(); nav(); $('#ttl').textContent = titleOf(route); render(); scrollTo(0, 0);
  }

  /* ---------- rendering ---------- */
  function render() {
    var m = $('#main');
    if (route === 'dash') return dash(m);
    if (route === 'reviews') return reviews(m);
    var sc = SCREENS[route];
    m.innerHTML = (sc.lead ? '<p class="lead">' + sc.lead + '</p>' : '') + sc.blocks.map(function (b, i) {
      if (b[0] === 'c') return '<section data-coll="' + b[1] + '" style="margin-top:' + (i ? 26 : 0) + 'px"></section>';
      if (b[0] === 's') return '<section class="panel" data-single="' + b[1] + '" style="margin-top:' + (i ? 26 : 0) + 'px"></section>';
      return '<section data-x="' + b[1] + '"></section>';
    }).join('');
    $$('[data-coll]', m).forEach(function (el) { coll(el, el.dataset.coll, sc.blocks.length > 1); });
    $$('[data-single]', m).forEach(function (el) { single(el, el.dataset.single); });
    $$('[data-x]', m).forEach(function (el) { extra(el, el.dataset.x); });
  }
  function coll(el, key, showTitle) {
    var c = COLL[key], list = S[key], q = query.trim().toLowerCase();
    var rows = list.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return !q || !c.search || JSON.stringify([x.r.name, x.r.nameAr]).toLowerCase().indexOf(q) > -1; });
    el.innerHTML = '<div class="tools">' + (showTitle ? '<h2 style="font-size:1.1rem;font-weight:800;flex:1">' + c.title + '</h2>' : '') +
      (c.search ? '<label class="search">' + IC.search + '<span class="sr">بحث</span><input placeholder="ابحثي باسم المنتج" value="' + esc(query) + '" data-q></label>' : (showTitle ? '' : '<span style="flex:1"></span>')) +
      (c.fixed ? '' : '<button class="btn" data-new="' + key + '">' + IC.plus + c.add + '</button>') + '</div>' +
      '<div class="rows">' + (rows.length ? rows.map(function (x) {
        var r = x.r, th = c.thumb ? c.thumb(r) : null, ic = typeof c.icon === 'function' ? c.icon(r) : c.icon;
        var off = c.toggles && c.toggles.some(function (t) { return (t[0] === 'visible' || t[0] === 'active') && !r[t[0]]; });
        return '<div class="row' + (off ? ' off' : '') + '"><div class="th" style="--c:' + (th ? th.c : '#f1e7ef') + '">' + (th && th.img ? '<img src="' + esc(th.img) + '" alt="">' : IC[ic || 'grid']) + '</div>' +
          '<div class="tt"><b>' + c.name(r) + '</b><span>' + c.sub(r) + '</span></div><div class="acts">' +
          (c.toggles || []).map(function (t) { return '<button class="pill" aria-pressed="' + !!r[t[0]] + '" data-tog="' + key + '|' + r.id + '|' + t[0] + '">' + (r[t[0]] ? IC.check : '') + t[1] + '</button>'; }).join('') + '<span class="sp"></span>' +
          (c.reorder && !q ? '<button class="mini" data-mv="' + key + '|' + x.i + '|-1" aria-label="تحريك للأعلى"' + (x.i ? '' : ' disabled') + '>' + IC.up + '</button><button class="mini" data-mv="' + key + '|' + x.i + '|1" aria-label="تحريك للأسفل"' + (x.i < list.length - 1 ? '' : ' disabled') + '>' + IC.down + '</button>' : '') +
          '<button class="btn sm ghost" data-edit="' + key + '|' + r.id + '">' + IC.edit + 'تعديل</button></div></div>';
      }).join('') : '<p class="empty">لا توجد عناصر' + (q ? ' مطابقة للبحث' : ' بعد') + '.</p>') + '</div>';
  }
  function fieldHTML(f, v, o) {
    var id = 'f_' + f.k, half = f.half ? '' : ' style="grid-column:1/-1"', h = f.hint ? '<small>' + f.hint + '</small>' : '';
    if (f.type === 'note') return v ? '<div class="note" style="grid-column:1/-1"><b>ملاحظة من قراءة صور المنتج:</b> ' + esc(v) + '</div>' : '';
    if (f.type === 'toggle') return '<label class="sw"' + half + '><input type="checkbox" data-k="' + f.k + '"' + (v ? ' checked' : '') + '>' + f.label + '</label>';
    if (f.type === 'multi') return '<div class="f"' + half + '><span>' + f.label + '</span><div class="checks">' + f.opts().map(function (x) { return '<label><input type="checkbox" data-k="' + f.k + '" value="' + esc(x[0]) + '"' + ((v || []).indexOf(x[0]) > -1 ? ' checked' : '') + '>' + esc(x[1]) + '</label>'; }).join('') + '</div>' + h + '</div>';
    if (f.type === 'select') return '<label class="f"' + half + '><span>' + f.label + '</span><select data-k="' + f.k + '">' + f.opts().map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>' + h + '</label>';
    if (f.type === 'color') return '<label class="f"' + half + '><span>' + f.label + '</span><span class="color"><input type="color" data-k="' + f.k + '" value="' + esc(v || '#000000') + '"><span class="ltr">' + esc(v) + '</span></span></label>';
    if (f.type === 'image') return '<div class="f" style="grid-column:1/-1"><span>' + f.label + '</span><div class="imgf"><div class="pv" style="--c:' + (o.bg || '#f1e7ef') + '">' + (v ? '<img src="' + esc(v) + '" alt="">' : IC.image) + '</div><label class="btn sm ghost">' + IC.upload + 'اختيار صورة<input type="file" accept="image/*" class="sr" data-img></label></div><small>صورة بخلفية شفافة (PNG أو WebP) تعطي أفضل نتيجة. تصغر الصورة تلقائيا قبل الرفع.</small></div>';
    if (f.type === 'textarea' || f.type === 'lines') return '<label class="f" style="grid-column:1/-1"><span>' + f.label + '</span><textarea data-k="' + f.k + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.type === 'lines' ? ' rows="5"' : '') + '>' + esc(f.type === 'lines' ? (v || []).join('\n') : v) + '</textarea>' + h + '</label>';
    return '<label class="f"' + half + '><span>' + f.label + '</span><input type="' + (f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text') + '" data-k="' + f.k + '" value="' + esc(f.value != null ? f.value : v == null ? '' : v) + '"' + (f.ltr || f.type === 'number' ? ' dir="ltr" style="text-align:right"' : '') + (f.type === 'number' ? ' min="0" step="' + (f.step || 'any') + '" inputmode="decimal"' : '') + (f.readonly ? ' readonly' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') + '>' + h + '</label>';
  }
  function readForm(root, fields, target) {
    var ok = true;
    $$('.e', root).forEach(function (x) { x.remove(); }); $$('.bad', root).forEach(function (x) { x.classList.remove('bad'); });
    var out = {};
    fields.forEach(function (f) {
      if (f.type === 'note' || f.type === 'image' || f.readonly) return;
      var els = $$('[data-k="' + f.k + '"]', root), v;
      if (f.type === 'toggle') v = els[0].checked;
      else if (f.type === 'multi') v = els.filter(function (e) { return e.checked; }).map(function (e) { return e.value; });
      else if (f.type === 'number') v = els[0].value === '' && f.nullable ? null : parseFloat(els[0].value) || 0;
      else if (f.type === 'lines') v = els[0].value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      else v = els[0].value.trim();
      if (f.upper) v = v.toUpperCase().replace(/\s+/g, '');
      var err = '';
      if (f.req && (v === '' || (f.type === 'number' && els[0].value === ''))) err = 'هذا الحقل مطلوب.';
      else if (f.digits && v !== '' && !/^\d{10,15}$/.test(v)) err = 'اكتبي الرقم بالأرقام فقط مع رمز الدولة، من 10 إلى 15 رقما.';
      else if (f.url && !/^https?:\/\/.+\..+/.test(v)) err = 'اكتبي رابطا كاملا يبدأ بـ https://';
      else if (f.type === 'number' && v != null && v < 0) err = 'القيمة لا تكون سالبة.';
      if (err) { ok = false; var w = els[0].closest('.f'); w.classList.add('bad'); var s = document.createElement('span'); s.className = 'e'; s.textContent = err; w.appendChild(s); }
      out[f.k] = v;
    });
    if (!ok) { var b = $('.bad input,.bad textarea', root); if (b) b.focus(); return false; }
    for (var k in out) target[k] = out[k];
    return true;
  }
  function single(el, key) {
    var s = SINGLE[key], o = S[s.obj];
    el.innerHTML = '<h2>' + s.title + '</h2><form class="form grid2" novalidate>' + s.fields.map(function (f) { return fieldHTML(f, o[f.k], o); }).join('') + '<div style="grid-column:1/-1"><button class="btn">حفظ التغييرات</button></div></form>';
    $('form', el).onsubmit = function (e) { e.preventDefault(); if (readForm(el, s.fields, o)) { commit(null, db.saveDoc(s.obj, o)); $$('[data-x]').forEach(function (x) { extra(x, x.dataset.x); }); } };
  }
  var editing = null;
  function openEdit(key, id) {
    var c = COLL[key], isNew = !id, r = isNew ? c.blank() : S[key].filter(function (x) { return x.id === id; })[0];
    editing = { key: key, r: r, isNew: isNew };
    $('#drawer').innerHTML = '<div class="dh"><h2>' + (isNew ? c.add : 'تعديل') + '</h2><button class="ib" data-x-close aria-label="إغلاق">' + IC.close + '</button></div><div class="db"><form class="form grid2" id="ef" novalidate>' + c.fields.map(function (f) { return fieldHTML(f, r[f.k], r); }).join('') + '</form></div>' +
      '<div class="df"><button class="btn" form="ef">حفظ</button>' + (!isNew && !c.fixed ? '<button class="btn danger" data-del>' + IC.trash + 'حذف</button>' : '') + '</div>';
    $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
    $('#ef').onsubmit = function (e) {
      e.preventDefault();
      if (!readForm($('#drawer'), c.fields, r)) return;
      if (key === 'coupons' && S.coupons.some(function (x) { return x !== r && x.code === r.code; })) return toast('يوجد كوبون آخر بنفس الرمز');
      if (key === 'products' && isNew) r.id = (r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p') + '-' + Math.random().toString(36).slice(2, 5);
      if (key === 'regions' && r.fee == null) r.fee = feeFor(r.km);
      if (isNew) S[key].push(r);
      closeAll(); commit(isNew ? 'تمت الإضافة. المتجر محدث.' : null, db.saveRow(key, r, S[key].indexOf(r))); render();
    };
  }

  function extra(el, k) {
    if (k === 'wapreview') {
      var p0 = S.products[0] || { name: '', nameAr: '', size: '', price: 0 }, p = { name: p0.name, nameAr: p0.nameAr, size: p0.size, price: p0.price || 0 }, r = S.regions[0] || { name: '-', fee: 0 };
      var msg = '*طلب جديد - ' + S.settings.storeName + '*\n\n*الزبونة*\nالاسم: (اسم الزبونة)\nالهاتف: (رقمها)\n\n*المنتجات*\n1. Skala ' + p.name + ' (' + p.nameAr + ') ' + p.size + '\n   2 × ' + p.price + ' ' + cur() + ' = ' + (p.price * 2) + ' ' + cur() + '\n\n*الحساب*\nمجموع المنتجات: ' + (p.price * 2) + ' ' + cur() + '\nالتوصيل (' + r.name + '): ' + r.fee + ' ' + cur() + '\n*المجموع النهائي: ' + (p.price * 2 + r.fee) + ' ' + cur() + '*\n\n*التوصيل*\nالمنطقة: ' + r.name + '\nالبلدة: ...\nالعنوان: ...';
      el.innerHTML = '<div class="panel"><h2>شكل الرسالة التي تصلك (مثال)</h2><p class="lead" style="margin-bottom:10px">' + (S.settings.whatsapp ? 'إلى الرقم <span class="ltr">+' + esc(S.settings.whatsapp) + '</span>' : 'لم يحدد رقم واتساب بعد، والطلب عبر الموقع متوقف حتى تحديده.') + '</p><div class="wab"><div class="bubble">' + esc(msg).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') + '</div></div></div>';
    }
    if (k === 'recalc') {
      el.innerHTML = '<div class="panel" style="margin-top:26px"><h2>إعادة حساب الرسوم</h2><p class="lead">يحسب رسوم كل منطقة من مسافتها حسب القواعد أعلاه. الاستلام الشخصي (مسافة 0 ورسوم 0) لا يتغير. احفظي القواعد أولا إن عدلتها.</p><button class="btn ghost" id="recalc">' + IC.truck + 'حساب رسوم كل المناطق من المسافة</button></div>';
      $('#recalc').onclick = function () { S.regions.forEach(function (r) { if (!(Number(r.km) === 0 && Number(r.fee) === 0)) r.fee = feeFor(r.km); }); commit('حسبت الرسوم من جديد', db.saveOrder('regions', S.regions)); render(); };
    }
    if (k === 'featured') {
      var f = S.products.filter(function (p) { return p.featured; });
      el.innerHTML = '<div class="panel"><h2>المنتجات في الواجهة (' + f.length + ')</h2><div style="display:flex;gap:8px;flex-wrap:wrap">' + f.map(function (p) { return '<span class="row" style="grid-template-columns:auto auto;padding:6px 12px 6px 6px"><span class="th" style="--c:' + p.bg + ';width:40px;height:44px"><img src="' + p.thumb + '" alt="" style="width:30px;height:36px"></span><b class="ltr">' + esc(p.name) + '</b></span>'; }).join('') + '</div><p class="lead" style="margin:12px 0 0">لتغييرها افتحي <a href="#products" style="color:var(--accent);font-weight:700">المنتجات</a> واضغطي "في الواجهة".</p></div>';
    }
  }

  function dash(m) {
    var P = S.products, todo = [];
    if (!S.settings.whatsapp) todo.push('لم يحدد رقم واتساب بعد، لذلك الطلب عبر الموقع متوقف. <a href="#ordering">أدخلي الرقم</a>.');
    var noPrice = P.filter(function (p) { return p.price == null; }).length;
    if (noPrice) todo.push(noPrice + ' منتج بدون سعر ولا يمكن طلبه. <a href="#products">أدخلي الأسعار</a>.');
    if (!S.regions.some(function (r) { return r.active; })) todo.push('لا توجد مناطق توصيل بعد. <a href="#regions">أضيفي المناطق ورسومها</a>.');
    if (S.payments.some(function (x) { return x.active && x.id === 'bit' && !x.number; })) todo.push('رقم Bit غير محدد. <a href="#payments">أدخلي الرقم</a>.');
    if (!S.socials.length) todo.push('لم تضافي حسابات التواصل الاجتماعي بعد. <a href="#socials">أضيفيها</a>.');
    if (pending()) todo.push(pending() + ' تقييم بانتظار المراجعة. <a href="#reviews">راجعي التقييمات</a>.');
    var flagged = P.filter(function (p) { return p.sourceNote; });
    m.innerHTML = '<p class="lead">أهلا رغد. من هنا تتحكمين بكل ما يظهر في متجرك.</p><div class="stats">' +
      [['#products', P.filter(function (p) { return p.visible; }).length, 'منتج ظاهر'], ['#products', P.filter(function (p) { return !p.available; }).length, 'غير متوفر'], ['#coupons', S.coupons.filter(function (c) { return c.active && (!c.expires || c.expires >= today()); }).length, 'كوبون فعال'], ['#reviews', pending(), 'تقييم بانتظارك']].map(function (s) { return '<a class="stat" href="' + s[0] + '"><b>' + s[1] + '</b><span>' + s[2] + '</span></a>'; }).join('') + '</div>' +
      (todo.length ? '<div class="panel"><h2>يحتاج انتباهك</h2><ul class="todo">' + todo.map(function (t) { return '<li>' + IC.note + '<span>' + t + '</span></li>'; }).join('') + '</ul></div>' : '') +
      (flagged.length ? '<div class="panel"><h2>معلومات منتجات تحتاج تأكيدك (' + flagged.length + ')</h2><p class="lead" style="margin-bottom:12px">قرئت بيانات المنتجات من الصور. هذه النقاط لم تكن واضحة أو لم تذكر، فلم نخمنها.</p><div class="rows">' + flagged.map(function (p) { return '<div class="row"><div class="th" style="--c:' + p.bg + '"><img src="' + p.thumb + '" alt=""></div><div class="tt"><b class="ltr">' + esc(p.name) + '</b><span>' + esc(p.sourceNote) + '</span></div><div class="acts"><span class="sp"></span><button class="btn sm ghost" data-edit="products|' + p.id + '">' + IC.edit + 'تعديل</button></div></div>'; }).join('') + '</div></div>' : '');
  }
  function reviews(m) {
    var tabs = [['pending', 'بانتظار المراجعة'], ['approved', 'منشورة'], ['hidden', 'مخفية'], ['all', 'الكل']];
    var list = S.reviews.filter(function (r) { return rvFilter === 'all' || r.status === rvFilter; });
    m.innerHTML = '<p class="lead">لا يظهر أي تقييم في المتجر قبل موافقتك. يمكنك حذف صورة غير مناسبة والإبقاء على النص.</p><div class="tools"><div class="seg" role="group">' + tabs.map(function (t) { var n = t[0] === 'all' ? S.reviews.length : S.reviews.filter(function (r) { return r.status === t[0]; }).length; return '<button aria-pressed="' + (rvFilter === t[0]) + '" data-rvf="' + t[0] + '">' + t[1] + ' (' + n + ')</button>'; }).join('') + '</div></div><div class="rows">' +
      (list.length ? list.map(function (r) {
        var p = S.products.filter(function (x) { return x.id === r.product; })[0], st = '';
        for (var i = 1; i <= 5; i++) st += '<span class="' + (i <= r.rating ? '' : 'o') + '">' + IC.star + '</span>';
        return '<div class="row rev"><div class="tt"><b>' + esc(r.name) + ' <span class="stars">' + st + '</span>' + '<span class="tag ' + (r.status === 'approved' ? 'ok' : r.status === 'pending' ? 'warn' : '') + '">' + { approved: 'منشور', pending: 'بانتظار المراجعة', hidden: 'مخفي' }[r.status] + '</span></b><span>' + (p ? '<span class="ltr">' + esc(p.name) + '</span> - ' : '') + '<span class="ltr">' + esc(r.date) + '</span></span><p style="margin:6px 0">' + esc(r.text) + '</p>' +
          (r.photos.length ? '<div class="ph">' + r.photos.map(function (ph, k) { return '<span>' + '<a href="' + esc(ph) + '" target="_blank" rel="noopener"><img src="' + esc(ph) + '" alt="صورة مرفقة"></a>' + '<button data-rvph="' + r.id + '|' + k + '" aria-label="حذف الصورة">' + IC.close + '</button></span>'; }).join('') + '</div>' : '') + '</div>' +
          '<div class="acts">' + (r.status !== 'approved' ? '<button class="btn sm" data-rv="' + r.id + '|approved">' + IC.check + 'نشر</button>' : '') + (r.status !== 'hidden' ? '<button class="btn sm ghost" data-rv="' + r.id + '|hidden">' + IC.eyeoff + 'إخفاء</button>' : '') + '<button class="btn sm danger" data-rv="' + r.id + '|delete">' + IC.trash + 'حذف</button></div></div>';
      }).join('') : '<p class="empty">لا توجد تقييمات في هذه القائمة.</p>') + '</div>';
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tog],[data-mv],[data-edit],[data-new],[data-del],[data-x-close],[data-rv],[data-rvf],[data-rvph]'); if (!el) return;
    var d = el.dataset, a;
    if (d.tog) { a = d.tog.split('|'); var r = S[a[0]].filter(function (x) { return x.id === a[1]; })[0]; r[a[2]] = !r[a[2]]; commit(null, db.saveRow(a[0], r, S[a[0]].indexOf(r))); return render(); }
    if (d.mv) { a = d.mv.split('|'); var L = S[a[0]], i = +a[1], j = i + (+a[2]); if (j < 0 || j >= L.length) return; var tmp = L[i]; L[i] = L[j]; L[j] = tmp; commit('تم تغيير الترتيب', db.saveOrder(a[0], L)); return render(); }
    if (d.edit) { a = d.edit.split('|'); return openEdit(a[0], a[1]); }
    if (d.new) return openEdit(d.new, null);
    if ('xClose' in d) return closeAll();
    if ('del' in d) { if (!el.dataset.sure) { el.dataset.sure = 1; el.lastChild.textContent = 'تأكيد الحذف'; return; } S[editing.key] = S[editing.key].filter(function (x) { return x !== editing.r; }); closeAll(); commit('تم الحذف', db.deleteRow(editing.key, editing.r.id)); return render(); }
    if (d.rvf) { rvFilter = d.rvf; return render(); }
    if (d.rv) { a = d.rv.split('|'); if (a[1] === 'delete') { if (!el.dataset.sure) { el.dataset.sure = 1; el.lastChild.textContent = 'تأكيد الحذف'; return; } S.reviews = S.reviews.filter(function (x) { return x.id !== a[0]; }); } else S.reviews.filter(function (x) { return x.id === a[0]; })[0].status = a[1]; commit(a[1] === 'approved' ? 'نشر التقييم في المتجر' : a[1] === 'hidden' ? 'أخفي التقييم' : 'حذف التقييم', a[1] === 'delete' ? db.deleteReview(a[0]) : db.updateReview(a[0], { status: a[1] })); return render(); }
    if (d.rvph) { a = d.rvph.split('|'); var rvp = S.reviews.filter(function (x) { return x.id === a[0]; })[0]; rvp.photos.splice(+a[1], 1); commit('حذفت الصورة', db.updateReview(a[0], { photos: rvp.photos })); return render(); }
  }, sig);
  document.addEventListener('input', function (e) {
    if ('q' in e.target.dataset) { query = e.target.value; var sec = e.target.closest('[data-coll]'), pos = e.target.selectionStart; coll(sec, sec.dataset.coll, false); var i = $('[data-q]', sec); i.focus(); i.setSelectionRange(pos, pos); }
    if (e.target.type === 'color') e.target.nextElementSibling.textContent = e.target.value;
  }, sig);
  document.addEventListener('change', function (e) {
    if (!e.target.dataset || !('img' in e.target.dataset) || !e.target.files[0] || !editing) return;
    var pv = $('.pv', e.target.closest('.imgf')), row = editing.r, file = e.target.files[0];
    toast('جار رفع الصورة...');
    db.uploadProductImage(file).then(function (u) { row.img = u.img; row.thumb = u.thumb; pv.innerHTML = '<img src="' + esc(u.img) + '" alt="">'; toast('رفعت الصورة. اضغطي حفظ لتثبيتها.'); }, function (err) { toast('تعذر رفع الصورة: ' + ((err && err.message) || '')); });
  }, sig);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#drawer')) { closeAll(); $('#pvw').classList.remove('on'); } }, sig);

  shell();
  return function () { ac.abort(); host.innerHTML = ''; };
}
