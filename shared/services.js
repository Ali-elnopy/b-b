/**
 * كتالوج يوزرسيف.
 *
 * المصدر: قائمة الخدمات المنشورة في بريف العميل. هذه قائمة خدمات منشورة
 * وليست جردًا مؤكدًا؛ الخيارات التفصيلية (المواد، المقاسات المتاحة،
 * تقنيات الطباعة) تحتاج تأكيد المالك قبل الإطلاق. راجع
 * docs/CLIENT-CONFIRMATIONS.md.
 */

export const CATEGORIES = ['ملابس', 'هدايا', 'مطبوعات', 'تصاميم'];

const SIZE_SET = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export const SIZES = SIZE_SET;

export const SERVICES = [
  {
    slug: 'apparel',
    name: 'ملابس مطبوعة',
    subtitle: 'تيشيرت · هودي · سويت شيرت',
    category: 'ملابس',
    summary: 'قطعة تلبسها وتحكي عنك. نطبع تصميمك على تيشيرت أو هودي أو سويت شيرت باختيارك.',
    description:
      'اختار نوع القطعة والقَصّة واللون، وحدد المقاسات المطلوبة. بنراجع التصميم معاك قبل التنفيذ، وبنأكد لك تقنية الطباعة المناسبة لخامة القطعة وعدد الألوان في التصميم.',
    image: '/media/tshirt-square.webp',
    imageAlt: 'تيشيرت أخضر يحمل شعار يوزرسيف',
    minQuantity: 1,
    requiresSizes: true,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 1,
    options: [
      {
        key: 'garment',
        label: 'نوع القطعة',
        type: 'select',
        required: true,
        choices: ['تيشيرت', 'هودي', 'سويت شيرت'],
      },
      {
        key: 'fit',
        label: 'القَصّة',
        type: 'select',
        required: true,
        choices: ['رجالي', 'نسائي', 'أطفال'],
      },
      {
        key: 'color',
        label: 'لون القطعة',
        type: 'select',
        required: true,
        allowOther: true,
        choices: ['أبيض', 'أسود', 'أخضر يوزرسيف', 'بيج', 'أزرق'],
      },
      {
        key: 'placement',
        label: 'مكان الطباعة',
        type: 'select',
        required: true,
        choices: ['أمامي', 'خلفي', 'أمامي وخلفي', 'على الكُم'],
      },
      {
        key: 'technique',
        label: 'تقنية الطباعة (لو عندك تفضيل)',
        type: 'select',
        required: false,
        choices: ['طباعة حرارية DTG', 'سيلك سكرين', 'تطريز', 'مش متأكد — ساعدوني'],
      },
    ],
    guidance: [
      'ملف التصميم يفضل PNG بخلفية شفافة أو PDF، ودقة 300 DPI بالمقاس النهائي.',
      'لو التصميم فيه ألوان كتير، هنراجعه ونقترح التقنية الأنسب.',
      'المقاسات المتاحة نهائية بعد تأكيد المالك؛ اكتب مقاسك في الملاحظات لو مش موجود.',
    ],
  },
  {
    slug: 'mugs',
    name: 'مجات وهدايا دعائية',
    subtitle: 'ماجات · هدايا مناسبات · تغليف',
    category: 'هدايا',
    summary: 'هدية صغيرة تفضل في المكان. مجات مطبوعة بتصميمك، مع إمكانية تغليف هدية.',
    description:
      'اطبع اسم، جملة، صورة أو تصميم كامل على مج. مناسب للهدايا الشخصية وهدايا الفرق والمناسبات. حدد نوع المج ومساحة الطباعة وسيب الباقي علينا.',
    image: '/media/mug-square.webp',
    imageAlt: 'مج أبيض مطبوع عليه شعار يوزرسيف',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 2,
    options: [
      {
        key: 'mugType',
        label: 'نوع المج',
        type: 'select',
        required: true,
        choices: ['سيراميك أبيض', 'سيراميك ملوّن', 'ماجيك (يتغير بالحرارة)'],
      },
      {
        key: 'printArea',
        label: 'مساحة الطباعة',
        type: 'select',
        required: true,
        choices: ['وجه واحد', 'وجهين', 'التصميم ملفوف حول المج'],
      },
      {
        key: 'packaging',
        label: 'تغليف هدية',
        type: 'select',
        required: false,
        choices: ['بدون تغليف', 'تغليف هدية'],
      },
    ],
    guidance: [
      'بعت التصميم بالمقاس الطبيعي للمج (حوالي 20×8 سم) لو متاح.',
      'لو التصميم فيه نص قريب من حرف المج، هنظبط المسافات قبل الطباعة.',
    ],
  },
  {
    slug: 'bags',
    name: 'شنط وأكياس قماش',
    subtitle: 'شنط قماش · أكياس هدايا · مطبوعات فعاليات',
    category: 'هدايا',
    summary: 'شنطة قماش مطبوعة بتصميمك — للاستخدام اليومي، للهدايا، أو لفعاليتك.',
    description:
      'شنط قماش وأكياس مناسبة للهدايا والفعاليات. اختار المقاس واللون ومساحة الطباعة، وابعت التصميم. نقدر ننفذ كمية صغيرة أو كمية لفعالية كاملة.',
    image: '/media/bag-square.webp',
    imageAlt: 'شنطة قماش أخضر بشريطة مطبوع عليها شعار يوزرسيف',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 3,
    options: [
      {
        key: 'bagType',
        label: 'نوع الشنطة',
        type: 'select',
        required: true,
        choices: ['قماش قطن', 'كانفاس', 'غير منسوج'],
      },
      {
        key: 'bagSize',
        label: 'المقاس',
        type: 'select',
        required: true,
        choices: ['صغير 30×35 سم', 'وسط 35×40 سم', 'كبير 40×45 سم', 'مقاس مخصص'],
      },
      {
        key: 'printSides',
        label: 'الطباعة على',
        type: 'select',
        required: true,
        choices: ['وجه واحد', 'وجهين'],
      },
      {
        key: 'string',
        label: 'الشريطة',
        type: 'select',
        required: false,
        choices: ['بشريطة', 'بدون شريطة'],
      },
    ],
    guidance: [
      'حدد مقاس الشنطة النهائي في الملاحظات لو اخترت مقاس مخصص.',
      'يفضل إرسال التصميم بخلفية شفافة أو بلون الشنطة نفسه.',
    ],
  },
  {
    slug: 'stationery',
    name: 'كروت وفلايرز وأظرف',
    subtitle: 'كروت أعمال · فلايرز · بروشورات · أظرف',
    category: 'مطبوعات',
    summary: 'مطبوعات ورقية بهوية واحدة: كروت أعمال، فلايرز، بروشورات وأظرف.',
    description:
      'من كارت العمل اللي بيسلم أول انطباع، للفلاير اللي بيشرح خدمتك. نطبع مطبوعاتك على ورق مناسب ونراجع معاك المقاس والوجه والتشطيب قبل التنفيذ.',
    image: '/media/business-card-square.webp',
    imageAlt: 'كروت أعمال وظرف مطبوع عليهما هوية يوزرسيف',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 4,
    options: [
      {
        key: 'itemType',
        label: 'نوع المطبوع',
        type: 'select',
        required: true,
        choices: ['كروت أعمال', 'فلاير', 'بروشور', 'ظرف', 'كروت دعوة'],
      },
      {
        key: 'paperSize',
        label: 'المقاس',
        type: 'select',
        required: true,
        choices: ['A6', 'A5', 'A4', 'مقاس مخصص'],
      },
      {
        key: 'sides',
        label: 'الطباعة',
        type: 'select',
        required: true,
        choices: ['وجه واحد', 'وجهين'],
      },
      {
        key: 'paper',
        label: 'نوع الورق (لو عندك تفضيل)',
        type: 'select',
        required: false,
        choices: ['250 جم مصقول', '300 جم', 'كرتون', 'مش متأكد'],
      },
      {
        key: 'finish',
        label: 'التشطيب',
        type: 'select',
        required: false,
        choices: ['بدون', 'لامع', 'مطفي'],
      },
    ],
    guidance: [
      'المطبوعات تحتاج هامش أمان (bleed) — لو مش متأكد ابعت الملف وهنراجعه.',
      'يفضل PDF بجودة طباعة أو صور بدقة 300 DPI.',
      'الكميات وأسعار الورق تُحدد في عرض السعر بعد المراجعة.',
    ],
  },
  {
    slug: 'notebooks',
    name: 'دفاتر وتقويمات',
    subtitle: 'دفاتر · أجندات · تقويم مكتبي وحائط',
    category: 'مطبوعات',
    summary: 'دفاتر وتقويمات بهوية شركتك أو تصميمك الشخصي.',
    description:
      'دفاتر وأجندات وتقويمات للشركات والهدايا. اختار النوع والمقاس وعدد الصفحات، وابعت تصميم الغلاف. التغليف والتشطيب حسب المتاح — بنأكده معاك قبل التنفيذ.',
    image: '/media/calendar-square.webp',
    imageAlt: 'تقويم مكتبي مطبوع عليه شعار يوزرسيف',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 5,
    options: [
      {
        key: 'itemType',
        label: 'نوع المنتج',
        type: 'select',
        required: true,
        choices: ['دفتر', 'أجندة', 'تقويم مكتبي', 'تقويم حائط'],
      },
      {
        key: 'paperSize',
        label: 'المقاس',
        type: 'select',
        required: true,
        choices: ['A5', 'A4', 'مقاس مخصص'],
      },
      {
        key: 'pages',
        label: 'عدد الصفحات / الشهور',
        type: 'select',
        required: false,
        choices: ['40', '80', '120', '12 شهر', 'مش متأكد'],
      },
      {
        key: 'binding',
        label: 'التجليد',
        type: 'select',
        required: false,
        choices: ['سلك', 'غراء', 'دبابيس', 'مش متأكد'],
      },
    ],
    guidance: [
      'تصميم الغلاف يحتاج مقاس نهائي واضح؛ لو مش متاح هنحدده معاك.',
      'لو فيه شعار الشركة، ابعت ملف الشعار الأصلي لو متاح.',
    ],
  },
  {
    slug: 'stickers',
    name: 'ستيكرات ولاصقات',
    subtitle: 'لاصق منتجات · ستيكرات هدايا · ديكور',
    category: 'مطبوعات',
    summary: 'ستيكرات بشكل ومقاس تختاره، للعلب والهدايا والمنتجات.',
    description:
      'ستيكرات بلاصق قوي، بأشكال ومقاسات مختلفة. مناسبة لتغليف المنتجات، الهدايا، أو لصق علامة على دفتر أو لابتوب. ابعت الشكل والمقاس وعدد القطع.',
    image: '/media/pattern-square.webp',
    imageAlt: 'نمط من ريش يوزرسيف يمكن استخدامه في اللاصقات',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 6,
    options: [
      {
        key: 'shape',
        label: 'الشكل',
        type: 'select',
        required: true,
        choices: ['دائري', 'مربع', 'مستطيل', 'مقصوص على شكل التصميم'],
      },
      {
        key: 'stickerSize',
        label: 'المقاس',
        type: 'select',
        required: true,
        choices: ['3 سم', '5 سم', '8 سم', 'مقاس مخصص'],
      },
      {
        key: 'finish',
        label: 'التشطيب',
        type: 'select',
        required: false,
        choices: ['لامع', 'مطفي', 'شفاف'],
      },
      {
        key: 'usage',
        label: 'الاستخدام',
        type: 'select',
        required: false,
        choices: ['لاصق منتجات', 'ديكور', 'هدايا', 'أخرى'],
      },
    ],
    guidance: [
      'التصميم المقصوص على الشكل يحتاج مسار قص واضح (cut line).',
      'ابعت التصميم بحجم الطباعة النهائي أو أكبر.',
    ],
  },
  {
    slug: 'phone-cases',
    name: 'كفرات موبايل',
    subtitle: 'حماية شخصية · تصميمك على موبايلك',
    category: 'هدايا',
    summary: 'كفر موبايل بتصميمك — اكتب موديل جهازك وسيب الباقي علينا.',
    description:
      'كفرات موبايل مطبوعة بتصميم شخصي أو شعار. الموديلات المتاحة تختلف حسب التوفر؛ اكتب موديل جهازك بالتحديد وهنأكد لك إمكانية التنفيذ قبل الدفع.',
    image: null,
    imageAlt: 'كفر موبايل بتصميم يوزرسيف',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: true,
    briefRequired: false,
    sortOrder: 7,
    options: [
      {
        key: 'model',
        label: 'موديل الموبايل',
        type: 'text',
        required: true,
        placeholder: 'مثال: iPhone 15 / Samsung Galaxy S24',
      },
      {
        key: 'material',
        label: 'نوع الكفر',
        type: 'select',
        required: false,
        choices: ['بلاستيك صلب', 'سيليكون', 'زجاج', 'مش متأكد'],
      },
      {
        key: 'printStyle',
        label: 'ستايل الطباعة',
        type: 'select',
        required: false,
        choices: ['تصميم كامل', 'شعار صغير', 'اسم أو جملة'],
      },
    ],
    guidance: [
      'التصميم الكامل لازم يراعي فتحة الكاميرا وأزرار الجهاز.',
      'تأكد من كتابة الموديل بدقة — الكفرات تُطلب بموديل محدد.',
    ],
  },
  {
    slug: 'design',
    name: 'تصاميم مخصصة',
    subtitle: 'لوجو · هوية بصرية · سوشيال ميديا',
    category: 'تصاميم',
    summary: 'مش لازم يكون عندك ملف جاهز. احكيلنا فكرتك ونجهز لك التصميم.',
    description:
      'خدمة تصميم للأفكار اللي لسه مفيش لها ملف: شعار، هوية بصرية، تصميمات سوشيال، أو تصميم مطبوع. اكتب بريف واضح عن النشاط والجمهور والستايل اللي بتحبه.',
    image: '/media/portfolio-embroidery.webp',
    imageAlt: 'نموذج تصميم بتطريز فلسطيني',
    minQuantity: 1,
    requiresSizes: false,
    needsArtwork: false,
    briefRequired: true,
    sortOrder: 8,
    options: [
      {
        key: 'scope',
        label: 'نوع التصميم',
        type: 'select',
        required: true,
        choices: ['شعار', 'هوية بصرية كاملة', 'تصميمات سوشيال', 'تصميم مطبوع', 'أخرى'],
      },
      {
        key: 'brandName',
        label: 'اسم النشاط / المشروع',
        type: 'text',
        required: false,
        placeholder: 'اكتب الاسم لو موجود',
      },
      {
        key: 'style',
        label: 'الستايل المفضل',
        type: 'select',
        required: false,
        choices: ['بسيط وحديث', 'كلاسيكي', 'جرافيك قوي', 'مش متأكد'],
      },
    ],
    guidance: [
      'اكتب في الملاحظات: نشاطك، جمهورك، والألوان أو التصاميم اللي بتحبها.',
      'عدد النسخ والمراجعات بيتحدد في عرض السعر قبل البدء.',
    ],
  },
];

export const SERVICE_BY_SLUG = Object.fromEntries(SERVICES.map((s) => [s.slug, s]));

export function serviceOrDefault(slug) {
  return SERVICE_BY_SLUG[slug] ?? null;
}
