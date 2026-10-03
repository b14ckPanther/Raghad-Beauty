-- Delivery by distance from Nahef (where orders are dispatched), plus a minimum order.
-- Fee rule, editable in the admin: km x rate, rounded up to the next step,
-- kept between an optional minimum and maximum fee.

alter table public.regions
  add column if not exists km numeric not null default 0 check (km >= 0),
  add column if not exists towns text not null default '';

comment on column public.regions.km is 'Approximate road distance from Nahef, used to work out the delivery fee.';

update public.site_content
set value = value || jsonb_build_object(
  'minOrder', 0,
  'deliveryRate', 1.5,
  'deliveryStep', 10,
  'deliveryMinFee', 10,
  'deliveryMaxFee', 0,
  'deliveryNote', 'التوصيل متاح حاليا لمنطقة الشمال، ويخرج من نحف.'
)
where key = 'settings';

-- Distances are approximate and are meant to be corrected in the admin.
insert into public.regions (id, name, towns, km, fee, eta, active, sort_order) values
  ('nahef',    'نحف',                         'داخل البلد',                                                                   0,  10, '', true, 0),
  ('near',     'جوار نحف',                    'دير الأسد، البعنة، مجد الكروم، كرميئيل، ساجور',                                  6,  10, '', true, 1),
  ('shaghur',  'الرامة ويركا والبقيعة',        'الرامة، شعب، البقيعة، كسرى-سميع، يركا، جولس',                                   13, 20, '', true, 2),
  ('akko',     'عكا وسخنين وطمرة',            'عكا، كفر ياسيف، أبو سنان، جديدة-المكر، سخنين، عرابة، دير حنا، المغار، كابول، طمرة', 20, 30, '', true, 3),
  ('shefaamr', 'شفاعمرو ومعلوت',              'شفاعمرو، عبلين، معلوت-ترشيحا، عيلبون، المزرعة',                                  26, 40, '', true, 4),
  ('krayot',   'نهاريا وصفد والكريوت',        'نهاريا، صفد، الكريوت، كريات آتا، طرعان',                                        33, 50, '', true, 5),
  ('haifa',    'حيفا والناصرة وطبريا',        'حيفا، الناصرة، كفر كنا، الرينة، المشهد، طبريا',                                  40, 60, '', true, 6),
  ('afula',    'العفولة والكرمل',             'العفولة، إكسال، دالية الكرمل، عسفيا',                                           52, 80, '', true, 7),
  ('pickup',   'استلام شخصي من نحف',          'بالتنسيق مع رغد',                                                              0,  0,  '', true, 8)
on conflict (id) do nothing;
