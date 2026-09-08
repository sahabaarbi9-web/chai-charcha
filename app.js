/* =========================================================
   CHAI & CHARCHA — app.js
   Menu data · rendering · filter · detail modal · scroll fx
   ========================================================= */
'use strict';

/* ---------- Helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* Fallback image (warm espresso gradient + emoji) if any photo fails to load */
function fallbackImg(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2a18"/><stop offset="1" stop-color="#171008"/></linearGradient></defs><rect width="600" height="450" fill="url(#g)"/><text x="300" y="255" font-size="150" text-anchor="middle">${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ---------- Menu data ---------- */
/* CATS/MENU below are the built-in seed (last-resort fallback).
   On a configured deployment, init() replaces both from Supabase via db.js. */
let CATS = {
  chai:       { label: 'Chai', icon: '🍵', sub: 'Karak se doodh patti tak — har cup subah ki raunaq' },
  beverages:  { label: 'Hot & Cold Beverages', icon: '🥤', sub: 'Coffee, shakes aur fresh drinks — thanda ya garam, choice aapki' },
  savories:   { label: 'Desi Bites & Savories', icon: '🥟', sub: 'Samose, pakoray, bun kebabs aur karari bites' },
  desserts:   { label: 'Sweet Treats & Desserts', icon: '🍰', sub: 'Brownies, waffles, kulfi aur har mitha sapna' }
};

const MENU = [
  /* ---------- CHAI ---------- */
  {
    id: 'c1', cat: 'chai', name: 'Bunty Chai', price: 250, badge: 'popular',
    emoji: '🍵',
    img: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
    short: 'Hamari signature dholki-style chai — subah ki pehli sip, poore din ki raunaq.',
    about: 'Bunty Chai hamari jaan hai. Doodh patti ki buniyad par chhota sa twist — halki si elaichi, aur kaafi si mohabbat. Subah 8 baje iska pehla pot toot-ta hai aur shuru hota hai apna din.',
    ingredients: ['Black Tea (CTC)', 'Full Cream Milk', 'Ilaichi', 'Halki Chini'],
    addons: [
      { name: 'Extra Karak', price: 40 },
      { name: 'Double Milk', price: 50 },
      { name: 'Honey', price: 30 },
      { name: 'Less Chini', price: 0 }
    ]
  },
  {
    id: 'c2', cat: 'chai', name: 'Doodh Patti', price: 220, badge: null, emoji: '🥛',
    img: 'https://images.pexels.com/photos/13377433/pexels-photo-13377433.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Gadhi doodh wali classic — jis ka har ghoont aapko ghar ki yaad dilaye.',
    about: 'Sangeeli doodh, acche patti, aur bilkul sahi chini. Doodh Patti woh chai hai jo grandparents ke time se chalti aa rahi hai — aur hum usse abhi bhi waisi hi banaatay hain.',
    ingredients: ['Crush Tea', 'Gadha Doodh', 'Chini', 'Aapki Pasand'],
    addons: [
      { name: 'Extra Doodh', price: 50 },
      { name: 'Sonf', price: 20 },
      { name: 'Half Chini', price: 0 }
    ]
  },
  {
    id: 'c3', cat: 'chai', name: 'Masala Chai', price: 200, badge: 'popular', emoji: '🌶️',
    img: 'https://images.pexels.com/photos/37186989/pexels-photo-37186989.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Adrak, ilaichi aur darchini ka jadoo — mausam chahe kuch bhi ho.',
    about: 'Chaar masalon ka khufiya formula: adrak, ilaichi, darchini aur laung. Har ghoont mein aapko garmi ka ehsaas hoga jo thande mausam mein jaan daal de.',
    ingredients: ['Tea Patti', 'Adrak', 'Ilaichi', 'Darchini', 'Laung', 'Doodh'],
    addons: [
      { name: 'Extra Adrak', price: 25 },
      { name: 'Double Masala', price: 35 },
      { name: 'Honey', price: 30 }
    ]
  },
  {
    id: 'c4', cat: 'chai', name: 'Kashmiri Chai', price: 350, badge: 'popular', emoji: '🌸',
    img: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80',
    short: 'Pink gulabi chai — badam aur pista ki chadar, har sip mein sulah.',
    about: 'Kashmiri chai halki bhi nahi hoti — ye puri nazar hoti hai. Pink color, roasted badam-pista ki heaps, aur ek aqeedat ke barabar mehak. Isay thande mausam ka sukoon kehte hain.',
    ingredients: ['Green Tea', 'Kashmiri Namkeen', 'Badam', 'Pista', 'Milk'],
    addons: [
      { name: 'Double Pista', price: 40 },
      { name: 'Extra Badam', price: 40 },
      { name: 'Salted (Namkeen)', price: 0 }
    ]
  },
  {
    id: 'c5', cat: 'chai', name: 'Elaichi Chai', price: 180, badge: null, emoji: '🟢',
    img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80',
    short: 'Ek ilaichi, do ilaichi… har cup mein khusboo ki mehfil.',
    about: 'Sab kuch saada hai, bas ilaichi ki quartet kamal karti hai. Ye woh chai hai jo lecture ke baad dil ko dheela kar ke rakh de.',
    ingredients: ['Black Tea', 'Elaichi', 'Milk', 'Chini'],
    addons: [
      { name: 'Extra Elaichi', price: 20 },
      { name: 'Double Milk', price: 50 }
    ]
  },
  {
    id: 'c6', cat: 'chai', name: 'Ginger Chai', price: 180, badge: null, emoji: '🫚',
    img: 'https://images.pexels.com/photos/29650995/pexels-photo-29650995.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Katti adrak wali chai — thaka sa badan, sab kuch theek.',
    about: 'Taza adrak ka ras, kadak patti, aur halki chini. Winters mein iske bina adhuri — aur summers mein bhi koi shikayat nahi.',
    ingredients: ['Tea Patti', 'Taza Adrak', 'Milk', 'Chini'],
    addons: [
      { name: 'Extra Adrak', price: 25 },
      { name: 'Lemon Twist', price: 15 }
    ]
  },
  {
    id: 'c7', cat: 'chai', name: 'Desi Kahwa', price: 250, badge: 'new', emoji: '🍃',
    img: 'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=900&q=80',
    short: 'Zafran ki bukhar, kehwa ka sukoon — Doodh nahi, dil chaiye.',
    about: 'Green tea jo qehwa ke naam se jana jata hai — zafran, kishmish aur ilaichi ke saath. Khaas Peshawari style, aur har ghut mein sukoon ka andaz.',
    ingredients: ['Green Tea', 'Zafran', 'Ilaichi', 'Kishmish', 'Honey'],
    addons: [
      { name: 'Extra Zafran', price: 60 },
      { name: 'Badam Powder', price: 35 }
    ]
  },

  /* ---------- BEVERAGES ---------- */
  {
    id: 'b1', cat: 'beverages', name: 'Karak Cappuccino', price: 450, badge: 'popular', emoji: '☕',
    img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
    short: 'Espresso ke saath doodh ki pat, foam ka taaj — karak, par elegant.',
    about: 'Ek strong shot espresso, steamed milk, aur upar se fool-detailed foam. Chai ki qaum ke liye coffee ka taaruf — lekin strong cheez pasand aapko.',
    ingredients: ['Espresso Shot', 'Steamed Milk', 'Milk Foam', 'Karak Masala'],
    addons: [
      { name: 'Extra Shot', price: 120 },
      { name: 'Caramel', price: 60 },
      { name: 'Soy Milk', price: 100 }
    ]
  },
  {
    id: 'b2', cat: 'beverages', name: 'Hot Chocolate', price: 500, badge: null, emoji: '🍫',
    img: 'https://images.unsplash.com/photo-1542990253-0d0ba5f2f903?auto=format&fit=crop&w=900&q=80',
    short: 'Marshmallows ke saath Belgium dark chocolate — bachpan ka relaunch.',
    about: '70% dark chocolate, steamed milk aur mini marshmallows. Winters ki raat ka best partner, aur bachon ke liye bazaar se behtar.',
    ingredients: ['Belgian Cocoa', 'Milk', 'Marshmallows', 'Cream'],
    addons: [
      { name: 'Extra Marshmallow', price: 50 },
      { name: 'Hazelnut', price: 70 },
      { name: 'Whipped Cream', price: 60 }
    ]
  },
  {
    id: 'b3', cat: 'beverages', name: 'Cold Coffee', price: 480, badge: null, emoji: '🧋',
    img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
    short: 'Gadhi, meethi, thandi — wo wali cold coffee jo puri raat jaag jaye.',
    about: 'Blended coffee, doodh, ice cream ki halki si share, aur chocolate drizzle. Summers ka simple formula — thanda aur khush.',
    ingredients: ['Coffee', 'Milk', 'Vanilla Ice Cream', 'Chocolate Syrup'],
    addons: [
      { name: 'Extra Syrup', price: 40 },
      { name: 'Double Cream', price: 60 },
      { name: 'Choco Chips', price: 50 }
    ]
  },
  {
    id: 'b4', cat: 'beverages', name: 'Chocolate Shake', price: 520, badge: 'popular', emoji: '🥤',
    img: 'https://images.pexels.com/photos/13676051/pexels-photo-13676051.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Chocolate ka ziyada se ziyada — whipped cream aur drizzle k sath.',
    about: 'Dark chocolate ganache, doodh aur gelato — sab blended aur upar par creamy foam. Ye shake un logon ke liye hai jo "thoda kam" bolna h i nahi jaante.',
    ingredients: ['Dark Chocolate', 'Milk', 'Vanilla Gelato', 'Cream'],
    addons: [
      { name: 'Extra Chocolate', price: 60 },
      { name: 'Oreo Crumbs', price: 50 },
      { name: 'Peanut Butter', price: 80 }
    ]
  },
  {
    id: 'b5', cat: 'beverages', name: 'Mango Shake', price: 550, badge: null, emoji: '🥭',
    img: 'https://images.pexels.com/photos/14930475/pexels-photo-14930475.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Sindhri mango ka mausam saal bhar — gaddha aur meetha.',
    about: 'Fresh Sindhri mangoes, thanda doodh aur malai ka lams. Jab mango season na ho to hum acha purana quality use karte hain — promise, swadd same.',
    ingredients: ['Sindhri Mango', 'Milk', 'Malai', 'Ice'],
    addons: [
      { name: 'Extra Malai', price: 40 },
      { name: 'Dry Fruit', price: 60 }
    ]
  },
  {
    id: 'b6', cat: 'beverages', name: 'Strawberry Shake', price: 520, badge: null, emoji: '🍓',
    img: 'https://images.pexels.com/photos/103566/pexels-photo-103566.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Taaza strawberries ka gulaab rang — halka sa meetha, pura dilkash.',
    about: 'Fresh strawberry puree, vanilla gelato aur doodh — blended to creamy perfection. Gulaabi shake jiski selfie lena farz hai.',
    ingredients: ['Strawberry', 'Milk', 'Vanilla Gelato', 'Honey'],
    addons: [
      { name: 'Fresh Strawberry Top', price: 70 },
      { name: 'Whipped Cream', price: 60 }
    ]
  },
  {
    id: 'b7', cat: 'beverages', name: 'Fresh Lemonade', price: 250, badge: null, emoji: '🍋',
    img: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=900&q=80',
    short: 'Nimbu, podina aur soda — heat ka permanent hal.',
    about: 'Taza nimbu, chaat masala ki hint, aur thande soda ka jhag. Light, zingy aur bilkul refresh — chai ke baad ka dose.',
    ingredients: ['Fresh Lemon', 'Soda', 'Mint', 'Chaat Masala'],
    addons: [
      { name: 'Extra Podina', price: 15 },
      { name: 'Salted (Nemak)', price: 0 }
    ]
  },
  {
    id: 'b8', cat: 'beverages', name: 'Meethi / Khatti Lassi', price: 320, badge: null, emoji: '🥛',
    img: 'https://images.pexels.com/photos/18142603/pexels-photo-18142603.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Malai wali dahi se bani — meethi ya khatti, dono kahe — aap ki pasand.',
    about: 'Kadori mein dahi bilkul sahi kadar, malai ka dhaaga aur thandi roti ke saath. Meethi dunya chatapata, khatti thandi jhaans.',
    ingredients: ['Fresh Dahi', 'Malai', 'Chini / Namak', 'Ice'],
    addons: [
      { name: 'Extra Malai', price: 40 },
      { name: 'Mango Lassi Mix', price: 80 }
    ]
  },
  {
    id: 'b9', cat: 'beverages', name: 'Mint Iced Tea', price: 380, badge: 'new', emoji: '🍃',
    img: 'https://images.pexels.com/photos/34040947/pexels-photo-34040947.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Green tea, podina aur nimbu — hawa ka jhoka, glass mein.',
    about: 'Green tea ko sakht kar ke thanda, podina aur nimbu ke sath — bina chini ki meethas, bilkul taza. Brunch ka sathi.',
    ingredients: ['Green Tea', 'Mint', 'Lemon', 'Honey'],
    addons: [
      { name: 'Extra Honey', price: 30 },
      { name: 'Sparkling', price: 30 }
    ]
  },

  /* ---------- SAVORIES ---------- */
  {
    id: 's1', cat: 'savories', name: 'Aloo Samosa (2 pc)', price: 150, badge: 'popular', emoji: '🥟',
    img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
    short: 'Kadak coating, andar masala aloo — chutney ke saath jannat.',
    about: 'Har kone wala samosa, andar desi aloo ka masala jo handi mein pakaya jata hai. Chutney, tamatar sauces aur yaadon ka haath — sab kuch.',
    ingredients: ['Maida', 'Aloo Masala', 'Zeera', 'Hari Mirch', 'Tel'],
    addons: [
      { name: 'Tarri / Raita', price: 30 },
      { name: 'Extra Chutney', price: 20 }
    ]
  },
  {
    id: 's2', cat: 'savories', name: 'Chicken Samosa (2 pc)', price: 220, badge: null, emoji: '🐔',
    img: 'https://images.pexels.com/photos/8625953/pexels-photo-8625953.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Minced chicken masala ka pura package — crispy aur juicy dono.',
    about: 'Chicken ke saath adrak hari mirch aur secret desi masala — crispy outer, juicy andar. Aisay log bhi confirm hain jo light chaiyay.',
    ingredients: ['Chicken Mince', 'Maida', 'Garam Masala', 'Adrak', 'Tel'],
    addons: [
      { name: 'Cheese Center', price: 60 },
      { name: 'Raita', price: 30 }
    ]
  },
  {
    id: 's3', cat: 'savories', name: 'Mixed Pakora (6 pc)', price: 250, badge: null, emoji: '🧅',
    img: 'https://images.pexels.com/photos/13220364/pexels-photo-13220364.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Besan mein aalo, pyaz, palak — barish ka sahara, barsaat hi ho.',
    about: 'Roz taza besan, saath mein mozgama sarson ka tel. Pyaz wale pakorey, aloo wale, aur palak waale — har kisi ki apni pasand hai.',
    ingredients: ['Besan', 'Aloo', 'Pyaz', 'Palak', 'Hari Mirch'],
    addons: [
      { name: 'Lemon Wedge', price: 15 },
      { name: 'Green Chutney', price: 20 }
    ]
  },
  {
    id: 's4', cat: 'savories', name: 'Bun Kebab', price: 180, badge: 'popular', emoji: '🍔',
    img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=900&q=80',
    short: 'Anday aur shami ka classic combo — Karachi se Lahore tak ka keemti nuskha.',
    about: 'Shami ke patty ko egg mein dooba kar tala gaya, bun mein anda aur tamatar, chatni aur dahi ke saath. Chai ka sab se loyal dost.',
    ingredients: ['Gosht Shami', 'Anda', 'Bun', 'Tamatar', 'Chatni'],
    addons: [
      { name: 'Cheese Slice', price: 50 },
      { name: 'Extra Anda', price: 40 }
    ]
  },
  {
    id: 's5', cat: 'savories', name: 'Chicken Sandwich', price: 320, badge: null, emoji: '🥪',
    img: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=900&q=80',
    short: 'Grilled bread, juicy chicken, veggies aur secret sauce.',
    about: 'House-made kewpie-style sauce, taza salad aur aaram se grilled chicken. Sandwich bhi ho sakti hai level aisi.',
    ingredients: ['Chicken', 'Bread', 'Lettuce', 'Mayo Sauce', 'Tamatar'],
    addons: [
      { name: 'Extra Cheese', price: 50 },
      { name: 'Peri Peri', price: 30 }
    ]
  },
  {
    id: 's6', cat: 'savories', name: 'Club Sandwich', price: 420, badge: 'new', emoji: '👑',
    img: 'https://images.pexels.com/photos/959922/pexels-photo-959922.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Teesra layer har jagah nahi milta — ye wala khas hai.',
    about: 'Triple-decker: egg, chicken aur veggies teen layers mein. Fries ke saath toast hote hain — poori malaika night snack.',
    ingredients: ['Chicken', 'Egg', 'Lettuce', 'Bread', 'Mayo', 'Fries'],
    addons: [
      { name: 'Double Cheese', price: 70 },
      { name: 'Jalapenos', price: 30 }
    ]
  },
  {
    id: 's7', cat: 'savories', name: 'French Fries', price: 280, badge: null, emoji: '🍟',
    img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80',
    short: 'Golden crispy, andar se naram — chai ke saath karari taali.',
    about: 'Double-fried perfection — bahar se karari, andar se fluffy. Paprika aur chat masala ka halka sa dusting. Order for the table, share with koi nahi.',
    ingredients: ['Aloo', 'Tel', 'Paprika', 'Chat Masala'],
    addons: [
      { name: 'Cheese Sauce', price: 60 },
      { name: 'Peri Peri', price: 30 }
    ]
  },
  {
    id: 's8', cat: 'savories', name: 'Chicken Cheese Roll', price: 350, badge: 'popular', emoji: '🌯',
    img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80',
    short: 'Chatpata chicken, melted cheese, paratha roll — full package.',
    about: 'Bhuna chicken, pyaz ka lams aur cheese ka taar — parathe mein lipat kar tala gaya. Lunch, dinner, ya dosti ka maamla.',
    ingredients: ['Chicken', 'Cheese', 'Paratha', 'Pyaz', 'Chat Masala'],
    addons: [
      { name: 'Schezwan Dip', price: 30 },
      { name: 'Extra Cheese', price: 60 }
    ]
  },
  {
    id: 's9', cat: 'savories', name: 'Egg Paratha Roll', price: 300, badge: null, emoji: '🍳',
    img: 'https://images.unsplash.com/photo-1560611588-5a38ceb7d39f?auto=format&fit=crop&w=900&q=80',
    short: 'Malida paratha aur anda masala — college wala sab se bara.',
    about: 'Naram malida paratha, bhuna anda masala, tamatar aur chutney. Canteen waala wajood — lekin quality aaj kal ki.',
    ingredients: ['Paratha', 'Whole Egg', 'Anda Masala', 'Tamatar', 'Chutney'],
    addons: [
      { name: 'Chicken Kabab', price: 80 },
      { name: 'Cheese', price: 50 }
    ]
  },
  {
    id: 's10', cat: 'savories', name: 'Gol Gappa Chaat', price: 220, badge: 'hot', emoji: '🟡',
    img: 'https://images.pexels.com/photos/30641912/pexels-photo-30641912.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Crispy gappay, khatti meethi chaat — ek bite mein poori duniya.',
    about: 'Plated chaat: crisp puris, aloo-chana masala, dahi, imli chutney aur hari mirch ka teer. Desi chaat lovers ka corner.',
    ingredients: ['Puri', 'Aloo', 'Chana', 'Dahi', 'Imli Chutney'],
    addons: [
      { name: 'Extra Hari Mirch', price: 15 },
      { name: 'Anda Chaat', price: 50 }
    ]
  },

  /* ---------- DESSERTS ---------- */
  {
    id: 'd1', cat: 'desserts', name: 'Sizzling Brownie', price: 550, badge: 'popular', emoji: '🍫',
    img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
    short: 'Garami, chocolate, vanilla scoop — sizzle ke sath drama.',
    about: 'Brownie cooker par sizzle hote hue aata hai, upar vanilla gelato aur hot chocolate sauce. Kuch bhi nahi bolne ka — maza lo.',
    ingredients: ['Chocolate Brownie', 'Vanilla Gelato', 'Hot Chocolate Sauce', 'Nuts'],
    addons: [
      { name: 'Double Scoop', price: 150 },
      { name: 'Caramel Drizzle', price: 60 }
    ]
  },
  {
    id: 'd2', cat: 'desserts', name: 'Chocolate Fudge Cake', price: 450, badge: null, emoji: '🍰',
    img: 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?auto=format&fit=crop&w=900&q=80',
    short: 'Dense, fudgy, triple-layer — meethas ka taaj.',
    about: 'Rooz taza banne wala cake — rich dark chocolate fudge, smooth buttercream aur bouncy sponge. Slice ya pura box, aap ki marzi.',
    ingredients: ['Chocolate Sponge', 'Fudge', 'Buttercream', 'Cocoa'],
    addons: [
      { name: 'Vanilla Scoop', price: 100 },
      { name: 'Birthday Candle', price: 0 }
    ]
  },
  {
    id: 'd3', cat: 'desserts', name: 'Belgian Waffle', price: 600, badge: 'popular', emoji: '🧇',
    img: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=900&q=80',
    short: 'Crispy golden, toppings ki chadar — brunch ka hero.',
    about: 'Fresh waffle iron se nikla hua, chocolate syrup, nuts aur fruit ke saath. Kasi aap Nutella, kasi aap berries — choose karo.',
    ingredients: ['Waffle Batter', 'Chocolate', 'Nuts', 'Strawberry'],
    addons: [
      { name: 'Nutella', price: 120 },
      { name: 'Ice Cream', price: 100 },
      { name: 'Banana', price: 60 }
    ]
  },
  {
    id: 'd4', cat: 'desserts', name: 'Gulab Jamun (2 pc)', price: 250, badge: null, emoji: '🥮',
    img: 'https://images.pexels.com/photos/15014919/pexels-photo-15014919.jpeg?auto=compress&cs=tinysrgb&w=900',
    short: 'Naram gud ki andaaz mein — chini ki chashni, royoon ka jhoola.',
    about: 'Khoya aur maida — ghee mein halke tal kar chashni mein dooba. Garam garam wale hain sab se zyada maqbool.',
    ingredients: ['Khoya', 'Maida', 'Elaichi', 'Chashni (Chini)'],
    addons: [
      { name: 'Kesar Topping', price: 30 },
      { name: '2 Extra Piece', price: 220 }
    ]
  },
  {
    id: 'd5', cat: 'desserts', name: 'Kulfi Falooda', price: 480, badge: null, emoji: '🍨',
    img: 'https://cdn.pixabay.com/photo/2021/09/07/10/14/matka-kulfi-6603515_1280.jpg',
    short: 'Rabri, kulfi, falooda aur meethe sapne — ek glass mein parivartan.',
    about: 'Hand-churned kulfi, taza falooda, rabri aur meethi ya khushboo wali rooh afza. Sukoon ka poora package.',
    ingredients: ['Kulfi', 'Falooda', 'Rabri', 'Rose Syrup'],
    addons: [
      { name: 'Dry Fruits', price: 60 },
      { name: 'Double Kulfi', price: 150 }
    ]
  },
  {
    id: 'd6', cat: 'desserts', name: 'Choco Chip Cookie', price: 200, badge: 'new', emoji: '🍪',
    img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80',
    short: 'Soft-center, gooey choco chips — chai ka sab se pyar card.',
    about: 'Salt-sweet balance bilkul sahi, andar raw-center wali chidiya no. Winters mein chai ke sath, summers mein doodh ke sath — dono sides covered.',
    ingredients: ['Flour', 'Brown Sugar', 'Chocolate Chips', 'Butter'],
    addons: [
      { name: 'Warm Serve', price: 0 },
      { name: 'Ice Cream', price: 100 }
    ]
  },
  {
    id: 'd7', cat: 'desserts', name: 'Ice Cream Sundae', price: 420, badge: null, emoji: '🍦',
    img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80',
    short: 'Teen scoops, sauce ki barish, nuts ki chadar — pure blis.',
    about: 'Vanilla, chocolate aur strawberry scoops — caramel aur chocolate sauce mein doobay, peanuts sprinkle. Bachon ki khushi, grown-ups ka excuse.',
    ingredients: ['3 Flavors Gelato', 'Chocolate Sauce', 'Caramel', 'Peanuts'],
    addons: [
      { name: 'Cherry Topping', price: 20 },
      { name: 'Extra Nuts', price: 40 }
    ]
  },
  {
    id: 'd8', cat: 'desserts', name: 'Rasmalai', price: 350, badge: null, emoji: '🤍',
    img: 'https://cdn.pixabay.com/photo/2018/10/20/10/43/ras-malai-3760549_1280.jpg',
    short: 'Naram chenna, saffron doodh — mithai ka mumal dupatta.',
    about: 'Rabri mein doobay hui rasmalai, kesar k pista ke saath. Classic dessert jo kisi bhi daawat ko mukammal karta hai.',
    ingredients: ['Chenna', 'Rabri', 'Kesar', 'Pista', 'Elaichi'],
    addons: [
      { name: 'Extra Rabri', price: 40 },
      { name: 'Dry Fruits', price: 60 }
    ]
  }
];

/* ---------- Cloud menu loader (Supabase via db.js) ---------- */
function showDbBanner(msg) {
  const b = $('#dbBanner');
  if (!b) return;
  b.textContent = msg;
  b.hidden = false;
}

async function loadCloudMenu() {
  try {
    await (window.__CC_DB__ || Promise.resolve());
    const client = window.__CC_SUPABASE__;
    if (!client) throw new Error('supabase client unavailable');

    const [catsRes, prodsRes] = await Promise.all([
      client.from('categories').select('id,label,icon,sub,sort_order').order('sort_order', { ascending: true }),
      client.from('products')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
    ]);

    if (catsRes.error) throw catsRes.error;
    if (prodsRes.error) throw prodsRes.error;
    if (!Array.isArray(prodsRes.data) || !prodsRes.data.length) throw new Error('empty menu from cloud');

    const nextCats = {};
    catsRes.data.forEach((c) => { nextCats[c.id] = { label: c.label, icon: c.icon, sub: c.sub }; });
    Object.keys(CATS).forEach((k) => delete CATS[k]);
    Object.assign(CATS, nextCats);

    MENU.length = 0;
    prodsRes.data.forEach((p) => {
      MENU.push({
        id: p.id,
        cat: p.category_id,
        name: p.name,
        price: p.price,
        badge: p.badge,
        emoji: p.emoji,
        img: p.img,
        short: p.short,
        about: p.about,
        ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
        addons: Array.isArray(p.addons) ? p.addons : []
      });
    });
    return true;
  } catch (e) {
    console.warn('[menu] Cloud menu load failed, using built-in seed:', e && e.message);
    showDbBanner('Menu product list cloud se load nahi ho saki — seed data dikhaya ja raha hai. Thori der baad refresh karein.');
    return false;
  }
}

/* ---------- State ---------- */
let activeCat = 'all';

/* ---------- Render menu ---------- */
function cardHTML(it) {
  const badge = it.badge ? `<span class="card-badge ${it.badge}">${it.badge}</span>` : '';
  return `
    <button class="card enter" data-id="${it.id}" aria-label="View ${esc(it.name)}">
      <div class="card-img">
        <img src="${it.img}" alt="${esc(it.name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg(it.emoji)}'">
        ${badge}
      </div>
      <div class="card-body">
        <h3>${esc(it.name)}</h3>
        <p>${esc(it.short)}</p>
        <div class="card-foot">
          <span class="price">Rs. ${it.price}</span>
          <span class="card-more">Details &rarr;</span>
        </div>
      </div>
    </button>`;
}

function renderMenu() {
  const body = $('#menuBody');
  body.innerHTML = Object.keys(CATS).map((key) => {
    const cat = CATS[key];
    const items = MENU.filter((m) => m.cat === key);
    return `
      <div class="cat-block" data-cat="${key}">
        <div class="cat-head reveal">
          <div class="c-ico">${cat.icon}</div>
          <div>
            <h3>${cat.label}</h3>
            <p>${cat.sub}</p>
          </div>
          <span class="c-count">${items.length} items</span>
        </div>
        <div class="menu-grid">
          ${items.map(cardHTML).join('')}
        </div>
      </div>`;
  }).join('');
}

function renderChips() {
  const chips = [
    { key: 'all', label: 'All Menu', icon: '🍽️' },
    ...Object.keys(CATS).map((k) => ({ key: k, label: CATS[k].icon + ' ' + CATS[k].label, icon: '' }))
  ];
  $('#menuChips').innerHTML = chips.map((c) =>
    `<button class="chip${c.key === activeCat ? ' active' : ''}" data-cat="${c.key}">${c.label}</button>`
  ).join('');
}

function filterMenu(cat) {
  activeCat = cat;
  renderChips();
  $$('.cat-block').forEach((block) => {
    const show = cat === 'all' || block.dataset.cat === cat;
    block.classList.toggle('hide', !show);
    if (show) {
      $$('.card', block).forEach((c) => {
        c.classList.remove('enter');
        void c.offsetWidth; /* restart enter animation */
        c.classList.add('enter');
      });
    }
  });
  const head = $('#menu');
  head.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Featured ---------- */
function renderFeatured() {
  const picks = MENU.filter((m) => m.badge === 'popular').slice(0, 8);
  /* rebalance categories for a nicer spread */
  const featuredSet = new Set(picks.map((p) => p.id));
  for (const m of MENU) {
    if (featuredSet.size >= 8) break;
    if (m.badge && !featuredSet.has(m.id)) { featuredSet.add(m.id); }
  }
  const items = [...featuredSet].map((id) => MENU.find((m) => m.id === id));
  $('#featuredGrid').innerHTML = items.map(cardHTML).join('');
}

/* ---------- Modal ---------- */
const modalState = { item: null, selected: new Map(), noteEl: null, orderBtn: null };

function openItem(id) {
  const item = MENU.find((m) => m.id === id);
  if (!item) return;
  modalState.item = item;
  modalState.selected = new Map();

  const media = $('#modalMedia');
  media.style.backgroundImage = `url('${item.img}')`;
  $('#modalBadge').textContent = item.badge ? item.badge.toUpperCase() : 'SIGNATURE';
  $('#mTitle').textContent = item.name;
  $('#mPrice').textContent = 'Rs. ' + item.price;
  $('#mDesc').textContent = item.about;
  $('#mIngredients').innerHTML = item.ingredients.map((i) => `<span class="m-chip">${esc(i)}</span>`).join('');

  $('#mAddons').innerHTML = item.addons.map((a, i) => `
    <button class="m-chip addon-chip" data-i="${i}">
      <span>${esc(a.name)}</span>
      ${a.price > 0 ? `<span class="a-price">+ Rs. ${a.price}</span>` : ''}
    </button>`).join('');

  $$('.addon-chip', $('#mAddons')).forEach((btn) => btn.addEventListener('click', () => toggleAddon(btn)));

  modalState.noteEl = $('#mNote');
  modalState.orderBtn = $('#mOrder');
  updateOrderUI();
  $('#itemModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function toggleAddon(btn) {
  const i = Number(btn.dataset.i);
  const item = modalState.item;
  if (modalState.selected.has(i)) {
    modalState.selected.delete(i);
    btn.classList.remove('selected');
  } else {
    modalState.selected.set(i, item.addons[i]);
    btn.classList.add('selected');
  }
  updateOrderUI();
}

function updateOrderUI() {
  const item = modalState.item;
  const sel = [...modalState.selected.values()];
  const extra = sel.reduce((sum, a) => sum + a.price, 0);
  const total = item.price + extra;
  if (sel.length) {
    const list = sel.map((a) => `${a.name}${a.price > 0 ? ' (+Rs. ' + a.price + ')' : ''}`).join(', ');
    modalState.noteEl.textContent = `Add-ons: ${list} — Total Rs. ${total}`;
    modalState.noteEl.classList.add('show');
  } else {
    modalState.noteEl.classList.remove('show');
  }
  modalState.orderBtn.textContent = `Add to Order — Rs. ${total} ☕`;
}

function closeModal() {
  $('#itemModal').classList.remove('show');
  document.body.style.overflow = '';
}

/* ---------- Nav / scroll fx ---------- */
function setupNav() {
  const nav = $('#navbar');
  const burger = $('#burger');
  const links = $('#navLinks');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    links.classList.toggle('open');
  });
  $$('.nav-link', links).forEach((l) => l.addEventListener('click', () => {
    burger.classList.remove('open');
    links.classList.remove('open');
  }));

  const toTop = $('#toTop');
  window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 600), { passive: true });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* active section highlight */
  const sections = ['home', 'menu', 'about', 'why', 'reviews', 'contact'].map((s) => $(`#${s}`)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      $$('.nav-link').forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => observer.observe(s));
}

/* ---------- Scroll reveal ---------- */
function setupReveal() {
  const els = $$('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
}

/* ---------- Contact form ---------- */
function setupContact() {
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#cName').value.trim();
    toast(`Shukriya ${esc(name)}! Chai tayar hai, hum jald rabta karenge. ☕`);
    e.target.reset();
  });
}

/* ---------- Activity reporting (visit/login → /api/notify) ---------- */
function reportActivity(type, extra = {}) {
  try {
    const payload = {
      type,
      path: location.pathname + location.search,
      referrer: document.referrer.slice(0, 200),
      screen: (screen && screen.width) ? `${screen.width}x${screen.height}` : '',
      lang: (navigator && navigator.language) || '',
      tz: (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      clientTime: new Date().toLocaleString('en-PK'),
      ...extra
    };
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) setTimeout(() => ctrl.abort(), 5000);
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: ctrl ? ctrl.signal : undefined
    }).catch(() => {});
  } catch (e) { /* site kabhi block nahi honi chahiye */ }
}

/* ---------- Demo auth (localStorage) ---------- */
const AUTH_KEY = 'cc_user';

function readUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { /* noop */ }
  return null;
}

function updateAuthUI() {
  const user = readUser();
  const pill = $('#userPill');
  const loginBtn = $('#loginBtn');
  if (user) {
    loginBtn.hidden = true;
    pill.hidden = false;
    $('#uAvatar').textContent = (user.name || user.email || '?').charAt(0).toUpperCase();
    $('#uName').textContent = user.name || user.email;
    const foot = $('#authFoot');
    foot.innerHTML = `<div class="a-who">Logged in as <strong>${esc(user.name || user.email)}</strong> &#8226; <a href="#" id="footLogout">Logout</a></div>`;
    foot.hidden = false;
    $('#footLogout').addEventListener('click', (e) => { e.preventDefault(); logout(); });
  } else {
    loginBtn.hidden = false;
    pill.hidden = true;
    $('#authFoot').hidden = true;
  }
}

function openAuth() {
  $('#authForm').reset();
  $('#authModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#aEmail').focus(), 80);
}

function closeAuth() {
  $('#authModal').classList.remove('show');
  if (!$('#itemModal').classList.contains('show')) document.body.style.overflow = '';
}

function login(e) {
  e.preventDefault();
  const email = $('#aEmail').value.trim();
  const pass = $('#aPass').value;
  if (!email || !pass) { toast('Email aur password dono chahiye.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Email format sahi nahi hai.'); return; }
  if (pass.length < 6) { toast('Password kam se kam 6 letters ka ho.'); return; }
  const raw = email.split('@')[0].replace(/[._\-]+/g, ' ');
  const name = (raw.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) || email;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ name, email, at: Date.now() }));
  updateAuthUI();
  closeAuth();
  reportActivity('login', { name, email });
  toast(`Khush amdeed, ${name}! ☕ Aap ab login hain.`);
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  updateAuthUI();
  toast('Logout ho gaya. Wapis aana! 👋');
}

function setupAuth() {
  $('#loginBtn').addEventListener('click', openAuth);
  $('#authClose').addEventListener('click', closeAuth);
  $('#authModal').addEventListener('click', (e) => { if (e.target.id === 'authModal') closeAuth(); });
  $('#authForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', logout);
}

/* ---------- Init ---------- */
async function init() {
  await loadCloudMenu();
  renderChips();
  renderMenu();
  renderFeatured();

  $$('#menuChips .chip').forEach((c) => c.addEventListener('click', () => filterMenu(c.dataset.cat)));
  const openFrom = (e) => {
    const card = e.target.closest('.card');
    if (card) openItem(card.dataset.id);
  };
  $('#menuBody').addEventListener('click', openFrom);
  $('#featuredGrid').addEventListener('click', openFrom);

  $('#modalClose').addEventListener('click', closeModal);
  $('#itemModal').addEventListener('click', (e) => { if (e.target.id === 'itemModal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeAuth(); } });
  $('#mOrder').addEventListener('click', () => {
    const item = modalState.item;
    const sel = [...modalState.selected.keys()];
    toast(`✅ ${item.name}${sel.length ? ' + ' + sel.length + ' add-on(s)' : ''} order mein!`);
    closeModal();
  });

  setupAuth();
  updateAuthUI();
  reportActivity('visit');
  setupNav();
  setupReveal();
  setupContact();
  $('#year').textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', init);