// One-off: turns the approved concept data (Desktop/concept_raghad/js/data.js) into the seed migration.
const fs = require('fs'), path = require('path'), os = require('os');
global.window = {}; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
require(path.join(os.homedir(), 'Desktop/concept_raghad/js/data.js'));
const D = window.RB.defaults;
const BASE = 'https://bvmtbmpjppangdqjdvpx.supabase.co/storage/v1/object/public/media/jars/';
const q = v => v == null ? 'null' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : Array.isArray(v) ? (v.length ? 'array[' + v.map(q).join(',') + ']' : "'{}'") + '::text[]' : "'" + String(v).replace(/'/g, "''") + "'";
const ins = (table, cols, rows) => rows.length ? `insert into public.${table} (${cols.join(', ')}) values\n` + rows.map(r => '  (' + r.map(q).join(', ') + ')').join(',\n') + ';\n' : '';
const j = o => "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
let s = '-- Raghad Beauty: launch content. Product facts come from the supplied product images.\n-- Prices, the WhatsApp number, the Bit number and delivery regions are entered in the admin.\n\n';
const settings = { ...D.settings, whatsapp: '', phone: '' };
s += 'insert into public.site_content (key, value) values\n' + [['settings', settings], ['hero', D.hero], ['copy', D.copy], ['footer', D.footer], ['labels', { textures: D.textures, usages: D.usages }]].map(([k, v]) => `  ('${k}', ${j(v)})`).join(',\n') + ';\n\n';
s += ins('brands', ['id', 'name', 'name_ar', 'origin', 'visible', 'sort_order'], D.brands.map((b, i) => [b.id, b.name, b.nameAr, b.origin, b.visible, i])) + '\n';
s += ins('categories', ['id', 'name', 'visible', 'sort_order'], D.categories.map((c, i) => [c.id, c.name, c.visible, i])) + '\n';
s += ins('needs', ['id', 'name', 'icon', 'sort_order'], D.needs.map((c, i) => [c.id, c.name, c.icon, i])) + '\n';
s += ins('hair_types', ['id', 'name', 'curl', 'sort_order'], D.hairTypes.map((c, i) => [c.id, c.name, c.curl, i])) + '\n';
s += ins('products', ['id', 'brand', 'category', 'line', 'name', 'name_ar', 'summary', 'benefits', 'actives', 'need', 'hair', 'texture', 'usage', 'size', 'price', 'img', 'thumb', 'bg', 'r1', 'r2', 'available', 'visible', 'featured', 'family', 'source_note', 'sort_order'],
  D.products.map((p, i) => [p.id, p.brand, p.category, p.line, p.name, p.nameAr, p.summary, p.benefits, p.actives, p.need, p.hair, p.texture, p.usage, p.size, null, BASE + p.id + '.webp', BASE + p.id + '-s.webp', p.bg, p.r1, p.r2, true, true, p.featured, p.family, p.sourceNote, i])) + '\n';
s += ins('payments', ['id', 'name', 'number', 'note', 'active', 'sort_order'], D.payments.map((p, i) => [p.id, p.name, '', p.note, true, i])) + '\n';
s += ins('promos', ['id', 'text', 'code', 'visible', 'sort_order'], D.promos.filter(p => !p.code).map((p, i) => [p.id, p.text, '', true, i])) + '\n';
s += ins('usage_guide', ['id', 'title', 'text', 'sort_order'], D.usageGuide.map((u, i) => [u.id, u.title, u.text, i])) + '\n';
s += ins('sections', ['id', 'title', 'visible', 'sort_order'], D.sections.map((u, i) => [u.id, u.title, u.visible, i])) + '\n';
s += ins('nav_links', ['id', 'label', 'target', 'visible', 'sort_order'], D.nav.map((u, i) => [u.id, u.label, u.target, u.visible, i])) + '\n';
s += "-- First admin (the auth user is created separately; this only grants access).\ninsert into private.admin_users (user_id)\nselect id from auth.users where email = 'raghad@darb.co.il'\non conflict do nothing;\n";
fs.writeFileSync('supabase/migrations/20261003120200_seed_content.sql', s);
console.log('seed bytes', s.length, 'products', D.products.length);
