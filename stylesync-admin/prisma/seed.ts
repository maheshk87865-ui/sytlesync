import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding StyleSync Pan-India Multi-City Super Admin Database ---');

  // 1. Administrators
  const defaultPasswordHash = await bcrypt.hash('AdminPassword123!', 10);

  const adminsData = [
    {
      email: 'admin@stylesync.in',
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'ops@stylesync.in',
      name: 'Operations Manager',
      role: 'OPERATIONS_ADMIN',
      status: 'ACTIVE',
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'finance@stylesync.in',
      name: 'Finance Controller',
      role: 'FINANCE_ADMIN',
      status: 'ACTIVE',
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'support@stylesync.in',
      name: 'Customer Support Lead',
      role: 'SUPPORT_ADMIN',
      status: 'ACTIVE',
      passwordHash: defaultPasswordHash,
    },
    {
      email: 'analyst@stylesync.in',
      name: 'Platform Analyst',
      role: 'ANALYST',
      status: 'ACTIVE',
      passwordHash: defaultPasswordHash,
    },
  ];

  for (const admin of adminsData) {
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: {},
      create: admin,
    });
  }

  // 2. Pan-India Locations (Major Hubs & Localities)
  const allLocalities = [
    // Srinagar (Pilot Hub)
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Lal Chowk', postalCode: '190001' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Rajbagh', postalCode: '190008' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Karan Nagar', postalCode: '190010' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Sanat Nagar', postalCode: '190005' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Hazratbal', postalCode: '190006' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Jawahar Nagar', postalCode: '190008' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Bemina', postalCode: '190018' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Soura', postalCode: '190011' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Dalgate', postalCode: '190001' },
    { cityName: 'Srinagar', state: 'Jammu and Kashmir', localityName: 'Nishat', postalCode: '190021' },

    // Jammu (J&K Regional Expansion)
    { cityName: 'Jammu', state: 'Jammu and Kashmir', localityName: 'Gandhi Nagar', postalCode: '180004' },
    { cityName: 'Jammu', state: 'Jammu and Kashmir', localityName: 'Bahu Plaza', postalCode: '180012' },
    { cityName: 'Jammu', state: 'Jammu and Kashmir', localityName: 'Channi Himmat', postalCode: '180015' },
    { cityName: 'Jammu', state: 'Jammu and Kashmir', localityName: 'Jewel Chowk', postalCode: '180001' },

    // Delhi NCR (North Capital Region)
    { cityName: 'Delhi NCR', state: 'Delhi', localityName: 'Connaught Place', postalCode: '110001' },
    { cityName: 'Delhi NCR', state: 'Delhi', localityName: 'South Extension', postalCode: '110049' },
    { cityName: 'Delhi NCR', state: 'Delhi', localityName: 'Hauz Khas', postalCode: '110016' },
    { cityName: 'Delhi NCR', state: 'Delhi', localityName: 'Saket', postalCode: '110017' },
    { cityName: 'Delhi NCR', state: 'Haryana', localityName: 'DLF Cyber City', postalCode: '122002' },
    { cityName: 'Delhi NCR', state: 'Uttar Pradesh', localityName: 'Noida Sector 18', postalCode: '201301' },

    // Mumbai (West Commercial Capital)
    { cityName: 'Mumbai', state: 'Maharashtra', localityName: 'Bandra West', postalCode: '400050' },
    { cityName: 'Mumbai', state: 'Maharashtra', localityName: 'Juhu', postalCode: '400049' },
    { cityName: 'Mumbai', state: 'Maharashtra', localityName: 'Colaba', postalCode: '400005' },
    { cityName: 'Mumbai', state: 'Maharashtra', localityName: 'Andheri West', postalCode: '400058' },
    { cityName: 'Mumbai', state: 'Maharashtra', localityName: 'Powai', postalCode: '400076' },
    { cityName: 'Mumbai', state: 'Maharashtra', localityName: 'Lower Parel', postalCode: '400013' },

    // Bengaluru (South Tech Capital)
    { cityName: 'Bengaluru', state: 'Karnataka', localityName: 'Indiranagar', postalCode: '560038' },
    { cityName: 'Bengaluru', state: 'Karnataka', localityName: 'Koramangala', postalCode: '560034' },
    { cityName: 'Bengaluru', state: 'Karnataka', localityName: 'Whitefield', postalCode: '560066' },
    { cityName: 'Bengaluru', state: 'Karnataka', localityName: 'HSR Layout', postalCode: '560102' },
    { cityName: 'Bengaluru', state: 'Karnataka', localityName: 'MG Road', postalCode: '560001' },
    { cityName: 'Bengaluru', state: 'Karnataka', localityName: 'JP Nagar', postalCode: '560078' },

    // Chandigarh (North Tri-city)
    { cityName: 'Chandigarh', state: 'Chandigarh', localityName: 'Sector 17', postalCode: '160017' },
    { cityName: 'Chandigarh', state: 'Chandigarh', localityName: 'Sector 35', postalCode: '160035' },
    { cityName: 'Chandigarh', state: 'Punjab', localityName: 'Mohali Phase 7', postalCode: '160062' },

    // Jaipur (West Heritage)
    { cityName: 'Jaipur', state: 'Rajasthan', localityName: 'C-Scheme', postalCode: '302001' },
    { cityName: 'Jaipur', state: 'Rajasthan', localityName: 'Malviya Nagar', postalCode: '302017' },
    { cityName: 'Jaipur', state: 'Rajasthan', localityName: 'Raja Park', postalCode: '302004' },

    // Hyderabad (South Central Hub)
    { cityName: 'Hyderabad', state: 'Telangana', localityName: 'Banjara Hills', postalCode: '500034' },
    { cityName: 'Hyderabad', state: 'Telangana', localityName: 'Jubilee Hills', postalCode: '500033' },
    { cityName: 'Hyderabad', state: 'Telangana', localityName: 'Gachibowli', postalCode: '500032' },

    // Kolkata (East Cultural Hub)
    { cityName: 'Kolkata', state: 'West Bengal', localityName: 'Park Street', postalCode: '700016' },
    { cityName: 'Kolkata', state: 'West Bengal', localityName: 'Salt Lake', postalCode: '700091' },
    { cityName: 'Kolkata', state: 'West Bengal', localityName: 'Ballygunge', postalCode: '700019' },
  ];

  for (const loc of allLocalities) {
    const existing = await prisma.location.findFirst({
      where: { cityName: loc.cityName, localityName: loc.localityName },
    });
    if (!existing) {
      await prisma.location.create({
        data: {
          cityName: loc.cityName,
          localityName: loc.localityName,
          state: loc.state,
          postalCode: loc.postalCode,
          isActive: true,
          salonCount: 1,
        },
      });
    }
  }

  // 3. Platform Settings
  const settingsData = [
    { key: 'COMMISSION_NEW_CUSTOMER', value: '7.0', description: 'Commission rate for eligible new customers (%)', category: 'FINANCE' },
    { key: 'COMMISSION_REPEAT_CUSTOMER', value: '2.0', description: 'Commission rate for repeat customer bookings (%)', category: 'FINANCE' },
    { key: 'PILOT_CITY', value: 'Srinagar', description: 'Default active launch territory', category: 'GENERAL' },
    { key: 'CURRENCY', value: 'INR', description: 'Platform primary currency', category: 'FINANCE' },
    { key: 'TIMEZONE', value: 'Asia/Kolkata', description: 'Operating business timezone', category: 'GENERAL' },
    { key: 'AI_RECOMMENDATIONS_ENABLED', value: 'true', description: 'Enable AI-driven beauty and hairstyle matching', category: 'AI' },
    { key: 'AI_HAIRSTYLE_TRYON_ENABLED', value: 'true', description: 'Enable virtual hairstyle camera try-on', category: 'AI' },
    { key: 'CANCELLATION_WINDOW_HOURS', value: '2', description: 'Hours before appointment customer can cancel free of charge', category: 'BOOKINGS' },
  ];

  for (const s of settingsData) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // 4. Service Categories
  const categoriesData = [
    { name: 'Hair', slug: 'hair', description: 'Haircuts, styling, coloring & treatments', icon: 'Scissors', displayOrder: 1 },
    { name: 'Beard & Grooming', slug: 'beard-grooming', description: 'Beard styling, trimming & luxury shaving', icon: 'Sparkles', displayOrder: 2 },
    { name: 'Skin & Beauty', slug: 'skin-beauty', description: 'Facials, cleanups, skin treatments & glow therapy', icon: 'Smile', displayOrder: 3 },
    { name: 'Nails', slug: 'nails', description: 'Manicures, pedicures, nail polish & extensions', icon: 'Heart', displayOrder: 4 },
    { name: 'Makeup', slug: 'makeup', description: 'Bridal, event, and festive makeup', icon: 'Crown', displayOrder: 5 },
    { name: 'Spa & Wellness', slug: 'spa-wellness', description: 'Head massage, aroma therapy & relaxation', icon: 'Feather', displayOrder: 6 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const c = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = c.id;
  }

  // 5. Global Services
  const globalServicesData = [
    // Hair
    { name: 'Classic Precision Haircut', slug: 'classic-haircut', categorySlug: 'hair', basePrice: 400, durationMin: 35, genderTarget: 'UNISEX', description: 'Consultation, wash, tailored cut, and dry styling' },
    { name: 'Signature Hair Wash & Blowout', slug: 'hair-wash-blowout', categorySlug: 'hair', basePrice: 600, durationMin: 40, genderTarget: 'WOMEN', description: 'Cleansing wash with professional volume blow-dry' },
    { name: 'Organic Keratin Smoothing Therapy', slug: 'keratin-treatment', categorySlug: 'hair', basePrice: 3500, durationMin: 120, genderTarget: 'UNISEX', description: 'Frizz-reduction treatment lasting up to 3 months' },
    { name: 'Balayage & Global Hair Color', slug: 'balayage-hair-color', categorySlug: 'hair', basePrice: 4200, durationMin: 150, genderTarget: 'WOMEN', description: 'Hand-painted multidimensional highlights and tone' },
    { name: 'Deep Nourishing Hair Spa', slug: 'deep-hair-spa', categorySlug: 'hair', basePrice: 1200, durationMin: 50, genderTarget: 'UNISEX', description: 'Intensive scalp stimulation and hydrating mask' },
    
    // Beard & Grooming
    { name: 'Beard Sculpting & Hot Towel Shave', slug: 'beard-sculpting-shave', categorySlug: 'beard-grooming', basePrice: 350, durationMin: 30, genderTarget: 'MEN', description: 'Beard trim with razor finish and essential oils' },
    { name: 'Royal Charcoal Beard Detox', slug: 'beard-detox-spa', categorySlug: 'beard-grooming', basePrice: 500, durationMin: 30, genderTarget: 'MEN', description: 'Exfoliation, deep conditioning, and softening balm' },
    { name: 'Gentleman Grooming Combo', slug: 'gentleman-grooming-combo', categorySlug: 'beard-grooming', basePrice: 750, durationMin: 60, genderTarget: 'MEN', description: 'Haircut, beard trim, head massage and ear cleansing' },

    // Skin & Beauty
    { name: 'Gold Radiance Glow Facial', slug: 'gold-radiance-facial', categorySlug: 'skin-beauty', basePrice: 1800, durationMin: 60, genderTarget: 'WOMEN', description: '24K gold serum infusion for radiant wedding-ready skin' },
    { name: 'Hydra-Oxygen Dew Facial', slug: 'hydra-oxygen-facial', categorySlug: 'skin-beauty', basePrice: 2200, durationMin: 60, genderTarget: 'UNISEX', description: 'Non-invasive pore extraction with intense hydration' },
    { name: 'Herbal Anti-Acne Cleanup', slug: 'herbal-acne-cleanup', categorySlug: 'skin-beauty', basePrice: 900, durationMin: 45, genderTarget: 'UNISEX', description: 'Tea tree steam, extraction, and purifying clay mask' },
    { name: 'Instant De-Tan Therapy', slug: 'detan-therapy', categorySlug: 'skin-beauty', basePrice: 650, durationMin: 35, genderTarget: 'UNISEX', description: 'Sun-damage reversal with gentle AHA peeling' },
    { name: 'Full Face Threading & Shaping', slug: 'full-face-threading', categorySlug: 'skin-beauty', basePrice: 300, durationMin: 25, genderTarget: 'WOMEN', description: 'Eyebrow arching, upper lip, forehead, and chin threading' },

    // Nails
    { name: 'Deluxe Rose Petal Pedicure', slug: 'deluxe-pedicure', categorySlug: 'nails', basePrice: 1100, durationMin: 50, genderTarget: 'UNISEX', description: 'Warm floral foot soak, scrub, callused heel smoothing' },
    { name: 'Classic Gel Manicure', slug: 'gel-manicure', categorySlug: 'nails', basePrice: 850, durationMin: 45, genderTarget: 'WOMEN', description: 'Cuticle care, hand massage, and chip-free gel polish' },
    { name: 'Acrylic Nail Extensions & Gel Art', slug: 'acrylic-extensions', categorySlug: 'nails', basePrice: 2500, durationMin: 90, genderTarget: 'WOMEN', description: 'Custom length nail tips with trendy chrome/glitter finish' },
    { name: 'Express Foot Polish & Cleanse', slug: 'express-foot-polish', categorySlug: 'nails', basePrice: 500, durationMin: 30, genderTarget: 'UNISEX', description: 'Nail trim, buff, and fresh color coat' },

    // Makeup
    { name: 'Traditional Kashmiri Bridal Makeup', slug: 'kashmiri-bridal-makeup', categorySlug: 'makeup', basePrice: 15000, durationMin: 180, genderTarget: 'WOMEN', description: 'Complete bridal transformation, jewel placement & hair styling' },
    { name: 'HD Party & Reception Glam', slug: 'hd-party-glam', categorySlug: 'makeup', basePrice: 4500, durationMin: 75, genderTarget: 'WOMEN', description: 'Long-lasting HD airbrush finish for wedding attendees' },
    { name: 'Soft Minimal Day Glam', slug: 'soft-day-glam', categorySlug: 'makeup', basePrice: 2800, durationMin: 60, genderTarget: 'WOMEN', description: 'Dewy skin, soft brown eyes, nude lips, and setting mist' },
    { name: 'Groom Luxury Wedding Styling', slug: 'groom-wedding-styling', categorySlug: 'makeup', basePrice: 3500, durationMin: 60, genderTarget: 'MEN', description: 'Skin de-puffing, beard line-up, and hair fix' },

    // Spa & Wellness
    { name: 'Kashmiri Saffron Head Massage', slug: 'saffron-head-massage', categorySlug: 'spa-wellness', basePrice: 700, durationMin: 35, genderTarget: 'UNISEX', description: 'Warm herbal saffron oil massage with pressure points' },
    { name: 'Aroma Stress Relief Back Therapy', slug: 'aroma-back-therapy', categorySlug: 'spa-wellness', basePrice: 1600, durationMin: 45, genderTarget: 'UNISEX', description: 'Lavender hot oil therapy for chronic neck and back tension' },
    { name: 'Detoxifying Full Body Polishing', slug: 'body-polishing', categorySlug: 'spa-wellness', basePrice: 3800, durationMin: 90, genderTarget: 'WOMEN', description: 'Walnut scrub exfoliation and whole-body moisture seal' },
    { name: 'Foot Reflexology Session', slug: 'foot-reflexology', categorySlug: 'spa-wellness', basePrice: 800, durationMin: 30, genderTarget: 'UNISEX', description: 'Targeted acupressure session relieving fatigue' },
  ];

  const serviceIdList: string[] = [];
  for (const s of globalServicesData) {
    const serv = await prisma.globalService.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        name: s.name,
        slug: s.slug,
        categoryId: categoryMap[s.categorySlug],
        basePrice: s.basePrice,
        durationMin: s.durationMin,
        genderTarget: s.genderTarget,
        description: s.description,
        isActive: true,
      },
    });
    serviceIdList.push(serv.id);
  }

  // 6. Pan-India Salons (44 Salons across 9 Hubs)
  const salonsData = [
    // --- SRINAGAR (10 Salons) ---
    {
      name: 'Chinar Beauty Lounge & Spa',
      slug: 'chinar-beauty-lounge',
      ownerName: 'Farooq Mir',
      ownerEmail: 'farooq.mir@chinarbeauty.example.com',
      ownerPhone: '+919419012345',
      address: 'Near Polo View, The Bund',
      locality: 'Rajbagh',
      city: 'Srinagar',
      rating: 4.8,
      reviewCount: 38,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Kashmir Glow Luxury Salon',
      slug: 'kashmir-glow-luxury',
      ownerName: 'Tabasum Wani',
      ownerEmail: 'tabasum@kashmirglow.example.com',
      ownerPhone: '+919419023456',
      address: 'Main Commercial Complex, Lal Chowk',
      locality: 'Lal Chowk',
      city: 'Srinagar',
      rating: 4.9,
      reviewCount: 52,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Zabarwan Barber & Co.',
      slug: 'zabarwan-barber-co',
      ownerName: 'Bilal Ahmad Dar',
      ownerEmail: 'bilal@zabarwanbarbers.example.com',
      ownerPhone: '+919419034567',
      address: 'Shop 14, Gole Market',
      locality: 'Karan Nagar',
      city: 'Srinagar',
      rating: 4.7,
      reviewCount: 29,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Sheen Bridal & Hair Sanctuary',
      slug: 'sheen-bridal-sanctuary',
      ownerName: 'Nusrat Jahan',
      ownerEmail: 'nusrat@sheenbridal.example.com',
      ownerPhone: '+919419045678',
      address: 'Opposite Convent High School',
      locality: 'Rajbagh',
      city: 'Srinagar',
      rating: 4.9,
      reviewCount: 44,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Dal Lake Aesthetics & Spa',
      slug: 'dal-lake-aesthetics',
      ownerName: 'Javed Lone',
      ownerEmail: 'javed@dallakeaesthetics.example.com',
      ownerPhone: '+919419056789',
      address: 'Boulevard Road, Near Ghat 7',
      locality: 'Dalgate',
      city: 'Srinagar',
      rating: 4.6,
      reviewCount: 21,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Pari Mahal Hair Studio',
      slug: 'pari-mahal-hair-studio',
      ownerName: 'Shabir Rather',
      ownerEmail: 'shabir@parimahalhair.example.com',
      ownerPhone: '+919419067890',
      address: 'Sanat Nagar Chowk',
      locality: 'Sanat Nagar',
      city: 'Srinagar',
      rating: 4.5,
      reviewCount: 18,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Hazratbal Velvet Touch Salon',
      slug: 'hazratbal-velvet-touch',
      ownerName: 'Ruqaya Bano',
      ownerEmail: 'ruqaya@velvettouch.example.com',
      ownerPhone: '+919419078901',
      address: 'University Road, Hazratbal',
      locality: 'Hazratbal',
      city: 'Srinagar',
      rating: 4.4,
      reviewCount: 15,
      applicationStatus: 'APPROVED',
      operationalStatus: 'CLOSED',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Jhelum Grooming Studio',
      slug: 'jhelum-grooming-studio',
      ownerName: 'Aaqib Bhat',
      ownerEmail: 'aaqib@jhelumgrooming.example.com',
      ownerPhone: '+919419089012',
      address: 'Sector 3, Bemina Bypass',
      locality: 'Bemina',
      city: 'Srinagar',
      rating: 4.2,
      reviewCount: 9,
      applicationStatus: 'PENDING',
      operationalStatus: 'CLOSED',
      verificationStatus: 'PENDING',
    },
    {
      name: 'Nishat Glamour Studio',
      slug: 'nishat-glamour-studio',
      ownerName: 'Sameera Sheikh',
      ownerEmail: 'sameera@nishatglam.example.com',
      ownerPhone: '+919419090123',
      address: 'Foreshore Road, Nishat',
      locality: 'Nishat',
      city: 'Srinagar',
      rating: 4.3,
      reviewCount: 11,
      applicationStatus: 'PENDING',
      operationalStatus: 'CLOSED',
      verificationStatus: 'PENDING',
    },
    {
      name: 'Soura City Cuts & Spa',
      slug: 'soura-city-cuts',
      ownerName: 'Tariq Baba',
      ownerEmail: 'tariq@souracitycuts.example.com',
      ownerPhone: '+919419101234',
      address: 'SKIMS Crossing, Soura',
      locality: 'Soura',
      city: 'Srinagar',
      rating: 3.8,
      reviewCount: 6,
      applicationStatus: 'REJECTED',
      operationalStatus: 'CLOSED',
      verificationStatus: 'REJECTED',
      rejectionReason: 'Trade license documentation provided did not match business ownership entity.',
    },

    // --- JAMMU (4 Salons) ---
    {
      name: 'Tawi Luxe Studio & Spa',
      slug: 'tawi-luxe-studio',
      ownerName: 'Rohit Sharma',
      ownerEmail: 'rohit@tawiluxe.example.com',
      ownerPhone: '+919419200001',
      address: 'Apsara Road, Gandhi Nagar',
      locality: 'Gandhi Nagar',
      city: 'Jammu',
      rating: 4.8,
      reviewCount: 34,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Bahu Elegance Salon',
      slug: 'bahu-elegance-salon',
      ownerName: 'Anjali Gupta',
      ownerEmail: 'anjali@bahuelegance.example.com',
      ownerPhone: '+919419200002',
      address: 'North Block, Bahu Plaza',
      locality: 'Bahu Plaza',
      city: 'Jammu',
      rating: 4.7,
      reviewCount: 28,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Royal Dogra Hair Co.',
      slug: 'royal-dogra-hair',
      ownerName: 'Vikram Jamwal',
      ownerEmail: 'vikram@royaldogra.example.com',
      ownerPhone: '+919419200003',
      address: 'Sector 2, Channi Himmat',
      locality: 'Channi Himmat',
      city: 'Jammu',
      rating: 4.6,
      reviewCount: 22,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Jewel Grooming Lounge',
      slug: 'jewel-grooming-lounge',
      ownerName: 'Sunil Kumar',
      ownerEmail: 'sunil@jewelgrooming.example.com',
      ownerPhone: '+919419200004',
      address: 'Near Jewel Chowk Bus Stand',
      locality: 'Jewel Chowk',
      city: 'Jammu',
      rating: 4.3,
      reviewCount: 14,
      applicationStatus: 'PENDING',
      operationalStatus: 'CLOSED',
      verificationStatus: 'PENDING',
    },

    // --- DELHI NCR (6 Salons) ---
    {
      name: 'The Imperial Salon & Spa',
      slug: 'imperial-salon-cp',
      ownerName: 'Rajesh Mehra',
      ownerEmail: 'rajesh@imperialsalon.example.com',
      ownerPhone: '+919811000001',
      address: 'Inner Circle, Connaught Place Block B',
      locality: 'Connaught Place',
      city: 'Delhi NCR',
      rating: 4.9,
      reviewCount: 76,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'South Ex Glamour Lounge',
      slug: 'south-ex-glamour',
      ownerName: 'Pooja Kapoor',
      ownerEmail: 'pooja@southexglam.example.com',
      ownerPhone: '+919811000002',
      address: 'Part 1, Main Market, South Extension',
      locality: 'South Extension',
      city: 'Delhi NCR',
      rating: 4.8,
      reviewCount: 65,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Hauz Khas Artisans Hair Bar',
      slug: 'hauz-khas-artisans',
      ownerName: 'Arjun Sethi',
      ownerEmail: 'arjun@hkartisans.example.com',
      ownerPhone: '+919811000003',
      address: 'Village Road, Hauz Khas',
      locality: 'Hauz Khas',
      city: 'Delhi NCR',
      rating: 4.7,
      reviewCount: 48,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Select City Hair Sanctuary',
      slug: 'select-city-hair',
      ownerName: 'Natasha Verma',
      ownerEmail: 'natasha@selectcityhair.example.com',
      ownerPhone: '+919811000004',
      address: 'District Centre, Saket',
      locality: 'Saket',
      city: 'Delhi NCR',
      rating: 4.8,
      reviewCount: 55,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Cyber Hub Executive Grooming',
      slug: 'cyber-hub-grooming',
      ownerName: 'Kunal Singhal',
      ownerEmail: 'kunal@cyberhubgroom.example.com',
      ownerPhone: '+919811000005',
      address: 'DLF Cyber City, Building 10 Tower B',
      locality: 'DLF Cyber City',
      city: 'Delhi NCR',
      rating: 4.9,
      reviewCount: 82,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Noida Trends Beauty Bar',
      slug: 'noida-trends-beauty',
      ownerName: 'Deepak Tyagi',
      ownerEmail: 'deepak@noidatrends.example.com',
      ownerPhone: '+919811000006',
      address: 'Sector 18 Commercial Market',
      locality: 'Noida Sector 18',
      city: 'Delhi NCR',
      rating: 4.5,
      reviewCount: 30,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },

    // --- MUMBAI (6 Salons) ---
    {
      name: 'Bandra Seaside Glow Salon',
      slug: 'bandra-seaside-glow',
      ownerName: 'Zara D’Souza',
      ownerEmail: 'zara@bandraglow.example.com',
      ownerPhone: '+919820000001',
      address: 'Hill Road, Near Bandra Station',
      locality: 'Bandra West',
      city: 'Mumbai',
      rating: 4.9,
      reviewCount: 94,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Juhu Palm Luxury Spa',
      slug: 'juhu-palm-luxury',
      ownerName: 'Sameer Merchant',
      ownerEmail: 'sameer@juhuluxury.example.com',
      ownerPhone: '+919820000002',
      address: 'Juhu Tara Road, Opp Beach',
      locality: 'Juhu',
      city: 'Mumbai',
      rating: 4.9,
      reviewCount: 88,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Bombay Heritage Barbers',
      slug: 'bombay-heritage-barbers',
      ownerName: 'Farhan Contractor',
      ownerEmail: 'farhan@bombaybarbers.example.com',
      ownerPhone: '+919820000003',
      address: 'Colaba Causeway, Near Regal',
      locality: 'Colaba',
      city: 'Mumbai',
      rating: 4.7,
      reviewCount: 42,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Andheri Star Aesthetics',
      slug: 'andheri-star-aesthetics',
      ownerName: 'Rhea Shah',
      ownerEmail: 'rhea@andheriaesthetics.example.com',
      ownerPhone: '+919820000004',
      address: 'Lokhandwala Complex, Andheri West',
      locality: 'Andheri West',
      city: 'Mumbai',
      rating: 4.8,
      reviewCount: 62,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Hiranandani Velvet Touch',
      slug: 'hiranandani-velvet-touch',
      ownerName: 'Aditya Kulkarni',
      ownerEmail: 'aditya@velvettouchpowai.example.com',
      ownerPhone: '+919820000005',
      address: 'Galleria Mall, Hiranandani Gardens, Powai',
      locality: 'Powai',
      city: 'Mumbai',
      rating: 4.7,
      reviewCount: 50,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Mill District Hair Studio',
      slug: 'mill-district-hair',
      ownerName: 'Tanvi Parekh',
      ownerEmail: 'tanvi@milldistricthair.example.com',
      ownerPhone: '+919820000006',
      address: 'Phoenix Palladium, Lower Parel',
      locality: 'Lower Parel',
      city: 'Mumbai',
      rating: 4.8,
      reviewCount: 71,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },

    // --- BENGALURU (6 Salons) ---
    {
      name: 'Indiranagar Botanicals Hair Spa',
      slug: 'indiranagar-botanicals',
      ownerName: 'Kavitha Rao',
      ownerEmail: 'kavitha@botanicalsblr.example.com',
      ownerPhone: '+919845000001',
      address: '100ft Road, Indiranagar',
      locality: 'Indiranagar',
      city: 'Bengaluru',
      rating: 4.9,
      reviewCount: 89,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Koramangala Velvet Cut',
      slug: 'koramangala-velvet-cut',
      ownerName: 'Pradeep Gowda',
      ownerEmail: 'pradeep@velvetcutblr.example.com',
      ownerPhone: '+919845000002',
      address: '5th Block, Koramangala',
      locality: 'Koramangala',
      city: 'Bengaluru',
      rating: 4.8,
      reviewCount: 73,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Whitefield Techie Glow',
      slug: 'whitefield-techie-glow',
      ownerName: 'Sneha Hegde',
      ownerEmail: 'sneha@whitefieldglow.example.com',
      ownerPhone: '+919845000003',
      address: 'ITPL Main Road, Whitefield',
      locality: 'Whitefield',
      city: 'Bengaluru',
      rating: 4.7,
      reviewCount: 58,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'HSR Gardenia Salon & Lounge',
      slug: 'hsr-gardenia-salon',
      ownerName: 'Manoj Reddy',
      ownerEmail: 'manoj@hsrgardenia.example.com',
      ownerPhone: '+919845000004',
      address: '27th Main Road, Sector 1, HSR Layout',
      locality: 'HSR Layout',
      city: 'Bengaluru',
      rating: 4.8,
      reviewCount: 64,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Trinity High Street Salon',
      slug: 'trinity-high-street',
      ownerName: 'Naveen George',
      ownerEmail: 'naveen@trinitysalon.example.com',
      ownerPhone: '+919845000005',
      address: 'MG Road, Near Metro Station',
      locality: 'MG Road',
      city: 'Bengaluru',
      rating: 4.7,
      reviewCount: 46,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Silicon Valley Bridal Sanctuary',
      slug: 'silicon-valley-bridal',
      ownerName: 'Divya Nambiar',
      ownerEmail: 'divya@svbridal.example.com',
      ownerPhone: '+919845000006',
      address: '15th Cross, 3rd Phase, JP Nagar',
      locality: 'JP Nagar',
      city: 'Bengaluru',
      rating: 4.8,
      reviewCount: 52,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },

    // --- CHANDIGARH (3 Salons) ---
    {
      name: 'City Beautiful Hair Art',
      slug: 'city-beautiful-hair-art',
      ownerName: 'Harpreet Singh',
      ownerEmail: 'harpreet@citybeautifulhair.example.com',
      ownerPhone: '+919872000001',
      address: 'Bridge Market, Sector 17',
      locality: 'Sector 17',
      city: 'Chandigarh',
      rating: 4.8,
      reviewCount: 45,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Sector 35 Prestige Salon',
      slug: 'sector-35-prestige',
      ownerName: 'Simran Walia',
      ownerEmail: 'simran@prestigesalon.example.com',
      ownerPhone: '+919872000002',
      address: 'SCO 142, Sector 35-C',
      locality: 'Sector 35',
      city: 'Chandigarh',
      rating: 4.7,
      reviewCount: 38,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Tricity Crown Studio',
      slug: 'tricity-crown-studio',
      ownerName: 'Gurkirat Dhillon',
      ownerEmail: 'gurkirat@tricitycrown.example.com',
      ownerPhone: '+919872000003',
      address: 'Phase 7 Commercial Zone, Mohali',
      locality: 'Mohali Phase 7',
      city: 'Chandigarh',
      rating: 4.6,
      reviewCount: 29,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },

    // --- JAIPUR (3 Salons) ---
    {
      name: 'Pink City Royal Parlour',
      slug: 'pink-city-royal-parlour',
      ownerName: 'Mahendra Shekhawat',
      ownerEmail: 'mahendra@pinkcityroyal.example.com',
      ownerPhone: '+919829000001',
      address: 'Ashok Marg, C-Scheme',
      locality: 'C-Scheme',
      city: 'Jaipur',
      rating: 4.9,
      reviewCount: 56,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Malviya Amber Beauty Haven',
      slug: 'malviya-amber-beauty',
      ownerName: 'Sunita Rathore',
      ownerEmail: 'sunita@amberbeauty.example.com',
      ownerPhone: '+919829000002',
      address: 'Calgiri Marg, Malviya Nagar',
      locality: 'Malviya Nagar',
      city: 'Jaipur',
      rating: 4.7,
      reviewCount: 40,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Raja Park Velvet Touch',
      slug: 'raja-park-velvet-touch',
      ownerName: 'Nitin Sharma',
      ownerEmail: 'nitin@rajaparkvelvet.example.com',
      ownerPhone: '+919829000003',
      address: 'Lane 2, Raja Park',
      locality: 'Raja Park',
      city: 'Jaipur',
      rating: 4.6,
      reviewCount: 31,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },

    // --- HYDERABAD (3 Salons) ---
    {
      name: 'Nizam Pearl Aesthetics',
      slug: 'nizam-pearl-aesthetics',
      ownerName: 'Ayesha Fatima',
      ownerEmail: 'ayesha@nizampearl.example.com',
      ownerPhone: '+919849000001',
      address: 'Road No 12, Banjara Hills',
      locality: 'Banjara Hills',
      city: 'Hyderabad',
      rating: 4.9,
      reviewCount: 68,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Jubilee Hills Haute Salon',
      slug: 'jubilee-hills-haute',
      ownerName: 'Sanjay Reddy',
      ownerEmail: 'sanjay@jubileehautessalon.example.com',
      ownerPhone: '+919849000002',
      address: 'Road No 36, Jubilee Hills',
      locality: 'Jubilee Hills',
      city: 'Hyderabad',
      rating: 4.8,
      reviewCount: 61,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Cyberabad Glow Bar',
      slug: 'cyberabad-glow-bar',
      ownerName: 'Swathi Chowdary',
      ownerEmail: 'swathi@cyberabadglow.example.com',
      ownerPhone: '+919849000003',
      address: 'Financial District, Gachibowli',
      locality: 'Gachibowli',
      city: 'Hyderabad',
      rating: 4.7,
      reviewCount: 47,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },

    // --- KOLKATA (3 Salons) ---
    {
      name: 'Park Street Renaissance Salon',
      slug: 'park-street-renaissance',
      ownerName: 'Debolina Mukherjee',
      ownerEmail: 'debolina@parkstrenaissance.example.com',
      ownerPhone: '+919830000001',
      address: 'Park Street Crossing, Near Flurys',
      locality: 'Park Street',
      city: 'Kolkata',
      rating: 4.8,
      reviewCount: 60,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Salt Lake Orchid Beauty Studio',
      slug: 'salt-lake-orchid',
      ownerName: 'Subhashis Roy',
      ownerEmail: 'subhashis@orchidbeauty.example.com',
      ownerPhone: '+919830000002',
      address: 'Sector 5, Salt Lake',
      locality: 'Salt Lake',
      city: 'Kolkata',
      rating: 4.7,
      reviewCount: 44,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
    {
      name: 'Ballygunge Manor Spa & Hair',
      slug: 'ballygunge-manor-spa',
      ownerName: 'Ananya Sen',
      ownerEmail: 'ananya@ballygungemanor.example.com',
      ownerPhone: '+919830000003',
      address: 'Ballygunge Circular Road',
      locality: 'Ballygunge',
      city: 'Kolkata',
      rating: 4.8,
      reviewCount: 52,
      applicationStatus: 'APPROVED',
      operationalStatus: 'OPEN',
      verificationStatus: 'VERIFIED',
    },
  ];

  // Clean old transactional tables first to ensure clean state and avoid duplicate key errors
  console.log('Cleaning transactional tables for fresh Pan-India dataset...');
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.review.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.salonService.deleteMany();
  await prisma.salonStaff.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.aIOperation.deleteMany();

  const salonIdList: string[] = [];
  const approvedSalonIdList: string[] = [];

  for (const s of salonsData) {
    const sal = await prisma.salon.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        ownerName: s.ownerName,
        ownerEmail: s.ownerEmail,
        ownerPhone: s.ownerPhone,
        address: s.address,
        locality: s.locality,
        city: s.city,
        rating: s.rating,
        reviewCount: s.reviewCount,
        applicationStatus: s.applicationStatus,
        operationalStatus: s.operationalStatus,
        verificationStatus: s.verificationStatus,
        rejectionReason: s.rejectionReason || null,
      },
      create: {
        name: s.name,
        slug: s.slug,
        ownerName: s.ownerName,
        ownerEmail: s.ownerEmail,
        ownerPhone: s.ownerPhone,
        address: s.address,
        locality: s.locality,
        city: s.city,
        rating: s.rating,
        reviewCount: s.reviewCount,
        applicationStatus: s.applicationStatus,
        operationalStatus: s.operationalStatus,
        verificationStatus: s.verificationStatus,
        rejectionReason: s.rejectionReason || null,
        businessHoursJson: JSON.stringify({
          monday: { open: '09:30', close: '19:30' },
          tuesday: { open: '09:30', close: '19:30' },
          wednesday: { open: '09:30', close: '19:30' },
          thursday: { open: '09:30', close: '19:30' },
          friday: { open: '10:00', close: '20:00' },
          saturday: { open: '09:00', close: '20:00' },
          sunday: { open: '09:00', close: '18:00' },
        }),
      },
    });
    salonIdList.push(sal.id);
    if (sal.applicationStatus === 'APPROVED') {
      approvedSalonIdList.push(sal.id);
    }
  }

  // Update locality salon counts
  const cityLocalityCounts = await prisma.salon.groupBy({
    by: ['cityName' as any, 'locality'] as any,
    _count: { id: true },
  }).catch(async () => {
    return [];
  });

  for (const loc of allLocalities) {
    const count = await prisma.salon.count({
      where: { city: loc.cityName, locality: loc.localityName },
    });
    await prisma.location.updateMany({
      where: { cityName: loc.cityName, localityName: loc.localityName },
      data: { salonCount: count },
    });
  }

  // 7. Salon Staff across all salons
  console.log('Seeding salon stylists and specialists across India...');
  const staffIdList: string[] = [];
  const staffRoles = ['Master Stylist', 'Senior Colorist', 'Bridal Expert', 'Skin Specialist', 'Master Barber', 'Nail Artist'];

  for (let i = 0; i < salonIdList.length; i++) {
    const salonId = salonIdList[i];
    // 2 staff members per salon
    for (let st = 1; st <= 2; st++) {
      const s = await prisma.salonStaff.create({
        data: {
          salonId,
          name: `Staff Specialist ${i * 2 + st}`,
          role: staffRoles[(i + st) % staffRoles.length],
          rating: 4.6 + (st % 4) * 0.1,
          isAvailable: true,
        },
      });
      staffIdList.push(s.id);
    }
  }

  // 8. Salon Services (link global services to salons with local pricing)
  console.log('Linking global beauty services to all partner salons...');
  for (const salonId of salonIdList) {
    for (let j = 0; j < 6; j++) {
      const gServiceId = serviceIdList[(j * 3) % serviceIdList.length];
      await prisma.salonService.create({
        data: {
          salonId,
          globalServiceId: gServiceId,
          customPrice: 450 + (j * 160),
          customDurationMin: 35 + (j % 3) * 15,
          isAvailable: true,
        },
      });
    }
  }

  // 9. Customers across all Indian cities (50 Customers)
  console.log('Seeding diverse pan-India customer base...');
  const customersData = [
    // Srinagar
    { name: 'Aamir Hassan', email: 'aamir.hassan@example.com', phone: '+919419110001', locality: 'Rajbagh', city: 'Srinagar' },
    { name: 'Insha Bashir', email: 'insha.bashir@example.com', phone: '+919419110002', locality: 'Lal Chowk', city: 'Srinagar' },
    { name: 'Zubair Ahmad', email: 'zubair.ahmad@example.com', phone: '+919419110003', locality: 'Karan Nagar', city: 'Srinagar' },
    { name: 'Muntaha Jan', email: 'muntaha.jan@example.com', phone: '+919419110004', locality: 'Sanat Nagar', city: 'Srinagar' },
    { name: 'Kamran Farooq', email: 'kamran.farooq@example.com', phone: '+919419110005', locality: 'Hazratbal', city: 'Srinagar' },
    { name: 'Shabnum Akhtar', email: 'shabnum.akhtar@example.com', phone: '+919419110006', locality: 'Rajbagh', city: 'Srinagar' },
    { name: 'Adnan Tariq', email: 'adnan.tariq@example.com', phone: '+919419110007', locality: 'Bemina', city: 'Srinagar' },
    { name: 'Rabiya Bano', email: 'rabiya.bano@example.com', phone: '+919419110008', locality: 'Soura', city: 'Srinagar' },
    { name: 'Suhail Nazir', email: 'suhail.nazir@example.com', phone: '+919419110009', locality: 'Jawahar Nagar', city: 'Srinagar' },
    { name: 'Mehak Zahoor', email: 'mehak.zahoor@example.com', phone: '+919419110010', locality: 'Dalgate', city: 'Srinagar' },
    // Jammu
    { name: 'Aakash Jamwal', email: 'aakash.jamwal@example.com', phone: '+919419210001', locality: 'Gandhi Nagar', city: 'Jammu' },
    { name: 'Ritika Sharma', email: 'ritika.sharma@example.com', phone: '+919419210002', locality: 'Bahu Plaza', city: 'Jammu' },
    { name: 'Sahil Sambyal', email: 'sahil.sambyal@example.com', phone: '+919419210003', locality: 'Channi Himmat', city: 'Jammu' },
    // Delhi NCR
    { name: 'Rohan Mehra', email: 'rohan.mehra@example.com', phone: '+919811210001', locality: 'Connaught Place', city: 'Delhi NCR' },
    { name: 'Priya Narang', email: 'priya.narang@example.com', phone: '+919811210002', locality: 'South Extension', city: 'Delhi NCR' },
    { name: 'Varun Khanna', email: 'varun.khanna@example.com', phone: '+919811210003', locality: 'Hauz Khas', city: 'Delhi NCR' },
    { name: 'Ananya Sen', email: 'ananya.delhi@example.com', phone: '+919811210004', locality: 'Saket', city: 'Delhi NCR' },
    { name: 'Gaurav Bhasin', email: 'gaurav.bhasin@example.com', phone: '+919811210005', locality: 'DLF Cyber City', city: 'Delhi NCR' },
    { name: 'Simran Bajaj', email: 'simran.bajaj@example.com', phone: '+919811210006', locality: 'Noida Sector 18', city: 'Delhi NCR' },
    // Mumbai
    { name: 'Arman Merchant', email: 'arman.merchant@example.com', phone: '+919820210001', locality: 'Bandra West', city: 'Mumbai' },
    { name: 'Alia Fernandes', email: 'alia.fernandes@example.com', phone: '+919820210002', locality: 'Juhu', city: 'Mumbai' },
    { name: 'Kabir Batliwala', email: 'kabir.batliwala@example.com', phone: '+919820210003', locality: 'Colaba', city: 'Mumbai' },
    { name: 'Tara Deshmukh', email: 'tara.deshmukh@example.com', phone: '+919820210004', locality: 'Andheri West', city: 'Mumbai' },
    { name: 'Nikhil Prabhu', email: 'nikhil.prabhu@example.com', phone: '+919820210005', locality: 'Powai', city: 'Mumbai' },
    { name: 'Roshni Salunkhe', email: 'roshni.salunkhe@example.com', phone: '+919820210006', locality: 'Lower Parel', city: 'Mumbai' },
    // Bengaluru
    { name: 'Siddharth Iyer', email: 'siddharth.iyer@example.com', phone: '+919845210001', locality: 'Indiranagar', city: 'Bengaluru' },
    { name: 'Deepa Hegde', email: 'deepa.hegde@example.com', phone: '+919845210002', locality: 'Koramangala', city: 'Bengaluru' },
    { name: 'Abhinav Nair', email: 'abhinav.nair@example.com', phone: '+919845210003', locality: 'Whitefield', city: 'Bengaluru' },
    { name: 'Shreya Kulkarni', email: 'shreya.kulkarni@example.com', phone: '+919845210004', locality: 'HSR Layout', city: 'Bengaluru' },
    { name: 'Karthik Rao', email: 'karthik.rao@example.com', phone: '+919845210005', locality: 'MG Road', city: 'Bengaluru' },
    { name: 'Tejaswini Bhat', email: 'tejaswini.bhat@example.com', phone: '+919845210006', locality: 'JP Nagar', city: 'Bengaluru' },
    // Chandigarh
    { name: 'Amanpreet Gill', email: 'amanpreet.gill@example.com', phone: '+919872210001', locality: 'Sector 17', city: 'Chandigarh' },
    { name: 'Jasleen Kaur', email: 'jasleen.kaur@example.com', phone: '+919872210002', locality: 'Sector 35', city: 'Chandigarh' },
    { name: 'Gurnoor Sandhu', email: 'gurnoor.sandhu@example.com', phone: '+919872210003', locality: 'Mohali Phase 7', city: 'Chandigarh' },
    // Jaipur
    { name: 'Raghav Shekhawat', email: 'raghav.shekhawat@example.com', phone: '+919829210001', locality: 'C-Scheme', city: 'Jaipur' },
    { name: 'Pooja Chouhan', email: 'pooja.chouhan@example.com', phone: '+919829210002', locality: 'Malviya Nagar', city: 'Jaipur' },
    { name: 'Yashvardhan Tanwar', email: 'yash.tanwar@example.com', phone: '+919829210003', locality: 'Raja Park', city: 'Jaipur' },
    // Hyderabad
    { name: 'Mirza Baig', email: 'mirza.baig@example.com', phone: '+919849210001', locality: 'Banjara Hills', city: 'Hyderabad' },
    { name: 'Harika Varma', email: 'harika.varma@example.com', phone: '+919849210002', locality: 'Jubilee Hills', city: 'Hyderabad' },
    { name: 'Pranay Teja', email: 'pranay.teja@example.com', phone: '+919849210003', locality: 'Gachibowli', city: 'Hyderabad' },
    // Kolkata
    { name: 'Sayantan Bose', email: 'sayantan.bose@example.com', phone: '+919830210001', locality: 'Park Street', city: 'Kolkata' },
    { name: 'Moushumi Banerjee', email: 'moushumi.banerjee@example.com', phone: '+919830210002', locality: 'Salt Lake', city: 'Kolkata' },
    { name: 'Riddhiman Ghosh', email: 'riddhiman.ghosh@example.com', phone: '+919830210003', locality: 'Ballygunge', city: 'Kolkata' },
  ];

  const customerIdList: string[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { email: c.email },
      update: {
        name: c.name,
        phone: c.phone,
        locality: c.locality,
        city: c.city,
      },
      create: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        locality: c.locality,
        city: c.city,
        status: 'ACTIVE',
      },
    });
    customerIdList.push(cust.id);
  }

  // 10. Bookings & Payments across Pan-India Salons (120 Bookings)
  console.log('Generating 120 pan-India bookings across all territories...');
  const paymentMethods = ['UPI', 'CARD', 'NETBANKING', 'CASH'];
  const customerBookingCount: Record<string, number> = {};

  for (let i = 1; i <= 120; i++) {
    const bookingNumber = `BK-${String(i).padStart(4, '0')}`;
    const custIndex = (i * 3) % customerIdList.length;
    const customerId = customerIdList[custIndex];
    const salonIndex = (i * 2) % approvedSalonIdList.length;
    const salonId = approvedSalonIdList[salonIndex];
    const staffId = staffIdList[(i * 3) % staffIdList.length];
    const serviceId = serviceIdList[(i * 5) % serviceIdList.length];

    // Commission rules: 7% new customer, 2% repeat customer
    const isRepeatCustomer = (customerBookingCount[customerId] || 0) > 0;
    customerBookingCount[customerId] = (customerBookingCount[customerId] || 0) + 1;

    const commissionRate = isRepeatCustomer ? 0.02 : 0.07;
    const basePrice = 500 + ((i * 125) % 3600);
    const commissionAmount = Math.round(basePrice * commissionRate * 100) / 100;
    const salonPayoutAmount = Math.round((basePrice - commissionAmount) * 100) / 100;

    let bStatus = 'COMPLETED';
    let pStatus = 'PAID';
    if (i % 9 === 0) {
      bStatus = 'CANCELLED';
      pStatus = 'REFUNDED';
    } else if (i % 14 === 0) {
      bStatus = 'NO_SHOW';
      pStatus = 'PAID';
    } else if (i % 8 === 0) {
      bStatus = 'CONFIRMED';
      pStatus = 'PAID';
    } else if (i % 16 === 0) {
      bStatus = 'PENDING';
      pStatus = 'PENDING';
    }

    const dayOffset = (i % 30) - 18;
    const apptDate = new Date();
    apptDate.setDate(apptDate.getDate() + dayOffset);
    const dateStr = apptDate.toISOString().split('T')[0];
    const hour = 10 + (i % 8);
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        salonId,
        staffId,
        serviceId,
        appointmentDate: dateStr,
        startTime,
        endTime,
        price: basePrice,
        commissionRate,
        commissionAmount,
        salonPayoutAmount,
        bookingStatus: bStatus,
        paymentStatus: pStatus,
        notes: i % 4 === 0 ? 'VIP platform client appointment.' : null,
        cancellationReason: bStatus === 'CANCELLED' ? 'Customer schedule change prior to cut-off window.' : null,
        cancelledBy: bStatus === 'CANCELLED' ? 'CUSTOMER' : null,
      },
    });

    const txNumber = `TXN-${String(10000 + i)}`;
    const payment = await prisma.payment.create({
      data: {
        transactionNumber: txNumber,
        bookingId: booking.id,
        customerId,
        salonId,
        amount: basePrice,
        commissionAmount,
        salonPayoutAmount,
        paymentMethod: paymentMethods[i % paymentMethods.length],
        providerRef: `razorpay_${txNumber.toLowerCase()}`,
        status: pStatus === 'PAID' ? 'SUCCESS' : (pStatus === 'REFUNDED' ? 'REFUNDED' : (pStatus === 'PENDING' ? 'PENDING' : 'FAILED')),
      },
    });

    if (pStatus === 'REFUNDED') {
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          bookingId: booking.id,
          amount: basePrice,
          reason: 'Customer cancelled more than 2 hours in advance as per policy.',
          status: 'PROCESSED',
        },
      });
    }

    // Reviews for completed appointments
    if (bStatus === 'COMPLETED' && i <= 60) {
      const isReported = i % 11 === 0;
      await prisma.review.create({
        data: {
          customerId,
          salonId,
          bookingId: booking.id,
          rating: 4 + (i % 2),
          comment: i % 3 === 0
            ? 'Top tier hygiene and exquisite hair craft. Definitely booking again!'
            : (i % 3 === 1
              ? 'Punctual slot, pristine ambience, and very polite stylists.'
              : 'Exceptional service and seamless digital check-in with StyleSync.'),
          reportStatus: isReported ? 'REPORTED' : 'NORMAL',
          moderationStatus: isReported ? 'UNDER_REVIEW' : 'APPROVED',
          moderationReason: isReported ? 'Flagged by salon owner for review verification.' : null,
        },
      });
    }
  }

  // Update customer spend and counts
  for (const cId of customerIdList) {
    const totalBookings = await prisma.booking.count({ where: { customerId: cId } });
    const paidSum = await prisma.payment.aggregate({
      where: { customerId: cId, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    await prisma.customer.update({
      where: { id: cId },
      data: {
        bookingCount: totalBookings,
        totalSpent: paidSum._sum.amount || 0.0,
      },
    });
  }

  // 11. Support Tickets
  console.log('Generating platform support tickets across territories...');
  const ticketsData = [
    {
      category: 'BOOKING',
      priority: 'HIGH',
      status: 'OPEN',
      subject: 'Reschedule request for Connaught Place Delhi branch',
      description: 'Customer could not attend due to metro delay and wants to move appointment without penalty.',
    },
    {
      category: 'PAYMENT',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      subject: 'UPI deduction double charge inquiry in Mumbai',
      description: 'Customer reports 2 charges for booking on GPay UPI.',
    },
    {
      category: 'REFUND',
      priority: 'HIGH',
      status: 'OPEN',
      subject: 'Refund status pending for cancelled slot in Bengaluru',
      description: 'Cancelled booking, awaiting bank credit reflection.',
    },
    {
      category: 'ACCOUNT',
      priority: 'LOW',
      status: 'CLOSED',
      subject: 'Customer phone number update',
      description: 'Customer requested phone number change.',
    },
    {
      category: 'SALON_DISPUTE',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      subject: 'Price mismatch reported for luxury treatment in Jaipur',
      description: 'Customer charged 200 extra above app listing for haircut.',
    },
    {
      category: 'BOOKING',
      priority: 'MEDIUM',
      status: 'OPEN',
      subject: 'Special stylist request for Srinagar Lal Chowk branch',
      description: 'Requesting Senior Stylist for wedding entourage.',
    },
  ];

  let tCount = 1;
  for (const t of ticketsData) {
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TCK-${String(tCount).padStart(4, '0')}`,
        customerId: customerIdList[tCount % customerIdList.length],
        salonId: salonIdList[tCount % salonIdList.length],
        category: t.category,
        priority: t.priority,
        status: t.status,
        subject: t.subject,
        description: t.description,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'CUSTOMER',
        senderName: 'Registered Customer',
        message: t.description,
      },
    });

    if (t.status === 'IN_PROGRESS' || t.status === 'CLOSED') {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: 'ADMIN',
          senderName: 'StyleSync Support Desk',
          message: 'Hello, our regional territory team is actively reviewing your inquiry.',
        },
      });
    }

    tCount++;
  }

  // 12. Admin Notifications
  const notificationsData = [
    { title: 'New Multi-City Salons Active', message: '44 partner salons across 9 Indian hubs are live on StyleSync.', type: 'SYSTEM_ALERT', relatedEntity: 'Salon' },
    { title: 'Delhi NCR Territory Live', message: '6 high-tier salons in Delhi NCR are taking bookings.', type: 'SALON_APPLICATION', relatedEntity: 'Salon' },
    { title: 'Mumbai Expansion Active', message: 'Bandra, Juhu, and Colaba partner salons connected to map explorer.', type: 'SALON_APPLICATION', relatedEntity: 'Salon' },
    { title: 'Review Reported', message: 'Review flagged for moderation in Jaipur hub.', type: 'REVIEW_REPORT', relatedEntity: 'Review' },
    { title: 'Security Check', message: 'Successful admin login from authorized management network.', type: 'SECURITY_ALERT', relatedEntity: 'Admin' },
    { title: 'AI Recommendation Spike', message: '420 Pan-India beauty recommendations generated in last 24h.', type: 'SYSTEM_ALERT', relatedEntity: 'AIOperation' },
  ];

  for (const notif of notificationsData) {
    await prisma.adminNotification.create({
      data: notif,
    });
  }

  // 13. AI Operations Logs
  const aiOpsData = [
    { operationType: 'RECOMMENDATION', modelUsed: 'gemini-1.5-pro', promptSnippet: 'Recommend anti-frizz winter hair routine for Delhi NCR climate', tokensUsed: 420, latencyMs: 510, status: 'SUCCESS', costEstimateInr: 0.15 },
    { operationType: 'HAIRSTYLE_TRYON', modelUsed: 'gemini-1.5-flash', promptSnippet: 'Segment user face and apply layered bob cut style preview', tokensUsed: 890, latencyMs: 780, status: 'SUCCESS', costEstimateInr: 0.28 },
    { operationType: 'SALON_MATCHING', modelUsed: 'gemini-1.5-flash', promptSnippet: 'Find top rated bridal salons within 5km of Bandra West, Mumbai', tokensUsed: 310, latencyMs: 340, status: 'SUCCESS', costEstimateInr: 0.09 },
    { operationType: 'PHOTO_ANALYSIS', modelUsed: 'gemini-1.5-pro', promptSnippet: 'Analyze scalp condition from submitted close-up photo', tokensUsed: 620, latencyMs: 620, status: 'SUCCESS', costEstimateInr: 0.18 },
    { operationType: 'HAIRSTYLE_TRYON', modelUsed: 'gemini-1.5-flash', promptSnippet: 'Segment user face and apply taper fade cut in Bengaluru', tokensUsed: 750, latencyMs: 910, status: 'SUCCESS', costEstimateInr: 0.24 },
    { operationType: 'RECOMMENDATION', modelUsed: 'gemini-1.5-flash', promptSnippet: 'Match suitable skin treatment for sensitive skin in Srinagar', tokensUsed: 380, latencyMs: 410, status: 'SUCCESS', costEstimateInr: 0.11 },
  ];

  for (const aiOp of aiOpsData) {
    await prisma.aIOperation.create({
      data: aiOp,
    });
  }

  // 14. Audit Log
  const superAdmin = await prisma.admin.findUnique({ where: { email: 'admin@stylesync.in' } });
  if (superAdmin) {
    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'PLATFORM_PAN_INDIA_INITIALIZATION',
        entityType: 'System',
        entityId: 'SYSTEM_PAN_INDIA_EXPANSION',
        detailsJson: JSON.stringify({ message: 'StyleSync Super Admin platform initialized with 44 multi-city salons across India.' }),
      },
    });
  }

  console.log('✅ StyleSync Pan-India Super Admin database successfully seeded with 44 salons across 9 cities!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
