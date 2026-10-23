/**
 * StyleSync demo data.
 * NOTE: All salons below are FICTIONAL DEMO BUSINESSES. They are not real
 * establishments. Data is intentionally curated to show how the StyleSync
 * marketplace surfaces price, distance, availability and service comparison.
 *
 * All salon photographs are royalty-free images sourced via ZAI image-search
 * and re-hosted locally under /salons/.
 */

export type SalonCategory =
  | "Hair"
  | "Beard & Grooming"
  | "Skin & Beauty"
  | "Nails"
  | "Makeup"
  | "Treatments";

export interface SalonService {
  id: string;
  slug?: string;
  name: string;
  duration: string; // e.g. "30-45 min"
  priceFrom: number;
  category: SalonCategory;
}

export interface StaffMember {
  id: string;
  slug?: string;
  name: string;
  role: string;
  rating: number;
  avatarColor: string;
  initials: string;
}

export interface Salon {
  id: string;
  slug?: string;
  name: string;
  tagline: string;
  description: string;
  category: SalonCategory;
  cover: string;          // main cover image
  gallery: string[];      // additional gallery images
  rating: number;
  reviews: number;
  distanceKm: number;
  priceFrom: number;
  openUntil: string;      // e.g. "8:30 PM"
  isOpen: boolean;
  nextSlot: { day: string; time: string };
  popularServices: string[];
  services: SalonService[];
  staff: StaffMember[];
  verified: boolean;
  address: string;
  cancellationPolicy: string;
  features: string[];     // e.g. "AC", "Parking", "Card payments"
  tags: string[];         // discovery tags
}

const PREMIUM = [
  "/salons/salon-29.jpg",
  "/salons/salon-30.jpg",
  "/salons/salon-31.jpg",
  "/salons/salon-32.jpeg",
  "/salons/salon-33.jpg",
  "/salons/salon-34.jpg",
];
const BARBER = [
  "/salons/salon-01.jpeg",
  "/salons/salon-02.jpg",
  "/salons/salon-03.jpg",
  "/salons/salon-04.jpg",
  "/salons/salon-05.jpg",
  "/salons/salon-06.jpeg",
];
const BEAUTY = [
  "/salons/salon-07.jpg",
  "/salons/salon-08.jpg",
  "/salons/salon-09.jpg",
  "/salons/salon-10.jpg",
  "/salons/salon-11.jpg",
  "/salons/salon-12.jpg",
];
const HAIRCUT = [
  "/salons/salon-13.jpg",
  "/salons/salon-14.png",
  "/salons/salon-15.jpeg",
  "/salons/salon-16.jpg",
  "/salons/salon-17.jpg",
  "/salons/salon-18.jpg",
];
const MAKEUP = [
  "/salons/salon-19.png",
  "/salons/salon-20.jpg",
  "/salons/salon-21.jpg",
  "/salons/salon-22.jpg",
  "/salons/salon-23.png",
];
const NAIL = [
  "/salons/salon-24.jpg",
  "/salons/salon-25.jpg",
  "/salons/salon-26.jpg",
  "/salons/salon-27.jpg",
  "/salons/salon-28.jpg",
];

export const salons: Salon[] = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    slug: "premium-roots",
    name: "Premium Roots",
    tagline: "Premium unisex salon & spa",
    description:
      "Premium Roots is a modern unisex salon in the heart of Srinagar, blending contemporary design with traditional grooming expertise. From precision haircuts to advanced facials, our master stylists curate every service around your face shape, hair type and personal style.",
    category: "Hair",
    cover: PREMIUM[0],
    gallery: [PREMIUM[1], BEAUTY[2], HAIRCUT[0], PREMIUM[2]],
    rating: 4.8,
    reviews: 412,
    distanceKm: 1.4,
    priceFrom: 300,
    openUntil: "8:30 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "5:30 PM" },
    popularServices: ["Haircut", "Beard", "Facial"],
    services: [
      { id: "00000000-0000-0000-0002-000000000001", slug: "pr-1", name: "Signature Haircut", duration: "30-45 min", priceFrom: 300, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000002", slug: "pr-2", name: "Beard Shaping", duration: "20-30 min", priceFrom: 200, category: "Beard & Grooming" },
      { id: "00000000-0000-0000-0002-000000000003", slug: "pr-3", name: "Luxury Facial", duration: "45-60 min", priceFrom: 800, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000004", slug: "pr-4", name: "Hair Spa & Wash", duration: "30 min", priceFrom: 450, category: "Treatments" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000001", slug: "pr-s1", name: "Aamir Bhat", role: "Master Stylist", rating: 4.9, avatarColor: "#0B91B5", initials: "AB" },
      { id: "00000000-0000-0000-0003-000000000002", slug: "pr-s2", name: "Sana Khan", role: "Senior Esthetician", rating: 4.8, avatarColor: "#1D4653", initials: "SK" },
      { id: "00000000-0000-0000-0003-000000000003", slug: "pr-s3", name: "Imran Shah", role: "Barber Specialist", rating: 4.7, avatarColor: "#18AFC7", initials: "IS" },
    ],
    verified: true,
    address: "Residency Road, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 2 hours before the appointment.",
    features: ["Air-conditioned", "Card payments", "Online booking", "Wheelchair accessible"],
    tags: ["Premium", "Unisex", "Facials", "Hair spa"],
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    slug: "royal-roots",
    name: "Royal Roots",
    tagline: "Heritage barber & grooming lounge",
    description:
      "Royal Roots brings old-world barber craftsmanship into a warm, wood-panelled lounge. Hot-towel shaves, classic scissor cuts and beard sculpting by barbers who treat every chair like a throne.",
    category: "Beard & Grooming",
    cover: BARBER[0],
    gallery: [BARBER[1], BARBER[2], BARBER[3], HAIRCUT[2]],
    rating: 4.7,
    reviews: 318,
    distanceKm: 0.9,
    priceFrom: 250,
    openUntil: "9:00 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "4:00 PM" },
    popularServices: ["Haircut", "Beard sculpt", "Hot shave"],
    services: [
      { id: "00000000-0000-0000-0002-000000000005", slug: "rr-1", name: "Classic Haircut", duration: "30 min", priceFrom: 250, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000006", slug: "rr-2", name: "Beard Sculpt & Trim", duration: "20 min", priceFrom: 180, category: "Beard & Grooming" },
      { id: "00000000-0000-0000-0002-000000000007", slug: "rr-3", name: "Hot Towel Shave", duration: "30-40 min", priceFrom: 320, category: "Beard & Grooming" },
      { id: "00000000-0000-0000-0002-000000000008", slug: "rr-4", name: "Head Massage", duration: "20 min", priceFrom: 150, category: "Treatments" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000004", slug: "rr-s1", name: "Bilal Ahmad", role: "Master Barber", rating: 4.9, avatarColor: "#10232D", initials: "BA" },
      { id: "00000000-0000-0000-0003-000000000005", slug: "rr-s2", name: "Hamid Sheikh", role: "Barber", rating: 4.6, avatarColor: "#163440", initials: "HS" },
    ],
    verified: true,
    address: "Lal Chowk, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 1 hour before the appointment.",
    features: ["Walk-ins welcome", "Cash & UPI", "Traditional shaves"],
    tags: ["Barber", "Men's grooming", "Shaves", "Heritage"],
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    slug: "kashmir-beauty-studio",
    name: "Kashmir Beauty Studio",
    tagline: "Skin-first beauty & facial studio",
    description:
      "A clinical-yet-calm beauty studio focused on skin health. Each facial begins with a dermoscope consultation, followed by treatments tailored to your skin barrier, climate and lifestyle.",
    category: "Skin & Beauty",
    cover: BEAUTY[0],
    gallery: [BEAUTY[1], BEAUTY[3], MAKEUP[0], BEAUTY[4]],
    rating: 4.9,
    reviews: 286,
    distanceKm: 1.8,
    priceFrom: 500,
    openUntil: "7:30 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "6:00 PM" },
    popularServices: ["HydraFacial", "Skin consult", "Cleanup"],
    services: [
      { id: "00000000-0000-0000-0002-000000000009", slug: "kb-1", name: "Signature HydraFacial", duration: "60 min", priceFrom: 1500, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000010", slug: "kb-2", name: "Skin Consult + Cleanup", duration: "45 min", priceFrom: 700, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000011", slug: "kb-3", name: "Anti-tan Facial", duration: "45 min", priceFrom: 900, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000012", slug: "kb-4", name: "Threading", duration: "10 min", priceFrom: 80, category: "Skin & Beauty" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000006", slug: "kb-s1", name: "Dr. Hiba Roshan", role: "Dermatologist", rating: 4.9, avatarColor: "#0B91B5", initials: "HR" },
      { id: "00000000-0000-0000-0003-000000000007", slug: "kb-s2", name: "Mehreen Bhat", role: "Beauty Therapist", rating: 4.8, avatarColor: "#1D4653", initials: "MB" },
    ],
    verified: true,
    address: "Rajbagh, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 4 hours before the appointment.",
    features: ["Skin consultation", "Vegan products", "Appointment only"],
    tags: ["Facial", "Skincare", "Dermatology", "Bridal prep"],
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    slug: "glow-grace",
    name: "Glow & Grace",
    tagline: "Bridal & party makeup studio",
    description:
      "Glow & Grace specialises in HD bridal and party makeup, with a colour-true lighting studio that ensures your look holds up on camera and in person. Bridal trials, draping and on-site service available.",
    category: "Makeup",
    cover: MAKEUP[1],
    gallery: [MAKEUP[2], MAKEUP[3], MAKEUP[4], BEAUTY[5]],
    rating: 4.8,
    reviews: 192,
    distanceKm: 2.4,
    priceFrom: 1200,
    openUntil: "8:00 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "7:00 PM" },
    popularServices: ["Bridal makeup", "Party glam", "HD makeup"],
    services: [
      { id: "00000000-0000-0000-0002-000000000013", slug: "gg-1", name: "Bridal HD Makeup", duration: "90 min", priceFrom: 4500, category: "Makeup" },
      { id: "00000000-0000-0000-0002-000000000014", slug: "gg-2", name: "Party Glam", duration: "45 min", priceFrom: 1500, category: "Makeup" },
      { id: "00000000-0000-0000-0002-000000000015", slug: "gg-3", name: "Engagement Look", duration: "60 min", priceFrom: 2500, category: "Makeup" },
      { id: "00000000-0000-0000-0002-000000000016", slug: "gg-4", name: "Saree Draping", duration: "20 min", priceFrom: 400, category: "Makeup" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000008", slug: "gg-s1", name: "Ananya Kaul", role: "Lead Makeup Artist", rating: 4.9, avatarColor: "#29434D", initials: "AK" },
      { id: "00000000-0000-0000-0003-000000000009", slug: "gg-s2", name: "Saima Lone", role: "Makeup Artist", rating: 4.7, avatarColor: "#28C4DC", initials: "SL" },
    ],
    verified: true,
    address: "Zero Bridge, Srinagar, J&K",
    cancellationPolicy: "50% non-refundable booking fee for bridal services.",
    features: ["HD makeup", "On-site service", "Bridal trials"],
    tags: ["Bridal", "Makeup", "Party", "HD makeup"],
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "urban-groom",
    name: "Urban Groom",
    tagline: "Modern men's grooming salon",
    description:
      "Urban Groom is a fast-paced men's salon built around precision fades, beard design and quick midday touch-ups. Online booking, slot reminders and a loyalty program for repeat clients.",
    category: "Beard & Grooming",
    cover: BARBER[4],
    gallery: [BARBER[5], HAIRCUT[3], BARBER[1], HAIRCUT[4]],
    rating: 4.6,
    reviews: 245,
    distanceKm: 0.6,
    priceFrom: 200,
    openUntil: "10:00 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "3:30 PM" },
    popularServices: ["Fade haircut", "Beard design", "Spa head massage"],
    services: [
      { id: "00000000-0000-0000-0000-000000000002", slug: "ug-1", name: "Skin Fade", duration: "30-40 min", priceFrom: 250, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000017", slug: "ug-2", name: "Beard Design", duration: "20 min", priceFrom: 200, category: "Beard & Grooming" },
      { id: "00000000-0000-0000-0002-000000000018", slug: "ug-3", name: "Head Massage", duration: "15 min", priceFrom: 120, category: "Treatments" },
      { id: "00000000-0000-0000-0002-000000000019", slug: "ug-4", name: "Hair Wash & Style", duration: "15 min", priceFrom: 100, category: "Hair" },
    ],
    staff: [
      { id: "00000000-0000-0000-0000-000000000003", slug: "ug-s1", name: "Arslan Dar", role: "Senior Barber", rating: 4.8, avatarColor: "#0B91B5", initials: "AD" },
      { id: "00000000-0000-0000-0003-000000000010", slug: "ug-s2", name: "Suhail Wani", role: "Barber", rating: 4.5, avatarColor: "#29434D", initials: "SW" },
    ],
    verified: false,
    address: "Karannagar, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 1 hour before the appointment.",
    features: ["Open till 10 PM", "Walk-ins", "Loyalty program"],
    tags: ["Men's", "Fades", "Beard", "Quick service"],
  },
  {
    id: "00000000-0000-0000-0001-000000000006",
    slug: "style-lounge",
    name: "Style Lounge",
    tagline: "Unisex styling & colour studio",
    description:
      "Style Lounge is a colour-forward unisex salon specialising in global hair colour, balayage, keratin treatments and event-ready styling. Free colour consultation included with every booking.",
    category: "Hair",
    cover: PREMIUM[3],
    gallery: [PREMIUM[4], PREMIUM[5], HAIRCUT[5], MAKEUP[1]],
    rating: 4.7,
    reviews: 173,
    distanceKm: 2.1,
    priceFrom: 350,
    openUntil: "8:30 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "5:00 PM" },
    popularServices: ["Balayage", "Keratin", "Haircut & style"],
    services: [
      { id: "00000000-0000-0000-0002-000000000020", slug: "sl-1", name: "Haircut & Style", duration: "45 min", priceFrom: 350, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000021", slug: "sl-2", name: "Global Hair Colour", duration: "90-120 min", priceFrom: 1800, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000022", slug: "sl-3", name: "Balayage", duration: "150 min", priceFrom: 3500, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000023", slug: "sl-4", name: "Keratin Treatment", duration: "120 min", priceFrom: 4000, category: "Treatments" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000011", slug: "sl-s1", name: "Ria Mahajan", role: "Colour Director", rating: 4.9, avatarColor: "#28C4DC", initials: "RM" },
      { id: "00000000-0000-0000-0003-000000000012", slug: "sl-s2", name: "Tariq Bhat", role: "Senior Stylist", rating: 4.7, avatarColor: "#0B91B5", initials: "TB" },
    ],
    verified: true,
    address: "Boulevard Road, Srinagar, J&K",
    cancellationPolicy: "Colour bookings require 24h notice for cancellation.",
    features: ["Free consultation", "Vegan colour", "Hair spa"],
    tags: ["Unisex", "Hair colour", "Balayage", "Keratin"],
  },
  {
    id: "00000000-0000-0000-0001-000000000007",
    slug: "elegance-studio",
    name: "Elegance Studio",
    tagline: "Facial, waxing & threading studio",
    description:
      "Elegance Studio is a calm, women-focused beauty studio for routine maintenance and event prep. Threading, waxing, facials and clean-ups in a quiet, hygienic space.",
    category: "Skin & Beauty",
    cover: BEAUTY[2],
    gallery: [BEAUTY[3], BEAUTY[4], MAKEUP[2], NAIL[0]],
    rating: 4.6,
    reviews: 158,
    distanceKm: 1.5,
    priceFrom: 250,
    openUntil: "7:00 PM",
    isOpen: false,
    nextSlot: { day: "Tomorrow", time: "10:00 AM" },
    popularServices: ["Threading", "Waxing", "Cleanup"],
    services: [
      { id: "00000000-0000-0000-0002-000000000024", slug: "es-1", name: "Full Face Threading", duration: "15 min", priceFrom: 120, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000025", slug: "es-2", name: "Full Arms Wax", duration: "20 min", priceFrom: 250, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000026", slug: "es-3", name: "Fruit Cleanup", duration: "30 min", priceFrom: 500, category: "Skin & Beauty" },
      { id: "00000000-0000-0000-0002-000000000027", slug: "es-4", name: "De-tan Facial", duration: "45 min", priceFrom: 700, category: "Skin & Beauty" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000013", slug: "es-s1", name: "Nusrat Jan", role: "Beauty Therapist", rating: 4.7, avatarColor: "#1D4653", initials: "NJ" },
      { id: "00000000-0000-0000-0003-000000000014", slug: "es-s2", name: "Pooja Raina", role: "Waxing Specialist", rating: 4.6, avatarColor: "#163440", initials: "PR" },
    ],
    verified: false,
    address: "Indira Nagar, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 2 hours before the appointment.",
    features: ["Women only", "Hygiene certified", "Vegan wax"],
    tags: ["Threading", "Waxing", "Cleanup", "Women only"],
  },
  {
    id: "00000000-0000-0000-0001-000000000008",
    slug: "groom-room",
    name: "The Groom Room",
    tagline: "Quick men's haircut & shave bar",
    description:
      "The Groom Room is built for speed without compromise — a no-frills men's bar with skilled barbers, fixed slots and transparent pricing. In and out in under 30 minutes, guaranteed.",
    category: "Hair",
    cover: HAIRCUT[1],
    gallery: [HAIRCUT[2], HAIRCUT[3], BARBER[2], HAIRCUT[4]],
    rating: 4.5,
    reviews: 134,
    distanceKm: 2.8,
    priceFrom: 180,
    openUntil: "9:30 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "6:30 PM" },
    popularServices: ["Quick cut", "Buzz cut", "Edge shave"],
    services: [
      { id: "00000000-0000-0000-0002-000000000028", slug: "gr-1", name: "Quick Haircut", duration: "20 min", priceFrom: 180, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000029", slug: "gr-2", name: "Buzz Cut", duration: "15 min", priceFrom: 150, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000030", slug: "gr-3", name: "Edge Shave", duration: "15 min", priceFrom: 120, category: "Beard & Grooming" },
      { id: "00000000-0000-0000-0002-000000000031", slug: "gr-4", name: "Cut + Beard Combo", duration: "35 min", priceFrom: 320, category: "Hair" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000015", slug: "gr-s1", name: "Zahid Bhat", role: "Barber", rating: 4.6, avatarColor: "#0B91B5", initials: "ZB" },
      { id: "00000000-0000-0000-0003-000000000016", slug: "gr-s2", name: "Aadil Khan", role: "Barber", rating: 4.5, avatarColor: "#18AFC7", initials: "AK" },
    ],
    verified: false,
    address: "Hyderpora, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 1 hour before the appointment.",
    features: ["Quick service", "Fixed slots", "Combo pricing"],
    tags: ["Men's", "Quick", "Buzz cut", "Combos"],
  },
  {
    id: "00000000-0000-0000-0001-000000000009",
    slug: "aura-beauty",
    name: "Aura Beauty",
    tagline: "Bridal, pre-bridal & nail atelier",
    description:
      "Aura Beauty is a one-stop studio for pre-bridal journeys and statement nails. From soak-off gels to multi-day pre-bridal glow programs, every package is built around your event calendar.",
    category: "Nails",
    cover: NAIL[1],
    gallery: [NAIL[2], NAIL[3], MAKEUP[3], NAIL[4]],
    rating: 4.7,
    reviews: 117,
    distanceKm: 3.2,
    priceFrom: 800,
    openUntil: "8:00 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "7:30 PM" },
    popularServices: ["Gel nails", "Bridal prep", "Nail art"],
    services: [
      { id: "00000000-0000-0000-0002-000000000032", slug: "au-1", name: "Gel Manicure", duration: "45 min", priceFrom: 800, category: "Nails" },
      { id: "00000000-0000-0000-0002-000000000033", slug: "au-2", name: "Nail Art (per nail)", duration: "10 min", priceFrom: 80, category: "Nails" },
      { id: "00000000-0000-0000-0002-000000000035", slug: "au-3", name: "Pre-bridal Glow (5-day)", duration: "Multi-day", priceFrom: 9000, category: "Makeup" },
      { id: "00000000-0000-0000-0002-000000000034", slug: "au-4", name: "Pedicure Spa", duration: "45 min", priceFrom: 700, category: "Nails" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000017", slug: "au-s1", name: "Nimrata Singh", role: "Nail Artist", rating: 4.8, avatarColor: "#29434D", initials: "NS" },
      { id: "00000000-0000-0000-0003-000000000018", slug: "au-s2", name: "Ayesha Roshan", role: "Bridal Artist", rating: 4.9, avatarColor: "#28C4DC", initials: "AR" },
    ],
    verified: true,
    address: "Sanat Nagar, Srinagar, J&K",
    cancellationPolicy: "Pre-bridal packages are non-refundable once started.",
    features: ["Nail atelier", "Pre-bridal", "Vegan products"],
    tags: ["Nails", "Bridal", "Nail art", "Pre-bridal"],
  },
  {
    id: "00000000-0000-0000-0001-000000000010",
    slug: "style-hub",
    name: "The Style Hub",
    tagline: "Full-service unisex salon & spa",
    description:
      "The Style Hub is a full-service destination salon with hair, skin, nails and spa under one roof. Built for families, groups and weekend self-care sessions with simultaneous multi-stylist bookings.",
    category: "Hair",
    cover: PREMIUM[1],
    gallery: [PREMIUM[2], PREMIUM[4], BEAUTY[1], HAIRCUT[0]],
    rating: 4.6,
    reviews: 209,
    distanceKm: 3.6,
    priceFrom: 300,
    openUntil: "9:00 PM",
    isOpen: true,
    nextSlot: { day: "Today", time: "8:00 PM" },
    popularServices: ["Family haircut", "Spa day", "Hair colour"],
    services: [
      { id: "00000000-0000-0000-0002-000000000036", slug: "sh-1", name: "Family Haircut (4 pax)", duration: "60 min", priceFrom: 1100, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000037", slug: "sh-2", name: "Spa Day Package", duration: "120 min", priceFrom: 2500, category: "Treatments" },
      { id: "00000000-0000-0000-0002-000000000038", slug: "sh-3", name: "Global Colour", duration: "90 min", priceFrom: 1600, category: "Hair" },
      { id: "00000000-0000-0000-0002-000000000039", slug: "sh-4", name: "Bridal Mehandi", duration: "120 min", priceFrom: 2500, category: "Makeup" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000019", slug: "sh-s1", name: "Vikram Khanna", role: "Salon Director", rating: 4.7, avatarColor: "#0B91B5", initials: "VK" },
      { id: "00000000-0000-0000-0003-000000000020", slug: "sh-s2", name: "Shazia Bhat", role: "Spa Lead", rating: 4.6, avatarColor: "#1D4653", initials: "SB" },
    ],
    verified: true,
    address: "Bemina Crossing, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 4 hours before the appointment.",
    features: ["Family bookings", "Multi-stylist", "Free parking"],
    tags: ["Unisex", "Family", "Spa", "Hair colour"],
  },
];

export interface PopularService {
  id: string;
  name: string;
  duration: string;
  priceFrom: number;
  priceTo?: number;
  category: SalonCategory;
  salonsAvailable: number;
  icon: string; // lucide icon name
}

export const popularServices: PopularService[] = [
  { id: "ps-haircut", name: "Haircut", duration: "30-45 min", priceFrom: 300, priceTo: 600, category: "Hair", salonsAvailable: 12, icon: "Scissors" },
  { id: "ps-beard", name: "Beard Styling", duration: "20-30 min", priceFrom: 200, category: "Beard & Grooming", salonsAvailable: 9, icon: "User" },
  { id: "ps-facial", name: "Facial", duration: "45-60 min", priceFrom: 500, priceTo: 1500, category: "Skin & Beauty", salonsAvailable: 7, icon: "Sparkles" },
  { id: "ps-colour", name: "Hair Colour", duration: "90-120 min", priceFrom: 800, priceTo: 3500, category: "Hair", salonsAvailable: 6, icon: "Palette" },
  { id: "ps-bridal", name: "Bridal Makeup", duration: "90 min", priceFrom: 3000, category: "Makeup", salonsAvailable: 4, icon: "Crown" },
  { id: "ps-nails", name: "Gel Nails", duration: "45 min", priceFrom: 800, category: "Nails", salonsAvailable: 5, icon: "Hand" },
  { id: "ps-keratin", name: "Keratin Treatment", duration: "120 min", priceFrom: 4000, category: "Treatments", salonsAvailable: 3, icon: "Waves" },
  { id: "ps-shave", name: "Hot Shave", duration: "30 min", priceFrom: 320, category: "Beard & Grooming", salonsAvailable: 6, icon: "Wind" },
];

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  services: number;
  salons: number;
  tint: string; // background tint for the icon
}

export const serviceCategories: ServiceCategory[] = [
  { id: "cat-hair", name: "Hair", description: "Explore hair services", icon: "Scissors", services: 24, salons: 12, tint: "#0B91B5" },
  { id: "cat-beard", name: "Beard & Grooming", description: "Find grooming services", icon: "User", services: 14, salons: 9, tint: "#18AFC7" },
  { id: "cat-skin", name: "Skin & Beauty", description: "Explore facial & beauty", icon: "Sparkles", services: 18, salons: 7, tint: "#28C4DC" },
  { id: "cat-nails", name: "Nails", description: "Manicure & nail art", icon: "Hand", services: 11, salons: 5, tint: "#163440" },
  { id: "cat-makeup", name: "Makeup", description: "Find makeup services", icon: "Palette", services: 16, salons: 4, tint: "#1D4653" },
  { id: "cat-treatments", name: "Treatments", description: "Keratin, spa & more", icon: "Waves", services: 9, salons: 6, tint: "#29434D" },
  { id: "cat-grooming", name: "Grooming", description: "Quick men's packages", icon: "Wind", services: 8, salons: 8, tint: "#10232D" },
  { id: "cat-more", name: "More", description: "Bridal, spa & henna", icon: "Crown", services: 12, salons: 4, tint: "#1D4653" },
];

export interface TimeSlot {
  time: string;
  status: "available" | "booked" | "limited";
}

export const todaySlots: TimeSlot[] = [
  { time: "4:00 PM", status: "available" },
  { time: "4:30 PM", status: "available" },
  { time: "5:00 PM", status: "booked" },
  { time: "5:30 PM", status: "available" },
  { time: "6:00 PM", status: "limited" },
  { time: "6:30 PM", status: "available" },
  { time: "7:00 PM", status: "available" },
  { time: "7:30 PM", status: "booked" },
];

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export const SALON_UUID_MAP: Record<string, string> = {
  "premium-roots": "00000000-0000-0000-0001-000000000001",
  "royal-roots": "00000000-0000-0000-0001-000000000002",
  "kashmir-beauty-studio": "00000000-0000-0000-0001-000000000003",
  "glow-grace": "00000000-0000-0000-0001-000000000004",
  "urban-groom": "00000000-0000-0000-0000-000000000001",
  "style-lounge": "00000000-0000-0000-0001-000000000006",
  "elegance-studio": "00000000-0000-0000-0001-000000000007",
  "groom-room": "00000000-0000-0000-0001-000000000008",
  "aura-beauty": "00000000-0000-0000-0001-000000000009",
  "style-hub": "00000000-0000-0000-0001-000000000010"
};

export function getSalonById(id: string): Salon | undefined {
  if (!id) return undefined;
  return salons.find(
    (s) => s.id === id || s.slug === id || SALON_UUID_MAP[id] === s.id
  );
}

export function ratingStars(rating: number): { full: number; half: boolean; empty: number } {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}
