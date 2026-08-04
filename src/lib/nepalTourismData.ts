/**
 * nepalTourismData.ts — Comprehensive Nepal tourism knowledge base.
 *
 * Static data: no DB migration, always available, fast.
 * Covers destinations, activities, practical info, festivals, and trekking routes.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Destination {
  name: string;
  region: "kathmandu-valley" | "western" | "central" | "eastern" | "terai" | "far-western";
  elevation: string;
  description: string;
  bestTimeToVisit: string;
  attractions: string[];
  activities: string[];
  localFood: string[];
  gettingThere: string;
  estimatedDailyBudget: { budget: string; midRange: string; luxury: string };
  travelTips: string[];
  nearbyDestinations: string[];
  stayDuration: string; // recommended
}

export interface TrekkingRoute {
  name: string;
  region: string;
  difficulty: "easy" | "moderate" | "challenging" | "strenuous";
  duration: string;
  maxAltitude: string;
  bestSeason: string;
  permits: string[];
  highlights: string[];
  startPoint: string;
  estimatedCost: string;
  fitnessLevel: string;
}

export interface Activity {
  name: string;
  category: "adventure" | "cultural" | "nature" | "spiritual" | "wellness";
  locations: string[];
  bestSeason: string;
  duration: string;
  estimatedCost: string;
  description: string;
  requirements: string;
}

export interface Festival {
  name: string;
  nepaliName: string;
  month: string; // approximate month(s)
  duration: string;
  description: string;
  bestLocations: string[];
  highlights: string[];
}

export interface PracticalInfo {
  topic: string;
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Destinations                                                       */
/* ------------------------------------------------------------------ */

export const DESTINATIONS: Destination[] = [
  {
    name: "Kathmandu",
    region: "kathmandu-valley",
    elevation: "1,400m",
    description: "Nepal's vibrant capital city, a UNESCO World Heritage zone blending ancient temples, bustling bazaars, and modern life. The Kathmandu Durbar Square, Swayambhunath (Monkey Temple), Boudhanath Stupa, and Pashupatinath Temple are must-visits.",
    bestTimeToVisit: "October–November and March–May",
    attractions: [
      "Kathmandu Durbar Square — ancient Malla royal palace complex with intricate woodcarving",
      "Swayambhunath (Monkey Temple) — 2,500-year-old hilltop stupa with panoramic valley views",
      "Boudhanath Stupa — one of the largest spherical stupas in the world, Tibetan Buddhist pilgrimage center",
      "Pashupatinath Temple — sacred Hindu temple on the Bagmati River, open-air cremation ghats",
      "Thamel — tourist hub with shops, restaurants, trekking gear, and nightlife",
      "Garden of Dreams — neoclassical European garden, a calm oasis in the city center",
      "Asan Bazaar — the oldest market square, spice stalls, local produce, and street food",
      "National Museum of Nepal — art, historical artifacts, and natural history collections",
    ],
    activities: ["Temple tours", "Heritage walks", "Cooking classes", "Shopping in Thamel", "Rickshaw rides", "Yoga retreats"],
    localFood: ["Newari khaja set (beaten rice, meat, fermented veg)", "Chatamari (Newari pizza)", "Juju dhau (king curd)", "Yomari (steamed rice-flour dumpling)", "Sel roti", "Momo"],
    gettingThere: "Tribhuvan International Airport (KTM) — Nepal's only international airport. Connected by road from India border towns Sunauli, Birgunj, Kakarbhitta.",
    estimatedDailyBudget: { budget: "NPR 2,000–3,500 ($15–27)", midRange: "NPR 5,000–10,000 ($38–77)", luxury: "NPR 15,000+ ($115+)" },
    travelTips: [
      "Bargain at markets — prices are often inflated for tourists",
      "Carry dust masks — air quality can be poor, especially in winter",
      "Temple dress code: cover shoulders and knees at sacred sites",
      "Watch out for altitude if coming directly from sea level (1,400m can affect some people)",
    ],
    nearbyDestinations: ["Bhaktapur", "Patan", "Nagarkot", "Dhulikhel", "Chandragiri"],
    stayDuration: "2–4 days",
  },
  {
    name: "Pokhara",
    region: "western",
    elevation: "827m",
    description: "Nepal's adventure capital and gateway to the Annapurna region. Lakeside Pokhara sits on the banks of Phewa Lake with stunning views of the Annapurna and Machapuchare (Fishtail) peaks. Known for paragliding, boating, and a relaxed vibe.",
    bestTimeToVisit: "October–November and March–April",
    attractions: [
      "Phewa Lake — Nepal's second-largest lake, with boating and reflections of the Annapurna range",
      "Sarangkot — hilltop viewpoint for sunrise over the Himalayas and the paragliding launch site",
      "Davis Falls (Patale Chhango) — waterfall that disappears underground into a cave",
      "World Peace Pagoda (Shanti Stupa) — Japanese-built pagoda with panoramic lake and mountain views",
      "International Mountain Museum — exhibits on Himalayan geology, culture, and mountaineering history",
      "Begnas Lake — quieter alternative to Phewa with pristine surroundings",
      "Mahendra Cave — large limestone cave with stalactites",
      "Old Bazaar — traditional Newari architecture, local shops, and street life",
    ],
    activities: ["Paragliding", "Boating on Phewa Lake", "Zip-lining", "Ultra-light flights", "Trekking (Annapurna Base Camp, Poon Hill)", "Yoga and meditation"],
    localFood: ["Thakali dal-bhat set", "Fish from Phewa Lake", "Momo", "Dhido (buckwheat porridge)", "Gundruk (fermented greens)"],
    gettingThere: "Pokhara Airport (PKR) — 25-min domestic flight from Kathmandu. Tourist bus from Kathmandu: 6–7 hours via Prithvi Highway.",
    estimatedDailyBudget: { budget: "NPR 1,500–3,000 ($12–23)", midRange: "NPR 4,000–8,000 ($31–62)", luxury: "NPR 12,000+ ($92+)" },
    travelTips: [
      "Book paragliding with licensed operators — check certification",
      "Lakeside is walkable — rent a bicycle for exploring",
      "Weather clears early morning — sunrise viewpoints are best at dawn",
      "Start Annapurna treks from here (ACAP permit office in Lakeside)",
    ],
    nearbyDestinations: ["Sarangkot", "Begnas Lake", "Australian Camp", "Poon Hill", "Annapurna Base Camp"],
    stayDuration: "3–5 days",
  },
  {
    name: "Chitwan",
    region: "terai",
    elevation: "150m",
    description: "Home to Chitwan National Park, a UNESCO World Heritage Site and one of Asia's best wildlife reserves. Subtropical jungles shelter the endangered one-horned rhinoceros, Bengal tigers, gharial crocodiles, and over 500 bird species.",
    bestTimeToVisit: "October–March (dry season, best for wildlife spotting)",
    attractions: [
      "Chitwan National Park — UNESCO site, one-horned rhinos, Bengal tigers, wild elephants",
      "Rapti River — canoe safaris to spot gharial crocodiles and mugger crocodiles",
      "Tharu Cultural Museum — exhibits on the indigenous Tharu people",
      "Bis Hazari Lake — wetland area for birdwatching",
      "Elephant Breeding Center — conservation center in Sauraha",
    ],
    activities: ["Jungle safari (jeep)", "Canoe rides on Rapti River", "Bird watching (500+ species)", "Tharu cultural dance shows", "Nature walks with guides", "Elephant breeding center visit"],
    localFood: ["Tharu specialties (ghonghi/snail curry, dhikri)", "Jungle-lodge buffets", "Fresh river fish", "Dal bhat with local vegetables"],
    gettingThere: "Bharatpur Airport (BHR) — 20-min flight from Kathmandu. Tourist bus from Kathmandu: 5–6 hours. From Pokhara: 4–5 hours.",
    estimatedDailyBudget: { budget: "NPR 3,000–5,000 ($23–38) including basic safari", midRange: "NPR 8,000–15,000 ($62–115) with guided packages", luxury: "NPR 25,000+ ($192+) luxury jungle lodges" },
    travelTips: [
      "Book a 2-night/3-day jungle package — you need time for safaris, canoe, and cultural shows",
      "Wear neutral colors (khaki, olive) on safaris — avoid bright clothes",
      "Bring insect repellent — subtropical humidity attracts mosquitoes",
      "National Park entry: NPR 2,000 for foreigners",
    ],
    nearbyDestinations: ["Sauraha", "Lumbini", "Palpa/Tansen"],
    stayDuration: "2–3 days",
  },
  {
    name: "Lumbini",
    region: "terai",
    elevation: "150m",
    description: "Birthplace of Lord Buddha and a UNESCO World Heritage Site. The sacred garden complex contains the Maya Devi Temple (exact birth spot), Ashoka Pillar (erected 249 BC), and monasteries built by nations worldwide.",
    bestTimeToVisit: "October–March (cool, dry)",
    attractions: [
      "Maya Devi Temple — marks the exact birthplace of Siddhartha Gautama (Buddha)",
      "Ashoka Pillar — stone pillar erected by Emperor Ashoka in 249 BC, oldest inscription in Nepal",
      "Sacred Garden — archaeological remains and ancient pond where Queen Maya Devi bathed",
      "World Peace Flame — eternal flame for global peace",
      "Monasteries from 25+ countries — Tibetan, Chinese, Myanmar, Thai, Korean, and more",
      "Lumbini Museum — artifacts, sculptures, and Buddhist art",
    ],
    activities: ["Pilgrimage walks", "Meditation retreats", "Monastery tours", "Cycling through the sacred zone", "Visiting the peace flame"],
    localFood: ["Tharu cuisine", "Buddhist vegetarian meals at monastery guesthouses", "Local dal bhat"],
    gettingThere: "Gautam Buddha Airport (BWA) — domestic flights from Kathmandu. Tourist bus from Kathmandu: 8–9 hours. From Chitwan: 4–5 hours. From India (Sunauli border): 1 hour.",
    estimatedDailyBudget: { budget: "NPR 1,500–2,500 ($12–19)", midRange: "NPR 3,000–6,000 ($23–46)", luxury: "NPR 8,000+ ($62+)" },
    travelTips: [
      "The sacred garden is spread over 8 sq km — rent a bicycle or rickshaw",
      "Dress modestly when visiting temples and monasteries",
      "Early morning is the most peaceful time to visit Maya Devi Temple",
      "Combine with Chitwan (4 hours away) for a Terai circuit",
    ],
    nearbyDestinations: ["Kapilvastu (Tilaurakot)", "Chitwan", "Tansen/Palpa"],
    stayDuration: "1–2 days",
  },
  {
    name: "Bhaktapur",
    region: "kathmandu-valley",
    elevation: "1,401m",
    description: "The 'City of Devotees' — a medieval gem in the Kathmandu Valley. Bhaktapur's car-free Durbar Square is the best-preserved of the three Valley squares, with stunning 15th-century Malla architecture, pagoda temples, and thriving pottery traditions.",
    bestTimeToVisit: "October–November and March–May",
    attractions: [
      "Bhaktapur Durbar Square — 55 Window Palace, Golden Gate, Vatsala Temple",
      "Pottery Square — artisans creating traditional clay pots on open-air wheels",
      "Nyatapola Temple — five-story pagoda, the tallest temple in the Valley",
      "Changu Narayan Temple — Nepal's oldest temple (4th century), UNESCO site",
      "Dattatraya Square — ancient Buddhist monastery turned Hindu temple",
      "Siddha Pokhari — medieval royal pond",
    ],
    activities: ["Heritage walks", "Pottery workshops", "Thangka painting classes", "Photography tours", "Juju dhau tasting"],
    localFood: ["Juju dhau (king of yogurt) — Bhaktapur's signature", "Bara (lentil pancake)", "Yomari", "Chatamari"],
    gettingThere: "Local bus or taxi from Kathmandu: 30–45 minutes (13 km). No airport — fly into KTM.",
    estimatedDailyBudget: { budget: "NPR 1,500–2,500 ($12–19)", midRange: "NPR 3,000–6,000 ($23–46)", luxury: "NPR 8,000+ ($62+)" },
    travelTips: [
      "Entry fee: NPR 1,800 for foreigners — valid for multiple days if you register",
      "Best explored on foot — cars are restricted in the old town",
      "Visit early morning to avoid crowds and get golden-hour photos",
      "Combine with Nagarkot for a sunrise + heritage day trip",
    ],
    nearbyDestinations: ["Nagarkot", "Changu Narayan", "Kathmandu", "Patan", "Dhulikhel"],
    stayDuration: "1–2 days",
  },
  {
    name: "Patan (Lalitpur)",
    region: "kathmandu-valley",
    elevation: "1,400m",
    description: "The 'City of Fine Arts' — just across the Bagmati River from Kathmandu. Patan is renowned for its metalwork, stone and woodcarving, and Buddhist heritage. Patan Durbar Square is a masterpiece of Newari architecture.",
    bestTimeToVisit: "October–November and March–May",
    attractions: [
      "Patan Durbar Square — Krishna Mandir (stone temple), Golden Temple, Mahabouddha",
      "Patan Museum — one of South Asia's finest museums of Hindu and Buddhist art",
      "Golden Temple (Kwa Bahal) — 12th-century Buddhist monastery with gilded facade",
      "Mahabouddha Temple — built entirely of terracotta bricks, each depicting Buddha",
      "Rudravarna Mahavihar — oldest monastery in Patan",
    ],
    activities: ["Museum visits", "Metalwork and carving workshops", "Heritage walks", "Traditional craft shopping"],
    localFood: ["Newari feast (Samay Baji)", "Chatamari", "Bara", "Aila (local rice wine)"],
    gettingThere: "Directly south of Kathmandu — taxi/bus 20–30 minutes. No separate airport.",
    estimatedDailyBudget: { budget: "NPR 1,500–2,500 ($12–19)", midRange: "NPR 3,000–6,000 ($23–46)", luxury: "NPR 8,000+ ($62+)" },
    travelTips: [
      "Patan Durbar Square entry: NPR 1,000 for foreigners",
      "Patan Museum is open 10:30 AM – 5:30 PM (closed Tuesdays)",
      "Great for craft shopping — metal statues, handmade paper, Thangka paintings",
    ],
    nearbyDestinations: ["Kathmandu", "Bhaktapur", "Godavari", "Bungamati", "Khokana"],
    stayDuration: "1 day (often combined with Kathmandu stay)",
  },
  {
    name: "Nagarkot",
    region: "kathmandu-valley",
    elevation: "2,195m",
    description: "The Kathmandu Valley's premier mountain viewpoint — on a clear day, Nagarkot offers views of the entire Himalayan range from Dhaulagiri to Everest. Famous for spectacular sunrises and sunsets over the mountains.",
    bestTimeToVisit: "October–November (clearest skies) and February–March",
    attractions: [
      "Nagarkot View Tower — 360-degree panorama of the Himalayan range including Everest",
      "Sunrise over the Himalayas — the #1 draw, seeing peaks glow pink and gold",
      "Hiking trails to Changu Narayan (3–4 hour scenic downhill walk)",
      "Nagarkot Panoramic Hiking Trail — ridge walks with mountain views",
    ],
    activities: ["Sunrise viewing", "Hiking to Changu Narayan", "Mountain biking", "Photography", "Relaxing at hillside resorts"],
    localFood: ["Local dal bhat", "Mountain tea with views", "Seasonal fruit"],
    gettingThere: "From Kathmandu: 1.5 hours by car/taxi (32 km). From Bhaktapur: 45 minutes.",
    estimatedDailyBudget: { budget: "NPR 2,000–3,000 ($15–23)", midRange: "NPR 4,000–8,000 ($31–62)", luxury: "NPR 12,000+ ($92+)" },
    travelTips: [
      "Stay overnight to catch sunrise — arriving early morning isn't the same",
      "Clear views are most common Oct–Nov; monsoon brings clouds",
      "Combine with Bhaktapur for a 2-day heritage + mountain views trip",
    ],
    nearbyDestinations: ["Bhaktapur", "Changu Narayan", "Dhulikhel", "Kathmandu"],
    stayDuration: "1–2 nights",
  },
  {
    name: "Bandipur",
    region: "central",
    elevation: "1,030m",
    description: "A beautifully preserved hilltop Newari town on the old trade route between Kathmandu and Pokhara. Bandipur's car-free main street, traditional architecture, and Himalayan views make it a peaceful cultural gem.",
    bestTimeToVisit: "October–April",
    attractions: [
      "Bandipur Bazaar — car-free main street with traditional Newari buildings",
      "Thani Mai Temple — hilltop temple with 360-degree mountain views",
      "Siddha Gufa — one of South Asia's largest caves (437m deep)",
      "Tundikhel — open meadow with panoramic Himalayan views",
    ],
    activities: ["Heritage walks", "Caving", "Paragliding", "Village homestays", "Sunrise viewing from Thani Mai"],
    localFood: ["Local Newari snacks", "Homestay meals", "Mountain honey"],
    gettingThere: "On the Prithvi Highway between Kathmandu and Pokhara — 4 hours from Kathmandu, 3 hours from Pokhara. Detour uphill from Dumre.",
    estimatedDailyBudget: { budget: "NPR 1,500–2,500 ($12–19)", midRange: "NPR 3,000–5,000 ($23–38)", luxury: "NPR 6,000+ ($46+)" },
    travelTips: [
      "Perfect stopover between Kathmandu and Pokhara — break the long drive",
      "Stay at a heritage guesthouse for the authentic experience",
      "Quiet and uncrowded compared to bigger tourist destinations",
    ],
    nearbyDestinations: ["Pokhara", "Manakamana", "Gorkha"],
    stayDuration: "1–2 nights",
  },
  {
    name: "Tansen (Palpa)",
    region: "western",
    elevation: "1,343m",
    description: "A historic hilltop town in western Nepal with sweeping views of the plains and the Himalayas. Known for metalware (dhaka fabric, karuwa brass pitchers), and Tansen Durbar — the largest palace outside the Kathmandu Valley.",
    bestTimeToVisit: "October–March",
    attractions: [
      "Tansen Durbar (Palpa Durbar) — grand 19th-century palace",
      "Shreenagar Hill — viewpoint with Himalayan panorama and paragliding",
      "Ranighat Palace — 'Nepal's Taj Mahal' by the Kali Gandaki River (3 hr trek)",
      "Amar Narayan Temple — ornate 18th-century pagoda",
    ],
    activities: ["Heritage walks", "Dhaka fabric shopping", "Hiking to Ranighat Palace", "Paragliding from Shreenagar"],
    localFood: ["Newari cuisine", "Tansen ko dahi (local yogurt)", "Gundruk and dhido"],
    gettingThere: "From Pokhara: 4–5 hours by bus. From Lumbini: 4 hours. From Butwal: 1.5 hours.",
    estimatedDailyBudget: { budget: "NPR 1,200–2,000 ($9–15)", midRange: "NPR 2,500–4,000 ($19–31)", luxury: "NPR 5,000+ ($38+)" },
    travelTips: ["Off the main tourist trail — authentic local experience", "Buy dhaka fabric and karuwa (brass pitcher) as souvenirs"],
    nearbyDestinations: ["Lumbini", "Chitwan", "Butwal"],
    stayDuration: "1–2 days",
  },
  {
    name: "Ilam",
    region: "eastern",
    elevation: "1,200m",
    description: "Nepal's tea country — rolling green tea gardens in the far eastern hills. Ilam produces some of Nepal's finest orthodox tea and offers scenic, uncrowded hill landscapes with rhododendron forests.",
    bestTimeToVisit: "March–May (rhododendrons bloom) and September–November",
    attractions: [
      "Ilam Tea Gardens — Kanyam and Fikkal tea estates with guided tours",
      "Mai Pokhari — sacred lake and wetland, a Ramsar site",
      "Antu Danda — sunrise viewpoint above the clouds with views of Kanchenjunga",
      "Sandakpur — the highest point on the Nepal-India border with 360-degree views",
    ],
    activities: ["Tea garden tours", "Birdwatching", "Hiking to Sandakpur", "Photography", "Homestays in tea villages"],
    localFood: ["Fresh Ilam tea", "Tongba (millet beer)", "Local sel roti", "Kinema (fermented soybean)"],
    gettingThere: "Fly to Bhadrapur (BDP) from Kathmandu, then 3 hours by bus to Ilam. Or drive from Kakarbhitta (India border): 4 hours.",
    estimatedDailyBudget: { budget: "NPR 1,200–2,000 ($9–15)", midRange: "NPR 2,500–4,000 ($19–31)", luxury: "NPR 5,000+ ($38+)" },
    travelTips: ["Far eastern Nepal — allocate enough travel time", "Bring layers — hills can be chilly even in summer evenings", "Buy tea directly from estates for the freshest quality"],
    nearbyDestinations: ["Kakarbhitta", "Bhadrapur", "Dhankuta", "Kanchenjunga region"],
    stayDuration: "2–3 days",
  },
  {
    name: "Janakpur",
    region: "terai",
    elevation: "76m",
    description: "Sacred Hindu city in the Terai plains — believed to be the birthplace of Goddess Sita and the setting of the Ramayana. The Janaki Mandir (temple of Sita) is a stunning white marble and sandstone structure in Mughal-Rajput style.",
    bestTimeToVisit: "October–March (cool) or during Vivah Panchami (November/December)",
    attractions: [
      "Janaki Mandir — grand temple of Goddess Sita, one of Nepal's most important Hindu shrines",
      "Ram Mandir — dedicated to Lord Ram, opposite the Janaki Mandir",
      "Dhanush Sagar and Ganga Sagar — sacred ponds for ritual bathing",
      "Vivah Mandap — site commemorating the marriage of Ram and Sita",
      "Mithila Art — vibrant wall paintings and folk art unique to this region",
    ],
    activities: ["Temple pilgrimage", "Mithila art workshops", "Train ride on Nepal's only railway (narrow gauge)", "Festival watching"],
    localFood: ["Mithila cuisine", "Litti chokha", "Dahi chura", "Sattu", "Street food"],
    gettingThere: "Fly from Kathmandu to Janakpur Airport (JKR) — 30 min. Bus from Kathmandu: 8–9 hours.",
    estimatedDailyBudget: { budget: "NPR 1,000–1,800 ($8–14)", midRange: "NPR 2,000–4,000 ($15–31)", luxury: "NPR 5,000+ ($38+)" },
    travelTips: ["Vivah Panchami festival (Nov/Dec) re-enacts the wedding of Ram and Sita — spectacular", "Dress conservatively at temples", "One of Nepal's hottest regions — bring sun protection"],
    nearbyDestinations: ["Birgunj", "Lumbini"],
    stayDuration: "1–2 days",
  },
  {
    name: "Dhulikhel",
    region: "kathmandu-valley",
    elevation: "1,550m",
    description: "A scenic hilltop town east of Kathmandu, known for panoramic Himalayan views from Langtang to Everest. Popular for day hikes, luxury resorts, and as a quieter alternative to Nagarkot.",
    bestTimeToVisit: "October–November and March–May",
    attractions: [
      "Kali Temple viewpoint — Himalayan panorama at the edge of town",
      "Namobuddha — one of the three most important Buddhist pilgrimage sites in Nepal",
      "Panauti — medieval Newari town with sacred confluence and ancient temples",
      "Himalayan sunrise and sunset views",
    ],
    activities: ["Hiking to Namobuddha (3–4 hours)", "Day trip to Panauti", "Mountain biking", "Yoga retreats", "Resort relaxation"],
    localFood: ["Newari cuisine", "Resort dining", "Local organic produce"],
    gettingThere: "From Kathmandu: 1.5 hours by car (30 km east on Arniko Highway).",
    estimatedDailyBudget: { budget: "NPR 2,000–3,000 ($15–23)", midRange: "NPR 5,000–10,000 ($38–77)", luxury: "NPR 15,000+ ($115+)" },
    travelTips: ["Often combined with Nagarkot and Bhaktapur in a 3-day loop", "Several excellent eco-resorts"],
    nearbyDestinations: ["Nagarkot", "Bhaktapur", "Panauti", "Namobuddha"],
    stayDuration: "1–2 nights",
  },
  {
    name: "Upper Mustang",
    region: "western",
    elevation: "2,800–3,800m",
    description: "The 'Last Forbidden Kingdom' — a remote trans-Himalayan desert valley bordering Tibet. Lo Manthang, the walled capital, has centuries-old monasteries, cave paintings, and dramatic barren landscapes unlike anywhere else in Nepal.",
    bestTimeToVisit: "March–November (rain shadow area — good even during monsoon)",
    attractions: [
      "Lo Manthang — walled medieval city, the capital of the former Kingdom of Lo",
      "Choser Caves — ancient sky caves with Buddhist murals",
      "Dhakmar — red cliff village with cave monastery",
      "Kagbeni — gateway village at the confluence of the Kali Gandaki",
      "Thingkar caves and Yara village",
    ],
    activities: ["Trekking", "Monastery visits", "Cave exploration", "Photography", "Cultural immersion with Loba people"],
    localFood: ["Tibetan thukpa (noodle soup)", "Tsampa (roasted barley flour)", "Buckwheat pancakes", "Apple products from Marpha"],
    gettingThere: "Fly Kathmandu/Pokhara to Jomsom, then trek or jeep to Kagbeni (the checkpoint). Trek to Lo Manthang: 4–5 days from Jomsom.",
    estimatedDailyBudget: { budget: "N/A (permit cost makes budget travel impractical)", midRange: "NPR 15,000–20,000 ($115–154) with permits", luxury: "NPR 30,000+ ($231+) with organized tours" },
    travelTips: [
      "Restricted area — special permit required: $500 for 10 days (must join an organized group through a registered agency)",
      "Rain shadow: unlike the rest of Nepal, Upper Mustang is trekable during monsoon",
      "Bring UV protection — thin air and desert terrain mean intense sun",
      "Altitude: acclimatize before crossing passes above 4,000m",
    ],
    nearbyDestinations: ["Jomsom", "Muktinath", "Marpha"],
    stayDuration: "8–12 days (trek)",
  },
  {
    name: "Muktinath",
    region: "western",
    elevation: "3,710m",
    description: "Sacred pilgrimage site for both Hindus and Buddhists, high in the Mustang district. The Muktinath Temple features 108 water spouts and an eternal natural gas flame burning behind a waterfall — a powerful spiritual destination.",
    bestTimeToVisit: "March–May and September–November",
    attractions: [
      "Muktinath Temple — sacred to Vishnu, with 108 bull-head water spouts",
      "Jwala Mai Temple — eternal flame burning from natural gas behind a waterfall",
      "Views of Dhaulagiri and Nilgiri peaks",
      "Kali Gandaki gorge — the world's deepest gorge (between Dhaulagiri and Annapurna)",
    ],
    activities: ["Pilgrimage", "Trekking (part of Annapurna Circuit)", "Photography", "Shaligram fossil hunting along Kali Gandaki"],
    localFood: ["Apple pie in Marpha (famous!)", "Thakali dal bhat", "Buckwheat pancakes"],
    gettingThere: "Fly to Jomsom from Pokhara (20 min), then jeep or trek to Muktinath (3–4 hours). Or walk as part of the Annapurna Circuit.",
    estimatedDailyBudget: { budget: "NPR 3,000–5,000 ($23–38)", midRange: "NPR 5,000–8,000 ($38–62)", luxury: "NPR 12,000+ ($92+)" },
    travelTips: ["Acclimatize properly — 3,710m altitude", "ACAP permit and TIMS card required", "Can be a day trip from Jomsom or a stop on the Annapurna Circuit"],
    nearbyDestinations: ["Jomsom", "Marpha", "Kagbeni", "Upper Mustang"],
    stayDuration: "1–2 days",
  },
  {
    name: "Gorkha",
    region: "central",
    elevation: "1,135m",
    description: "The ancestral home of Prithvi Narayan Shah, the unifier of Nepal. The hilltop Gorkha Durbar (palace-fortress) offers sweeping views of the Manaslu and Himalchuli peaks and is a monument to Nepal's founding history.",
    bestTimeToVisit: "October–November and March–April",
    attractions: [
      "Gorkha Durbar — hilltop palace-fortress with sacred Gorakhnath cave",
      "Manakamana Temple — wish-fulfilling temple accessible by cable car from nearby Kurintar",
      "Views of Manaslu (8,163m) and the Himalayan range",
    ],
    activities: ["Heritage tour of Gorkha Durbar", "Manakamana cable car ride", "Gateway for Manaslu Circuit trek"],
    localFood: ["Local dal bhat", "Gundruk", "Sel roti"],
    gettingThere: "From Kathmandu: 5 hours by bus (via Prithvi Highway to Abu Khaireni, then north). From Pokhara: 3–4 hours.",
    estimatedDailyBudget: { budget: "NPR 1,500–2,500 ($12–19)", midRange: "NPR 2,500–4,000 ($19–31)", luxury: "NPR 5,000+ ($38+)" },
    travelTips: ["Combine with a Manakamana cable car visit for a full day", "Good stopover between Kathmandu and Pokhara"],
    nearbyDestinations: ["Manakamana", "Bandipur", "Pokhara"],
    stayDuration: "1 day",
  },
  {
    name: "Namche Bazaar",
    region: "eastern",
    elevation: "3,440m",
    description: "The bustling Sherpa capital and gateway to Everest. Perched on a horseshoe-shaped hillside, Namche is a vibrant trading town with bakeries, gear shops, and stunning views of Everest, Lhotse, and Ama Dablam.",
    bestTimeToVisit: "March–May and September–November",
    attractions: [
      "Everest View Hotel — highest-placed hotel in the world with Everest panorama",
      "Sherpa Culture Museum — traditional Sherpa artifacts and mountaineering history",
      "Saturday Haat (weekly market) — Tibetan and Sherpa traders gather",
      "Syangboche Airstrip viewpoint",
      "Khumjung Village — Hillary School, yeti scalp at the monastery",
    ],
    activities: ["Acclimatization hikes", "Sherpa museum visit", "Shopping for gear and crafts", "Photography"],
    localFood: ["Sherpa stew", "Yak cheese", "Apple pie", "Tibetan bread", "Butter tea"],
    gettingThere: "Fly Kathmandu to Lukla (35 min), then trek to Namche Bazaar (2 days). Or helicopter directly.",
    estimatedDailyBudget: { budget: "NPR 4,000–6,000 ($31–46)", midRange: "NPR 8,000–12,000 ($62–92)", luxury: "NPR 20,000+ ($154+)" },
    travelTips: [
      "Spend 2 nights for acclimatization — altitude sickness is a real risk",
      "ATMs exist but are unreliable — bring enough cash from Kathmandu",
      "Prices increase with altitude — budget accordingly",
      "Khumbu region requires Sagarmatha NP permit + TIMS card",
    ],
    nearbyDestinations: ["Lukla", "Tengboche", "Everest Base Camp", "Gokyo Lakes"],
    stayDuration: "2–3 nights (for acclimatization)",
  },
  {
    name: "Bardiya National Park",
    region: "far-western",
    elevation: "150m",
    description: "Nepal's largest national park in the far western Terai — wilder and far less visited than Chitwan. Bardiya offers the best chance of spotting wild Bengal tigers, plus elephants, dolphins, gharials, and over 400 bird species.",
    bestTimeToVisit: "October–April",
    attractions: [
      "Bardiya National Park — 968 sq km of dense sal forest and grassland",
      "Bengal tiger tracking (highest density in Nepal)",
      "Gangetic river dolphins in the Karnali and Babai rivers",
      "Tharu communities — indigenous villages with distinctive longhouses",
    ],
    activities: ["Jeep safari", "Walking safaris with guides", "Rafting on Babai and Karnali rivers", "Birdwatching", "Tharu village visits", "River dolphin watching"],
    localFood: ["Tharu cuisine", "Fresh river fish", "Lodge meals"],
    gettingThere: "Fly Kathmandu to Nepalgunj (1 hr), then drive to Thakurdwara (2 hrs). Bus from Kathmandu: 12–15 hours.",
    estimatedDailyBudget: { budget: "NPR 3,000–5,000 ($23–38)", midRange: "NPR 8,000–15,000 ($62–115)", luxury: "NPR 25,000+ ($192+)" },
    travelTips: [
      "Less crowded than Chitwan — more authentic jungle experience",
      "Best tiger-sighting chances in Nepal",
      "Remote — plan enough travel time and bring essentials",
      "National Park entry: NPR 2,000 for foreigners",
    ],
    nearbyDestinations: ["Nepalgunj", "Suklaphanta National Park"],
    stayDuration: "3–4 days",
  },
  {
    name: "Rara Lake",
    region: "far-western",
    elevation: "2,990m",
    description: "Nepal's largest lake — a pristine alpine jewel in the remote far-western hills, surrounded by Rara National Park. Crystal-clear turquoise water, pine forests, and snow-capped peaks create an almost otherworldly landscape.",
    bestTimeToVisit: "September–November and March–May",
    attractions: [
      "Rara Lake — 10.8 sq km of turquoise alpine water, Nepal's biggest lake",
      "Rara National Park — conifer forests, red pandas, musk deer, Himalayan black bears",
      "Chhipra and Murma villages — traditional Thakuri communities",
      "Himalayan views — Sisne Himal, Kanjiroba Himal",
    ],
    activities: ["Lake circumambulation (3–4 hour walk around the lake)", "Birdwatching", "Trekking", "Photography", "Camping"],
    localFood: ["Simple dal bhat", "Local flatbread", "Wild honey"],
    gettingThere: "Fly Kathmandu to Jumla or Talcha (near Rara). From Jumla: 2–3 day trek to Rara Lake. Road access being improved but still rough.",
    estimatedDailyBudget: { budget: "NPR 2,000–3,500 ($15–27)", midRange: "NPR 4,000–6,000 ($31–46)", luxury: "NPR 8,000+ ($62+ — limited luxury options)" },
    travelTips: [
      "Very remote — plan logistics carefully and bring essentials",
      "Limited accommodation — basic teahouses and tents",
      "No phone signal in most areas — embrace the disconnection",
      "National Park entry: NPR 3,000 for foreigners",
    ],
    nearbyDestinations: ["Jumla", "Dolpo"],
    stayDuration: "3–5 days",
  },
  {
    name: "Manaslu Region",
    region: "central",
    elevation: "varies, circuit peaks at 5,106m (Larkya La)",
    description: "The Manaslu Circuit is often called 'the next Annapurna Circuit' — equally stunning but far quieter. It circles the world's 8th highest peak, Manaslu (8,163m), through diverse landscapes from subtropical to arctic.",
    bestTimeToVisit: "March–May and September–November",
    attractions: [
      "Manaslu (8,163m) — the world's 8th highest mountain, dramatic close-up views",
      "Larkya La pass (5,106m) — challenging high pass with glacier views",
      "Samagaon — Sherpa village with Buddhist monastery and views of Manaslu",
      "Birendra Lake — turquoise glacial lake named after the late King Birendra",
      "Diverse ecosystems — subtropical forests to alpine desert",
    ],
    activities: ["Circuit trekking (12–16 days)", "Photography", "Cultural encounters with Tibetan-influenced communities"],
    localFood: ["Sherpa stew", "Tsampa", "Tibetan bread", "Dal bhat variations"],
    gettingThere: "Drive from Kathmandu to Soti Khola (8–9 hours) — the trek start. Or fly to Arughat.",
    estimatedDailyBudget: { budget: "N/A (restricted area, organized groups only)", midRange: "NPR 10,000–15,000 ($77–115)/day including permits", luxury: "NPR 25,000+ ($192+)/day with luxury camping" },
    travelTips: [
      "Restricted area — special permit: $100/week (first week) + $15/day after. Must trek with a registered agency (minimum 2 trekkers or 1 trekker + guide)",
      "Altitude: acclimatize carefully, especially before Larkya La (5,106m)",
      "Less crowded than Annapurna Circuit — feels truly remote",
      "Teahouse lodges available on most of the route now",
    ],
    nearbyDestinations: ["Gorkha", "Kathmandu"],
    stayDuration: "12–16 days (full circuit)",
  },
];

/* ------------------------------------------------------------------ */
/*  Trekking Routes                                                    */
/* ------------------------------------------------------------------ */

export const TREKKING_ROUTES: TrekkingRoute[] = [
  {
    name: "Everest Base Camp Trek",
    region: "Solukhumbu (Khumbu)",
    difficulty: "challenging",
    duration: "12–14 days",
    maxAltitude: "5,364m (EBC) / 5,545m (Kala Patthar)",
    bestSeason: "March–May, September–November",
    permits: ["Sagarmatha National Park entry: NPR 3,000", "TIMS card: NPR 2,000"],
    highlights: ["Standing at Everest Base Camp", "Sunrise from Kala Patthar", "Tengboche Monastery", "Sherpa culture in Namche Bazaar", "Views of Everest, Lhotse, Nuptse, Ama Dablam"],
    startPoint: "Lukla (flight from Kathmandu)",
    estimatedCost: "$1,200–2,500 (guided), $800–1,200 (independent with porters)",
    fitnessLevel: "Good fitness required — 6–8 hours of uphill/downhill walking per day. No technical climbing but high altitude demands acclimatization.",
  },
  {
    name: "Annapurna Base Camp Trek",
    region: "Annapurna, Kaski",
    difficulty: "moderate",
    duration: "7–12 days",
    maxAltitude: "4,130m",
    bestSeason: "March–May, October–November",
    permits: ["ACAP (Annapurna Conservation Area Permit): NPR 3,000", "TIMS card: NPR 2,000"],
    highlights: ["Annapurna Base Camp amphitheater surrounded by Annapurna I, Machapuchare, Hiunchuli", "Hot springs at Jhinu Danda", "Rhododendron forests (March–April)", "Gurung and Magar villages"],
    startPoint: "Nayapul or Phedi (near Pokhara)",
    estimatedCost: "$600–1,500 (guided), $400–800 (independent)",
    fitnessLevel: "Moderate fitness — well-maintained trails with teahouses. Shorter and lower than EBC.",
  },
  {
    name: "Annapurna Circuit Trek",
    region: "Annapurna (Manang, Mustang)",
    difficulty: "challenging",
    duration: "14–21 days",
    maxAltitude: "5,416m (Thorong La Pass)",
    bestSeason: "October–November, March–April",
    permits: ["ACAP: NPR 3,000", "TIMS card: NPR 2,000"],
    highlights: ["Thorong La Pass — one of the world's highest trekking passes", "Diverse landscapes: subtropical to arctic", "Muktinath Temple", "Manang valley", "Tilicho Lake (optional side trip, 4,919m)"],
    startPoint: "Besisahar (6–7 hours from Kathmandu/Pokhara)",
    estimatedCost: "$1,000–2,500 (guided), $600–1,000 (independent)",
    fitnessLevel: "Good fitness and altitude experience recommended. Thorong La is demanding.",
  },
  {
    name: "Poon Hill Trek (Ghorepani)",
    region: "Annapurna, Kaski/Myagdi",
    difficulty: "easy",
    duration: "4–5 days",
    maxAltitude: "3,210m",
    bestSeason: "October–May",
    permits: ["ACAP: NPR 3,000", "TIMS card: NPR 2,000"],
    highlights: ["Sunrise over Annapurna and Dhaulagiri from Poon Hill", "Rhododendron forests", "Traditional Gurung villages (Ghandruk)", "Accessible to beginners"],
    startPoint: "Nayapul (1.5 hours from Pokhara)",
    estimatedCost: "$300–800 (guided), $150–400 (independent)",
    fitnessLevel: "Beginner-friendly — well-maintained paths, lower altitude, short days.",
  },
  {
    name: "Langtang Valley Trek",
    region: "Langtang, Rasuwa",
    difficulty: "moderate",
    duration: "7–10 days",
    maxAltitude: "3,870m (Kyanjin Ri: 4,773m optional)",
    bestSeason: "March–May, October–November",
    permits: ["Langtang National Park entry: NPR 3,000", "TIMS card: NPR 2,000"],
    highlights: ["Closest trek to Kathmandu (no flights needed)", "Tamang heritage culture", "Kyanjin Gompa monastery", "Langtang Lirung (7,227m) views", "Local yak cheese factory at Kyanjin"],
    startPoint: "Syabrubesi (7–8 hours drive from Kathmandu)",
    estimatedCost: "$500–1,200 (guided), $300–600 (independent)",
    fitnessLevel: "Moderate — some steep sections but shorter than EBC or Annapurna Circuit.",
  },
  {
    name: "Mardi Himal Trek",
    region: "Annapurna, Kaski",
    difficulty: "moderate",
    duration: "5–7 days",
    maxAltitude: "4,500m",
    bestSeason: "October–May",
    permits: ["ACAP: NPR 3,000", "TIMS card: NPR 2,000"],
    highlights: ["Close-up views of Machapuchare (Fishtail)", "Less crowded than ABC", "Ridge walking above the clouds", "Beautiful forest trail through rhododendron and bamboo"],
    startPoint: "Kande (1 hour from Pokhara)",
    estimatedCost: "$400–900 (guided), $200–500 (independent)",
    fitnessLevel: "Moderate — steeper ridge sections, fewer teahouses than ABC.",
  },
  {
    name: "Manaslu Circuit Trek",
    region: "Manaslu, Gorkha",
    difficulty: "strenuous",
    duration: "14–18 days",
    maxAltitude: "5,106m (Larkya La Pass)",
    bestSeason: "March–May, September–November",
    permits: ["Restricted area permit: $100/week (first week), $15/day after", "Manaslu Conservation Area Permit: NPR 3,000", "TIMS: NPR 2,000"],
    highlights: ["Remote and uncrowded", "Manaslu (8,163m) close-up views", "Tibetan-influenced culture", "Larkya La glacier pass", "Birendra Lake"],
    startPoint: "Soti Khola (8–9 hours from Kathmandu)",
    estimatedCost: "$1,500–3,000 (guided, mandatory)",
    fitnessLevel: "High fitness and altitude experience required. Larkya La is a major high pass.",
  },
  {
    name: "Upper Mustang Trek",
    region: "Mustang",
    difficulty: "moderate",
    duration: "10–14 days",
    maxAltitude: "3,850m (Lo Manthang)",
    bestSeason: "March–November (rain shadow — good during monsoon)",
    permits: ["Restricted area permit: $500/10 days", "ACAP: NPR 3,000", "TIMS: NPR 2,000"],
    highlights: ["Lo Manthang walled city", "Desert/Tibetan-plateau landscape", "Ancient cave paintings", "Trekable during monsoon", "Living Buddhist culture"],
    startPoint: "Jomsom (flight from Pokhara)",
    estimatedCost: "$2,000–4,000 (guided, mandatory)",
    fitnessLevel: "Moderate fitness — altitude not extreme but terrain is arid and exposed.",
  },
];

/* ------------------------------------------------------------------ */
/*  Activities                                                         */
/* ------------------------------------------------------------------ */

export const ACTIVITIES: Activity[] = [
  {
    name: "Paragliding",
    category: "adventure",
    locations: ["Pokhara (Sarangkot)", "Bandipur", "Sirkot"],
    bestSeason: "October–May",
    duration: "20–30 minutes (tandem flight)",
    estimatedCost: "$70–100 (tandem), $90–120 (with photos/video)",
    description: "Soar above Phewa Lake with the Annapurna range as your backdrop. Pokhara is consistently rated one of the world's top paragliding destinations. Tandem flights require no experience.",
    requirements: "No experience needed for tandem. Weight limit typically 20–120 kg. Wear comfortable clothes and closed shoes.",
  },
  {
    name: "White Water Rafting",
    category: "adventure",
    locations: ["Trisuli River (Kathmandu–Pokhara route)", "Bhote Koshi (near Tibet border)", "Seti River (Pokhara)", "Sun Koshi (multi-day)", "Karnali River (far-western, multi-day)"],
    bestSeason: "October–December and March–May",
    duration: "1 day (Trisuli, Bhote Koshi) to 8–10 days (Sun Koshi, Karnali)",
    estimatedCost: "$30–50 (1-day Trisuli), $80–120 (Bhote Koshi), $800–1,500 (multi-day expeditions)",
    description: "Nepal's Himalayan rivers offer world-class rapids from gentle Grade II (Trisuli) to extreme Grade V (Bhote Koshi, Karnali). Multi-day river trips include camping on white sand beaches.",
    requirements: "Swimming ability recommended. Life jackets and helmets provided. Minimum age varies by river (usually 12–16).",
  },
  {
    name: "Bungee Jumping",
    category: "adventure",
    locations: ["The Last Resort, Bhote Koshi gorge (160m — among the world's highest)", "Kushma-Gyadi suspension bridge area (Pokhara region)"],
    bestSeason: "Year-round (except heavy monsoon: July–August)",
    duration: "Half-day experience including transfers",
    estimatedCost: "$100–130 per jump",
    description: "The Last Resort bungee over the Bhote Koshi gorge is a 160-meter freefall from a suspension bridge — one of the longest freefall bungees in the world.",
    requirements: "Weight limits: typically 40–100 kg. No serious heart conditions. Minimum age usually 12 with parental consent.",
  },
  {
    name: "Jungle Safari",
    category: "nature",
    locations: ["Chitwan National Park", "Bardiya National Park", "Shuklaphanta National Park", "Parsa National Park"],
    bestSeason: "October–March",
    duration: "2–5 days (package)",
    estimatedCost: "$100–300 (budget 2N/3D), $300–800 (mid-range), $800–2,000+ (luxury lodge)",
    description: "Spot one-horned rhinos, Bengal tigers, wild elephants, gharial crocodiles, and 500+ bird species in Nepal's Terai national parks. Jeep safaris, canoe rides, and guided nature walks.",
    requirements: "Wear neutral/dark colors. Bring binoculars and insect repellent. National Park entry fees apply.",
  },
  {
    name: "Mountain Biking",
    category: "adventure",
    locations: ["Kathmandu Valley (Shivapuri, Nagarkot, Kakani)", "Pokhara (Sarangkot, Begnas area)", "Annapurna foothills", "Mustang"],
    bestSeason: "October–May",
    duration: "Half-day to multi-day tours",
    estimatedCost: "$15–30/day (bike rental), $50–150/day (guided tour with bike)",
    description: "From Kathmandu Valley single tracks and downhill routes to multi-day backcountry rides through remote villages and over Himalayan passes. Trails range from easy to technical.",
    requirements: "Basic cycling fitness. Helmets usually provided. Bring padded shorts for longer rides.",
  },
  {
    name: "Zip-Lining",
    category: "adventure",
    locations: ["Pokhara (HighGround Adventures)", "Daman"],
    bestSeason: "Year-round (except heavy rain)",
    duration: "1–2 hours",
    estimatedCost: "$30–50",
    description: "Pokhara hosts one of the world's longest, steepest, and fastest zip-lines — 1.8 km long with speeds up to 120 km/h over a river valley with mountain views.",
    requirements: "Weight limits apply (typically 35–120 kg). No experience needed.",
  },
  {
    name: "Yoga and Meditation Retreats",
    category: "wellness",
    locations: ["Kathmandu (various ashrams)", "Pokhara (lakeside retreats)", "Lumbini (monastery programs)", "Namobuddha"],
    bestSeason: "Year-round (retreats operate all seasons)",
    duration: "3 days to 4+ weeks",
    estimatedCost: "$15–50/day (basic ashram), $50–150/day (mid-range retreat), $200+/day (luxury wellness resort)",
    description: "Nepal's spiritual heritage makes it ideal for yoga, meditation, and mindfulness retreats. Programs range from casual drop-in classes to intensive month-long silent Vipassana meditation.",
    requirements: "No experience needed for beginner programs. Bring comfortable, modest clothing.",
  },
  {
    name: "Cultural Heritage Tours",
    category: "cultural",
    locations: ["Kathmandu Valley (3 Durbar Squares)", "Bhaktapur", "Patan", "Bandipur", "Tansen", "Janakpur"],
    bestSeason: "October–May (pleasant weather for walking tours)",
    duration: "Half-day to multi-day",
    estimatedCost: "$10–30 (self-guided with entry fees), $30–80 (with licensed guide)",
    description: "Explore UNESCO World Heritage Sites, medieval palace squares, ancient temples, traditional Newari architecture, living pottery and metalwork traditions, and Mithila art.",
    requirements: "Comfortable walking shoes. Dress modestly at religious sites (cover shoulders and knees).",
  },
  {
    name: "Cooking Classes",
    category: "cultural",
    locations: ["Kathmandu (Thamel area)", "Pokhara", "Bhaktapur"],
    bestSeason: "Year-round",
    duration: "3–5 hours",
    estimatedCost: "$20–40 per person",
    description: "Learn to make momos (Nepali dumplings), dal bhat (the national dish), Newari specialties like chatamari and yomari, and Thakali cuisine. Classes usually include a market visit.",
    requirements: "No cooking experience needed. Inform about dietary restrictions/allergies in advance.",
  },
  {
    name: "Helicopter Tours",
    category: "adventure",
    locations: ["Everest Base Camp (heli tour)", "Annapurna Base Camp (heli tour)", "Langtang", "Gosaikunda"],
    bestSeason: "October–May (clear skies)",
    duration: "3–5 hours (including landing at base camp)",
    estimatedCost: "$800–1,200 per person (shared), $3,000–5,000 (private charter)",
    description: "For those who can't trek, helicopter tours offer a stunning way to see Everest Base Camp, land at Kala Patthar, or fly to Annapurna Base Camp in a single morning.",
    requirements: "Subject to weather conditions. Minimum passengers may apply for shared flights.",
  },
];

/* ------------------------------------------------------------------ */
/*  Festivals                                                          */
/* ------------------------------------------------------------------ */

export const FESTIVALS: Festival[] = [
  {
    name: "Dashain",
    nepaliName: "दशैं",
    month: "September–October",
    duration: "15 days",
    description: "Nepal's biggest and longest festival — celebrating the victory of goddess Durga over the demon Mahishasura. Families reunite, fly kites, receive tika (red rice + yogurt blessing) from elders, and swing on bamboo swings (ping).",
    bestLocations: ["Kathmandu Valley", "Throughout Nepal (nationwide celebration)"],
    highlights: ["Receiving tika from elders", "Bamboo swings in every village", "Kite flying season", "Animal sacrifices at temples (Dashain's 8th-9th day)", "Nationwide holiday — many businesses close"],
  },
  {
    name: "Tihar (Deepawali)",
    nepaliName: "तिहार",
    month: "October–November",
    duration: "5 days",
    description: "The festival of lights — each day honors a different being: crows, dogs, cows, oxen, and finally brothers/sisters. Homes are lit with oil lamps and marigold garlands. Deusi-Bhailo groups sing door-to-door.",
    bestLocations: ["Kathmandu Valley", "Throughout Nepal"],
    highlights: ["Oil lamps and marigold decorations transforming streets", "Laxmi Puja (day 3) — goddess of wealth", "Dogs garlanded with flowers", "Deusi-Bhailo singing troupes", "Bhai Tika (sibling celebration)"],
  },
  {
    name: "Holi",
    nepaliName: "होली (Fagu Purnima)",
    month: "February–March",
    duration: "2 days",
    description: "The festival of colors — people throw colored powders and water balloons at each other in celebration of spring. Especially lively in the Kathmandu Valley and Terai.",
    bestLocations: ["Kathmandu Durbar Square", "Basantapur", "Terai towns"],
    highlights: ["Color powder fights in the streets", "Water balloon battles", "Live music and dance in Basantapur", "Everyone is fair game — tourists included!"],
  },
  {
    name: "Indra Jatra",
    nepaliName: "इन्द्रजात्रा",
    month: "September",
    duration: "8 days",
    description: "Kathmandu's most spectacular street festival — honoring Indra, the king of heaven. Features masked dances, chariot processions of the living goddess Kumari, and the raising of a ceremonial pole (lingo).",
    bestLocations: ["Kathmandu Durbar Square"],
    highlights: ["Living Goddess Kumari's chariot procession", "Masked Lakhey dances", "Ceremonial pole raising", "Traditional Newari beer (aila) and feasting"],
  },
  {
    name: "Bisket Jatra",
    nepaliName: "बिस्केट जात्रा",
    month: "April (Nepali New Year — Baisakh 1)",
    duration: "9 days",
    description: "Bhaktapur's famous New Year festival — a massive chariot of Bhairava is pulled through the streets and a 25-meter lingo pole is erected. The most dramatic and unique festival in the Valley.",
    bestLocations: ["Bhaktapur"],
    highlights: ["Giant chariot tug-of-war through narrow streets", "25-meter lingo pole raising and falling", "New Year celebrations", "Cultural dances"],
  },
  {
    name: "Buddha Jayanti (Buddha Purnima)",
    nepaliName: "बुद्ध जयन्ती",
    month: "April–May (full moon of Baisakh)",
    duration: "1 day",
    description: "Celebrates the birth, enlightenment, and death of Lord Buddha. Pilgrims flock to Lumbini (birthplace) and Boudhanath and Swayambhunath in Kathmandu.",
    bestLocations: ["Lumbini", "Boudhanath Stupa (Kathmandu)", "Swayambhunath"],
    highlights: ["Processions and prayer gatherings at Lumbini", "Monks chanting at Boudhanath", "Free food distribution", "Butter lamp offerings"],
  },
  {
    name: "Maha Shivaratri",
    nepaliName: "महाशिवरात्रि",
    month: "February–March",
    duration: "1 day (night vigil)",
    description: "The great night of Lord Shiva — devotees fast, stay awake all night, and visit Shiva temples. Pashupatinath in Kathmandu draws hundreds of thousands of pilgrims and sadhus (holy men) from India and Nepal.",
    bestLocations: ["Pashupatinath Temple (Kathmandu)"],
    highlights: ["Sadhus (holy men) gather in thousands", "All-night vigil at Pashupatinath", "Bonfires throughout the temple grounds", "Cannabis officially tolerated at Pashupatinath on this day"],
  },
  {
    name: "Teej",
    nepaliName: "तीज",
    month: "August–September",
    duration: "3 days",
    description: "A women's festival — married women fast for their husbands' long lives, unmarried women pray for good husbands. Women dress in red saris and dance joyfully at temples and public squares.",
    bestLocations: ["Pashupatinath Temple", "Throughout Kathmandu Valley"],
    highlights: ["Women in red saris dancing in the streets", "Fasting and temple rituals", "Dar (feast) the day before fasting begins", "Vibrant, joyful celebration"],
  },
  {
    name: "Chhath Puja",
    nepaliName: "छठ पूजा",
    month: "October–November",
    duration: "4 days",
    description: "A Terai festival dedicated to the Sun God — devotees fast, stand in water at sunrise and sunset, and offer prayers. Especially significant for the Madheshi community.",
    bestLocations: ["Janakpur", "Birgunj", "Terai towns", "Also celebrated at ponds in Kathmandu"],
    highlights: ["Devotees standing waist-deep in water at dawn", "Offerings to the rising and setting sun", "Elaborate fruit and sugarcane arrangements"],
  },
];

/* ------------------------------------------------------------------ */
/*  Practical Travel Info                                              */
/* ------------------------------------------------------------------ */

export const PRACTICAL_INFO: PracticalInfo[] = [
  {
    topic: "Visa & Entry",
    content: "Most nationalities get visa on arrival at Tribhuvan International Airport (KTM) or land borders. Types: 15-day ($30), 30-day ($50), 90-day ($125). Indian nationals don't need a visa. Bring passport photos. Visa can be extended at the Department of Immigration in Kathmandu or Pokhara. SAARC nationals get free 30-day visa.",
  },
  {
    topic: "Currency & Money",
    content: "Nepali Rupee (NPR). Roughly 1 USD = 130–135 NPR (check current rate). ATMs widely available in Kathmandu, Pokhara, and major towns — Nabil Bank, NIC Asia, and Himalayan Bank ATMs accept international cards. Cash is king in rural areas and on treks — bring enough from the city. Credit cards accepted at mid-range to luxury hotels and some restaurants in tourist areas. Money changers in Thamel offer competitive rates.",
  },
  {
    topic: "Language",
    content: "Nepali (नेपाली) is the official language. English is widely understood in tourist areas, hotels, and by educated locals. In rural areas, local languages dominate (Maithili, Bhojpuri, Tamang, Newari, Sherpa, etc.). Learning a few Nepali phrases is appreciated: Namaste (hello/goodbye), Dhanyabad (thank you), Kati ho? (how much?), Mitho cha (it's delicious), Ramro cha (it's beautiful).",
  },
  {
    topic: "Best Time to Visit",
    content: "October–November (autumn): Best overall — clear skies, warm days, festivals (Dashain, Tihar). March–May (spring): Great for trekking and rhododendron blooms, but hazy in the plains. December–February (winter): Cold but clear in the Valley; Terai is pleasant; high-altitude treks are very cold. June–September (monsoon): Lush and green but rain and leeches on trails; Upper Mustang and Dolpo are rain-shadow exceptions.",
  },
  {
    topic: "Trekking Permits",
    content: "TIMS (Trekkers' Information Management System) card: NPR 2,000 ($15) — required for most treks. National park/conservation area permits: NPR 3,000 ($23) for Sagarmatha, Langtang, ACAP. Restricted area permits: Upper Mustang ($500/10 days), Manaslu ($100/week), Upper Dolpo ($500/10 days), Kanchenjunga ($20/week). Permits issued at the Nepal Tourism Board in Kathmandu, ACAP office in Pokhara, or through registered agencies.",
  },
  {
    topic: "Altitude Sickness",
    content: "Acute Mountain Sickness (AMS) can occur above 2,500m. Symptoms: headache, nausea, dizziness, fatigue. Golden rules: ascend slowly (max 300–500m/day above 3,000m), take acclimatization days, drink plenty of water, avoid alcohol at altitude. Diamox (acetazolamide) can help — consult a doctor before your trip. Descend immediately if symptoms worsen. NEVER ascend with symptoms.",
  },
  {
    topic: "Health & Safety",
    content: "Drink bottled or purified water (avoid tap water). Eat at busy, reputable restaurants. Carry a basic medical kit: pain killers, anti-diarrheal, rehydration salts, plasters, antiseptic. Travel insurance with emergency helicopter evacuation coverage is essential for trekking. Vaccinations: consult a travel clinic — Hepatitis A/B, Typhoid, and Tetanus commonly recommended. Rabies vaccine advised if planning rural travel.",
  },
  {
    topic: "Transportation",
    content: "Domestic flights: Yeti Airlines, Buddha Air, Tara Air serve Pokhara, Lukla, Jomsom, Bharatpur, Nepalgunj, etc. Book early for Lukla flights. Tourist buses: Comfortable and reliable between Kathmandu, Pokhara, and Chitwan ($8–15). Local buses: Cheap but crowded — an adventure in itself. Taxis in Kathmandu: insist on the meter or negotiate before. Ride-sharing apps: inDrive and Pathao work in Kathmandu. Rental motorbikes/scooters available in Kathmandu and Pokhara.",
  },
  {
    topic: "Tipping Culture",
    content: "Tipping is appreciated but not mandatory. Guidelines: Restaurant — 5–10% if service charge not included. Trekking guides: $5–10/day. Porters: $3–5/day. Hotel bellboys: NPR 100–200. Taxi drivers: round up the fare. Tour guides (day tours): $5–10.",
  },
  {
    topic: "Internet & SIM Cards",
    content: "Nepal Telecom (NTC) and Ncell offer tourist SIM cards — buy at the airport or in Thamel with your passport photo. Data plans: ~NPR 500–1,000 for 10–30 GB. 4G coverage in cities; 3G or spotty coverage in rural areas. Treks: WiFi available at teahouses (NPR 200–500/day). No signal on many remote trails. Consider a satellite communicator for remote treks.",
  },
  {
    topic: "Local Customs & Etiquette",
    content: "Remove shoes before entering temples and homes. Don't point your feet at people or religious objects. Use your right hand for eating and passing things. Ask before photographing people, especially at religious sites. Dress modestly at temples — cover shoulders and knees. Don't touch people's heads — it's considered sacred. Walk clockwise around Buddhist stupas and mani walls. Namaste (hands pressed together) is the respectful greeting.",
  },
  {
    topic: "Food & Dining",
    content: "Dal bhat (lentil soup, rice, vegetable curries) is the national dish — eaten twice daily by most Nepalis. 'Dal bhat power, 24 hour!' Momos (dumplings) are everywhere — buff (buffalo), chicken, or vegetable. Newari food in the Kathmandu Valley is exceptional. Thakali cuisine in western Nepal is renowned. Street food: try sel roti, chatamari, pani puri, and chaat. Vegetarian options are plentiful. Beef is not served (cows are sacred). Buff (water buffalo) is common.",
  },
  {
    topic: "Emergency Contacts",
    content: "Police: 100. Tourist Police: 1144 (Kathmandu). Ambulance: 102. Fire: 101. CIWEC Hospital (traveler's clinic, Kathmandu): +977-1-4424111. Nepal Tourism Board: +977-1-4256909. Embassy contacts: check your country's embassy website. For trekking emergencies: contact your agency or call the Himalayan Rescue Association (HRA).",
  },
  {
    topic: "Shopping & Souvenirs",
    content: "Popular souvenirs: Pashmina shawls, Thangka paintings, singing bowls, prayer flags, Khukuri knives, handmade paper products, Nepali tea, spices, metalwork statues, Dhaka fabric. Best shopping: Thamel (Kathmandu) for variety, Patan for quality metalwork and art, Bhaktapur for pottery and woodwork. Bargain at markets — start at 40–50% of the asking price. Fixed-price Fair Trade shops exist for guaranteed quality.",
  },
  {
    topic: "Electricity & Plugs",
    content: "230V, 50Hz. Plug types C, D, and M (round pin). Bring a universal adapter. Power cuts have improved significantly but a portable power bank is essential for trekking. Most teahouses charge NPR 200–500 to charge devices.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

export function findDestination(query: string): Destination | undefined {
  const lower = query.toLowerCase();
  return DESTINATIONS.find(
    (d) =>
      d.name.toLowerCase() === lower ||
      lower.includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(lower)
  );
}

export function searchDestinations(query: string): Destination[] {
  const lower = query.toLowerCase();
  return DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(lower) ||
      d.region.toLowerCase().includes(lower) ||
      d.description.toLowerCase().includes(lower) ||
      d.attractions.some((a) => a.toLowerCase().includes(lower)) ||
      d.activities.some((a) => a.toLowerCase().includes(lower))
  );
}

export function findTrek(query: string): TrekkingRoute | undefined {
  const lower = query.toLowerCase();
  return TREKKING_ROUTES.find(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      lower.includes(t.name.toLowerCase().replace(/ trek$/, ""))
  );
}

export function searchTreks(options: {
  difficulty?: string;
  maxDays?: number;
  region?: string;
}): TrekkingRoute[] {
  return TREKKING_ROUTES.filter((t) => {
    if (options.difficulty && t.difficulty !== options.difficulty) return false;
    if (options.region && !t.region.toLowerCase().includes(options.region.toLowerCase())) return false;
    if (options.maxDays) {
      const daysMatch = t.duration.match(/(\d+)/);
      if (daysMatch && parseInt(daysMatch[1]) > options.maxDays) return false;
    }
    return true;
  });
}

export function findActivity(query: string): Activity | undefined {
  const lower = query.toLowerCase();
  return ACTIVITIES.find(
    (a) =>
      a.name.toLowerCase().includes(lower) ||
      lower.includes(a.name.toLowerCase())
  );
}

export function searchActivities(category?: string): Activity[] {
  if (!category) return ACTIVITIES;
  return ACTIVITIES.filter((a) => a.category === category);
}

export function findFestival(query: string): Festival | undefined {
  const lower = query.toLowerCase();
  return FESTIVALS.find(
    (f) =>
      f.name.toLowerCase().includes(lower) ||
      f.nepaliName.includes(query) ||
      lower.includes(f.name.toLowerCase())
  );
}

export function searchFestivals(month?: string): Festival[] {
  if (!month) return FESTIVALS;
  const lower = month.toLowerCase();
  return FESTIVALS.filter((f) => f.month.toLowerCase().includes(lower));
}

export function getPracticalInfo(topic: string): PracticalInfo | undefined {
  const lower = topic.toLowerCase();
  return PRACTICAL_INFO.find(
    (p) =>
      p.topic.toLowerCase().includes(lower) ||
      lower.includes(p.topic.toLowerCase())
  );
}

export function searchPracticalInfo(query: string): PracticalInfo[] {
  const lower = query.toLowerCase();
  return PRACTICAL_INFO.filter(
    (p) =>
      p.topic.toLowerCase().includes(lower) ||
      p.content.toLowerCase().includes(lower)
  );
}

/**
 * Build a compact text block of tourism knowledge relevant to a query.
 * Used to inject into the LLM system/user prompt.
 */
export function buildTourismKnowledgeBlock(query: string): string {
  const lower = query.toLowerCase();
  const blocks: string[] = [];

  // Check for destination matches
  const dest = findDestination(query);
  if (dest) {
    blocks.push(formatDestinationBlock(dest));
  } else {
    // Fuzzy search destinations
    const dests = searchDestinations(query);
    if (dests.length > 0 && dests.length <= 3) {
      for (const d of dests) blocks.push(formatDestinationBlock(d));
    }
  }

  // Check for trekking matches
  const trek = findTrek(query);
  if (trek) {
    blocks.push(formatTrekBlock(trek));
  } else if (/trek|hike|hiking|trail|walk/i.test(lower)) {
    const treks = TREKKING_ROUTES.slice(0, 4);
    blocks.push("POPULAR TREKS:\n" + treks.map((t) => `- ${t.name}: ${t.difficulty}, ${t.duration}, max ${t.maxAltitude}`).join("\n"));
  }

  // Check for activity matches
  const activity = findActivity(query);
  if (activity) {
    blocks.push(formatActivityBlock(activity));
  }

  // Check for festival matches
  const festival = findFestival(query);
  if (festival) {
    blocks.push(formatFestivalBlock(festival));
  } else if (/festival|celebration|holiday|dashain|tihar|holi/i.test(lower)) {
    blocks.push("MAJOR FESTIVALS:\n" + FESTIVALS.slice(0, 5).map((f) => `- ${f.name} (${f.nepaliName}): ${f.month} — ${f.description.slice(0, 80)}...`).join("\n"));
  }

  // Check for practical info matches
  const practicalMatches = searchPracticalInfo(query);
  if (practicalMatches.length > 0) {
    for (const p of practicalMatches.slice(0, 2)) {
      blocks.push(`${p.topic.toUpperCase()}:\n${p.content}`);
    }
  }

  return blocks.join("\n\n---\n\n");
}

/* ------------------------------------------------------------------ */
/*  Formatting Helpers                                                 */
/* ------------------------------------------------------------------ */

function formatDestinationBlock(d: Destination): string {
  return `DESTINATION: ${d.name} (${d.region}, ${d.elevation})
${d.description}
Best time: ${d.bestTimeToVisit}
Stay: ${d.stayDuration}
Attractions: ${d.attractions.map((a) => a.split(" — ")[0]).join("; ")}
Activities: ${d.activities.join(", ")}
Local food: ${d.localFood.join(", ")}
Getting there: ${d.gettingThere}
Budget: Budget ${d.estimatedDailyBudget.budget}, Mid ${d.estimatedDailyBudget.midRange}, Luxury ${d.estimatedDailyBudget.luxury}
Tips: ${d.travelTips.join(". ")}
Nearby: ${d.nearbyDestinations.join(", ")}`;
}

function formatTrekBlock(t: TrekkingRoute): string {
  return `TREK: ${t.name}
Region: ${t.region} | Difficulty: ${t.difficulty} | Duration: ${t.duration}
Max altitude: ${t.maxAltitude} | Best season: ${t.bestSeason}
Start: ${t.startPoint}
Permits: ${t.permits.join("; ")}
Highlights: ${t.highlights.join("; ")}
Cost: ${t.estimatedCost}
Fitness: ${t.fitnessLevel}`;
}

function formatActivityBlock(a: Activity): string {
  return `ACTIVITY: ${a.name} (${a.category})
${a.description}
Locations: ${a.locations.join("; ")}
Season: ${a.bestSeason} | Duration: ${a.duration}
Cost: ${a.estimatedCost}
Requirements: ${a.requirements}`;
}

function formatFestivalBlock(f: Festival): string {
  return `FESTIVAL: ${f.name} (${f.nepaliName})
When: ${f.month} (${f.duration})
${f.description}
Best locations: ${f.bestLocations.join(", ")}
Highlights: ${f.highlights.join("; ")}`;
}

/**
 * Build a compact summary for voice mode — much shorter than text mode.
 */
export function buildTourismVoiceSummary(query: string): string {
  const dest = findDestination(query);
  if (dest) {
    return `${dest.name}: ${dest.description.slice(0, 120)}. Best time: ${dest.bestTimeToVisit}. Top things: ${dest.activities.slice(0, 3).join(", ")}.`;
  }
  const trek = findTrek(query);
  if (trek) {
    return `${trek.name}: ${trek.difficulty}, ${trek.duration}, max ${trek.maxAltitude}. ${trek.highlights[0]}.`;
  }
  return "";
}

/** List all destination names for intent detection. */
export function getAllDestinationNames(): string[] {
  return DESTINATIONS.map((d) => d.name);
}

/** List all trekking route names. */
export function getAllTrekNames(): string[] {
  return TREKKING_ROUTES.map((t) => t.name);
}

/** List all activity names. */
export function getAllActivityNames(): string[] {
  return ACTIVITIES.map((a) => a.name);
}
