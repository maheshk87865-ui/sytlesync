/**
 * SQLite seed script — populates the test DB with complete demo data
 * for all 10 salons so the customer app operates on real persisted records.
 *
 * Usage:
 *   npx ts-node --transpile-only prisma/seed-sqlite.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_HOURS = {
  mon: { open: "08:00", close: "22:00" },
  tue: { open: "08:00", close: "22:00" },
  wed: { open: "08:00", close: "22:00" },
  thu: { open: "08:00", close: "22:00" },
  fri: { open: "08:00", close: "22:00" },
  sat: { open: "08:00", close: "22:00" },
  sun: { open: "09:00", close: "21:00" },
};

const STANDARD_WORKING_HOURS = {
  mon: { start: "08:00", end: "22:00" },
  tue: { start: "08:00", end: "22:00" },
  wed: { start: "08:00", end: "22:00" },
  thu: { start: "08:00", end: "22:00" },
  fri: { start: "08:00", end: "22:00" },
  sat: { start: "08:00", end: "22:00" },
  sun: { start: "09:00", end: "21:00" },
  start: "08:00",
  end: "22:00",
};

interface SeedStaff {
  id: string;
  name: string;
  role: string;
  rating: number;
  avatarColor: string;
  initials: string;
  yearsExperience: number;
  bio: string;
}

interface SeedService {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMin: number;
  durationLabel: string;
  priceFrom: number;
  priceTo?: number;
  popular?: boolean;
}

interface SeedSalon {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  coverImage: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  distanceKm: number;
  priceFrom: number;
  openUntil: string;
  isOpen: boolean;
  verified: boolean;
  city: string;
  area: string;
  address: string;
  cancellationPolicy: string;
  amenities: string[];
  services: SeedService[];
  staff: SeedStaff[];
}

const SEED_SALONS: SeedSalon[] = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    name: "Premium Roots",
    tagline: "Premium unisex salon & spa",
    description: "Premium Roots is a modern unisex salon in the heart of Srinagar, blending contemporary design with traditional grooming expertise. From precision haircuts to advanced facials, our master stylists curate every service around your face shape, hair type and personal style.",
    category: "Hair",
    coverImage: "/salons/salon-29.jpg",
    gallery: ["/salons/salon-30.jpg", "/salons/salon-09.jpg", "/salons/salon-13.jpg", "/salons/salon-31.jpg"],
    rating: 4.8,
    reviewCount: 412,
    distanceKm: 1.4,
    priceFrom: 300,
    openUntil: "20:30",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Residency Road",
    address: "Residency Road, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 2 hours before the appointment.",
    amenities: ["Air-conditioned", "Card payments", "Online booking", "Wheelchair accessible"],
    services: [
      { id: "00000000-0000-0000-0002-000000000001", name: "Signature Haircut", durationMin: 45, durationLabel: "30-45 min", priceFrom: 300, priceTo: 450, category: "Hair", description: "Precision tailored haircut with wash and style", popular: true },
      { id: "00000000-0000-0000-0002-000000000002", name: "Beard Shaping", durationMin: 30, durationLabel: "20-30 min", priceFrom: 200, priceTo: 300, category: "Beard & Grooming", description: "Beard trim, shape, and hot oil conditioning" },
      { id: "00000000-0000-0000-0002-000000000003", name: "Luxury Facial", durationMin: 60, durationLabel: "45-60 min", priceFrom: 800, priceTo: 1200, category: "Skin & Beauty", description: "Deep cleansing and brightening facial", popular: true },
      { id: "00000000-0000-0000-0002-000000000004", name: "Hair Spa & Wash", durationMin: 30, durationLabel: "30 min", priceFrom: 450, priceTo: 600, category: "Treatments", description: "Intense conditioning and scalp massage" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000001", name: "Aamir Bhat", role: "Master Stylist", rating: 4.9, avatarColor: "#0B91B5", initials: "AB", yearsExperience: 10, bio: "Senior creative stylist" },
      { id: "00000000-0000-0000-0003-000000000002", name: "Sana Khan", role: "Senior Esthetician", rating: 4.8, avatarColor: "#1D4653", initials: "SK", yearsExperience: 7, bio: "Skincare and facial expert" },
      { id: "00000000-0000-0000-0003-000000000003", name: "Imran Shah", role: "Barber Specialist", rating: 4.7, avatarColor: "#18AFC7", initials: "IS", yearsExperience: 5, bio: "Fades and classic cuts" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    name: "Royal Roots",
    tagline: "Heritage barber & grooming lounge",
    description: "Royal Roots brings old-world barber craftsmanship into a warm, wood-panelled lounge. Hot-towel shaves, classic scissor cuts and beard sculpting by barbers who treat every chair like a throne.",
    category: "Beard & Grooming",
    coverImage: "/salons/salon-01.jpeg",
    gallery: ["/salons/salon-02.jpg", "/salons/salon-03.jpg", "/salons/salon-04.jpg", "/salons/salon-15.jpeg"],
    rating: 4.7,
    reviewCount: 318,
    distanceKm: 0.9,
    priceFrom: 250,
    openUntil: "21:00",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Lal Chowk",
    address: "Lal Chowk, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 1 hour before the appointment.",
    amenities: ["Walk-ins welcome", "Cash & UPI", "Traditional shaves"],
    services: [
      { id: "00000000-0000-0000-0002-000000000005", name: "Classic Haircut", durationMin: 30, durationLabel: "30 min", priceFrom: 250, priceTo: 350, category: "Hair", description: "Timeless gentleman haircut" },
      { id: "00000000-0000-0000-0002-000000000006", name: "Beard Sculpt & Trim", durationMin: 20, durationLabel: "20 min", priceFrom: 180, priceTo: 250, category: "Beard & Grooming", description: "Precision line-up and scissor trim" },
      { id: "00000000-0000-0000-0002-000000000007", name: "Hot Towel Shave", durationMin: 35, durationLabel: "30-40 min", priceFrom: 320, priceTo: 400, category: "Beard & Grooming", description: "Traditional straight razor hot towel shave", popular: true },
      { id: "00000000-0000-0000-0002-000000000008", name: "Head Massage", durationMin: 20, durationLabel: "20 min", priceFrom: 150, priceTo: 200, category: "Treatments", description: "Relaxing herbal oil head massage" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000004", name: "Bilal Ahmad", role: "Master Barber", rating: 4.9, avatarColor: "#10232D", initials: "BA", yearsExperience: 12, bio: "Master of hot towel shaves" },
      { id: "00000000-0000-0000-0003-000000000005", name: "Hamid Sheikh", role: "Barber", rating: 4.6, avatarColor: "#163440", initials: "HS", yearsExperience: 6, bio: "Precision scissor cutter" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    name: "Kashmir Beauty Studio",
    tagline: "Skin-first beauty & facial studio",
    description: "A clinical-yet-calm beauty studio focused on skin health. Each facial begins with a dermoscope consultation, followed by treatments tailored to your skin barrier, climate and lifestyle.",
    category: "Skin & Beauty",
    coverImage: "/salons/salon-07.jpg",
    gallery: ["/salons/salon-08.jpg", "/salons/salon-10.jpg", "/salons/salon-19.png", "/salons/salon-11.jpg"],
    rating: 4.9,
    reviewCount: 286,
    distanceKm: 1.8,
    priceFrom: 500,
    openUntil: "19:30",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Rajbagh",
    address: "Rajbagh, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 4 hours before the appointment.",
    amenities: ["Skin consultation", "Vegan products", "Appointment only"],
    services: [
      { id: "00000000-0000-0000-0002-000000000009", name: "Signature HydraFacial", durationMin: 60, durationLabel: "60 min", priceFrom: 1500, priceTo: 2200, category: "Skin & Beauty", description: "Multi-step hydrating facial treatment", popular: true },
      { id: "00000000-0000-0000-0002-000000000010", name: "Skin Consult + Cleanup", durationMin: 45, durationLabel: "45 min", priceFrom: 700, priceTo: 900, category: "Skin & Beauty", description: "Dermatological consult and exfoliation" },
      { id: "00000000-0000-0000-0002-000000000011", name: "Anti-tan Facial", durationMin: 45, durationLabel: "45 min", priceFrom: 900, priceTo: 1200, category: "Skin & Beauty", description: "Brightening antioxidant protocol" },
      { id: "00000000-0000-0000-0002-000000000012", name: "Threading", durationMin: 10, durationLabel: "10 min", priceFrom: 80, priceTo: 150, category: "Skin & Beauty", description: "Eyebrow and upper lip shaping" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000006", name: "Dr. Hiba Roshan", role: "Dermatologist", rating: 4.9, avatarColor: "#0B91B5", initials: "HR", yearsExperience: 9, bio: "Clinical aesthetician" },
      { id: "00000000-0000-0000-0003-000000000007", name: "Mehreen Bhat", role: "Beauty Therapist", rating: 4.8, avatarColor: "#1D4653", initials: "MB", yearsExperience: 5, bio: "HydraFacial specialist" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    name: "Glow & Grace",
    tagline: "Bridal & party makeup studio",
    description: "Glow & Grace specialises in HD bridal and party makeup, with a colour-true lighting studio that ensures your look holds up on camera and in person. Bridal trials, draping and on-site service available.",
    category: "Makeup",
    coverImage: "/salons/salon-20.jpg",
    gallery: ["/salons/salon-21.jpg", "/salons/salon-22.jpg", "/salons/salon-23.png", "/salons/salon-12.jpg"],
    rating: 4.8,
    reviewCount: 192,
    distanceKm: 2.4,
    priceFrom: 1200,
    openUntil: "20:00",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Zero Bridge",
    address: "Zero Bridge, Srinagar, J&K",
    cancellationPolicy: "50% non-refundable booking fee for bridal services.",
    amenities: ["HD makeup", "On-site service", "Bridal trials"],
    services: [
      { id: "00000000-0000-0000-0002-000000000013", name: "Bridal HD Makeup", durationMin: 90, durationLabel: "90 min", priceFrom: 4500, priceTo: 7500, category: "Makeup", description: "Long-lasting HD camera makeup with lashes", popular: true },
      { id: "00000000-0000-0000-0002-000000000014", name: "Party Glam", durationMin: 45, durationLabel: "45 min", priceFrom: 1500, priceTo: 2500, category: "Makeup", description: "Glamorous party look with contouring" },
      { id: "00000000-0000-0000-0002-000000000015", name: "Engagement Look", durationMin: 60, durationLabel: "60 min", priceFrom: 2500, priceTo: 3500, category: "Makeup", description: "Subtle radiant evening makeup" },
      { id: "00000000-0000-0000-0002-000000000016", name: "Saree Draping", durationMin: 20, durationLabel: "20 min", priceFrom: 400, priceTo: 600, category: "Makeup", description: "Traditional and modern saree pleating" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000008", name: "Ananya Kaul", role: "Lead Makeup Artist", rating: 4.9, avatarColor: "#29434D", initials: "AK", yearsExperience: 8, bio: "Bridal HD expert" },
      { id: "00000000-0000-0000-0003-000000000009", name: "Saima Lone", role: "Makeup Artist", rating: 4.7, avatarColor: "#28C4DC", initials: "SL", yearsExperience: 4, bio: "Party glam specialist" },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Urban Groom Lounge",
    tagline: "Modern men's grooming salon",
    description: "Urban Groom is a fast-paced men's salon built around precision fades, beard design and quick midday touch-ups. Online booking, slot reminders and a loyalty program for repeat clients.",
    category: "Beard & Grooming",
    coverImage: "/salons/salon-05.jpg",
    gallery: ["/salons/salon-06.jpeg", "/salons/salon-16.jpg", "/salons/salon-02.jpg", "/salons/salon-17.jpg"],
    rating: 4.8,
    reviewCount: 245,
    distanceKm: 0.6,
    priceFrom: 200,
    openUntil: "22:00",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Karannagar",
    address: "Karannagar, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 1 hour before the appointment.",
    amenities: ["Open till 10 PM", "Walk-ins", "Loyalty program"],
    services: [
      { id: "00000000-0000-0000-0000-000000000002", name: "Skin Fade", durationMin: 30, durationLabel: "30 min", priceFrom: 250, priceTo: 350, category: "Hair", description: "Precision fade with seamless blend", popular: true },
      { id: "00000000-0000-0000-0002-000000000017", name: "Beard Design", durationMin: 20, durationLabel: "20 min", priceFrom: 200, priceTo: 280, category: "Beard & Grooming", description: "Sharp beard geometry and styling" },
      { id: "00000000-0000-0000-0002-000000000018", name: "Head Massage", durationMin: 15, durationLabel: "15 min", priceFrom: 120, priceTo: 180, category: "Treatments", description: "Express stress relief head massage" },
      { id: "00000000-0000-0000-0002-000000000019", name: "Hair Wash & Style", durationMin: 15, durationLabel: "15 min", priceFrom: 100, priceTo: 150, category: "Hair", description: "Deep cleanse and blow-dry finish" },
    ],
    staff: [
      { id: "00000000-0000-0000-0000-000000000003", name: "Arslan Dar", role: "Senior Barber", rating: 4.9, avatarColor: "#0B91B5", initials: "AD", yearsExperience: 8, bio: "Master of precision fades" },
      { id: "00000000-0000-0000-0003-000000000010", name: "Suhail Wani", role: "Barber", rating: 4.5, avatarColor: "#29434D", initials: "SW", yearsExperience: 4, bio: "Beard design specialist" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000006",
    name: "Style Lounge",
    tagline: "Unisex styling & colour studio",
    description: "Style Lounge is a colour-forward unisex salon specialising in global hair colour, balayage, keratin treatments and event-ready styling. Free colour consultation included with every booking.",
    category: "Hair",
    coverImage: "/salons/salon-32.jpeg",
    gallery: ["/salons/salon-33.jpg", "/salons/salon-34.jpg", "/salons/salon-18.jpg", "/salons/salon-20.jpg"],
    rating: 4.7,
    reviewCount: 173,
    distanceKm: 2.1,
    priceFrom: 350,
    openUntil: "20:30",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Boulevard Road",
    address: "Boulevard Road, Srinagar, J&K",
    cancellationPolicy: "Colour bookings require 24h notice for cancellation.",
    amenities: ["Free consultation", "Vegan colour", "Hair spa"],
    services: [
      { id: "00000000-0000-0000-0002-000000000020", name: "Haircut & Style", durationMin: 45, durationLabel: "45 min", priceFrom: 350, priceTo: 500, category: "Hair", description: "Creative cut with styling" },
      { id: "00000000-0000-0000-0002-000000000021", name: "Global Hair Colour", durationMin: 105, durationLabel: "90-120 min", priceFrom: 1800, priceTo: 3000, category: "Hair", description: "Ammonia-free vibrant all-over colour", popular: true },
      { id: "00000000-0000-0000-0002-000000000022", name: "Balayage", durationMin: 150, durationLabel: "150 min", priceFrom: 3500, priceTo: 5500, category: "Hair", description: "Hand-painted sun-kissed gradient highlights", popular: true },
      { id: "00000000-0000-0000-0002-000000000023", name: "Keratin Treatment", durationMin: 120, durationLabel: "120 min", priceFrom: 4000, priceTo: 6500, category: "Treatments", description: "Smoothing keratin frizz reduction" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000011", name: "Ria Mahajan", role: "Colour Director", rating: 4.9, avatarColor: "#28C4DC", initials: "RM", yearsExperience: 11, bio: "Balayage & color specialist" },
      { id: "00000000-0000-0000-0003-000000000012", name: "Tariq Bhat", role: "Senior Stylist", rating: 4.7, avatarColor: "#0B91B5", initials: "TB", yearsExperience: 6, bio: "Keratin and styling master" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000007",
    name: "Elegance Studio",
    tagline: "Facial, waxing & threading studio",
    description: "Elegance Studio is a calm, women-focused beauty studio for routine maintenance and event prep. Threading, waxing, facials and clean-ups in a quiet, hygienic space.",
    category: "Skin & Beauty",
    coverImage: "/salons/salon-09.jpg",
    gallery: ["/salons/salon-10.jpg", "/salons/salon-11.jpg", "/salons/salon-21.jpg", "/salons/salon-24.jpg"],
    rating: 4.6,
    reviewCount: 158,
    distanceKm: 1.5,
    priceFrom: 250,
    openUntil: "19:00",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Indira Nagar",
    address: "Indira Nagar, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 2 hours before the appointment.",
    amenities: ["Women only", "Hygiene certified", "Vegan wax"],
    services: [
      { id: "00000000-0000-0000-0002-000000000024", name: "Full Face Threading", durationMin: 15, durationLabel: "15 min", priceFrom: 120, priceTo: 180, category: "Skin & Beauty", description: "Gentle full face threading" },
      { id: "00000000-0000-0000-0002-000000000025", name: "Full Arms Wax", durationMin: 20, durationLabel: "20 min", priceFrom: 250, priceTo: 350, category: "Skin & Beauty", description: "Rica wax arms hair removal" },
      { id: "00000000-0000-0000-0002-000000000026", name: "Fruit Cleanup", durationMin: 30, durationLabel: "30 min", priceFrom: 500, priceTo: 700, category: "Skin & Beauty", description: "Natural fruit extract skin glow" },
      { id: "00000000-0000-0000-0002-000000000027", name: "De-tan Facial", durationMin: 45, durationLabel: "45 min", priceFrom: 700, priceTo: 950, category: "Skin & Beauty", description: "Effective tan reversal treatment", popular: true },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000013", name: "Nusrat Jan", role: "Beauty Therapist", rating: 4.7, avatarColor: "#1D4653", initials: "NJ", yearsExperience: 6, bio: "Skincare and clean-up expert" },
      { id: "00000000-0000-0000-0003-000000000014", name: "Pooja Raina", role: "Waxing Specialist", rating: 4.6, avatarColor: "#163440", initials: "PR", yearsExperience: 5, bio: "Painless Rica waxing specialist" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000008",
    name: "The Groom Room",
    tagline: "Quick men's haircut & shave bar",
    description: "The Groom Room is built for speed without compromise — a no-frills men's bar with skilled barbers, fixed slots and transparent pricing. In and out in under 30 minutes, guaranteed.",
    category: "Hair",
    coverImage: "/salons/salon-14.png",
    gallery: ["/salons/salon-15.jpeg", "/salons/salon-16.jpg", "/salons/salon-03.jpg", "/salons/salon-17.jpg"],
    rating: 4.5,
    reviewCount: 134,
    distanceKm: 2.8,
    priceFrom: 180,
    openUntil: "21:30",
    isOpen: true,
    verified: false,
    city: "Srinagar",
    area: "Hyderpora",
    address: "Hyderpora, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 1 hour before the appointment.",
    amenities: ["Quick service", "Fixed slots", "Combo pricing"],
    services: [
      { id: "00000000-0000-0000-0002-000000000028", name: "Quick Haircut", durationMin: 20, durationLabel: "20 min", priceFrom: 180, priceTo: 220, category: "Hair", description: "Efficient 20-minute classic haircut" },
      { id: "00000000-0000-0000-0002-000000000029", name: "Buzz Cut", durationMin: 15, durationLabel: "15 min", priceFrom: 150, priceTo: 180, category: "Hair", description: "Clipper buzz with sharp perimeter" },
      { id: "00000000-0000-0000-0002-000000000030", name: "Edge Shave", durationMin: 15, durationLabel: "15 min", priceFrom: 120, priceTo: 150, category: "Beard & Grooming", description: "Clean neckline and cheek edges" },
      { id: "00000000-0000-0000-0002-000000000031", name: "Cut + Beard Combo", durationMin: 35, durationLabel: "35 min", priceFrom: 320, priceTo: 400, category: "Hair", description: "Full head cut and beard sculpt combo", popular: true },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000015", name: "Zahid Bhat", role: "Barber", rating: 4.6, avatarColor: "#0B91B5", initials: "ZB", yearsExperience: 7, bio: "High-speed clipper master" },
      { id: "00000000-0000-0000-0003-000000000016", name: "Aadil Khan", role: "Barber", rating: 4.5, avatarColor: "#18AFC7", initials: "AK", yearsExperience: 4, bio: "Beard edges and quick cuts" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000009",
    name: "Aura Beauty",
    tagline: "Bridal, pre-bridal & nail atelier",
    description: "Aura Beauty is a one-stop studio for pre-bridal journeys and statement nails. From soak-off gels to multi-day pre-bridal glow programs, every package is built around your event calendar.",
    category: "Nails",
    coverImage: "/salons/salon-25.jpg",
    gallery: ["/salons/salon-26.jpg", "/salons/salon-27.jpg", "/salons/salon-22.jpg", "/salons/salon-28.jpg"],
    rating: 4.7,
    reviewCount: 117,
    distanceKm: 3.2,
    priceFrom: 800,
    openUntil: "20:00",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Sanat Nagar",
    address: "Sanat Nagar, Srinagar, J&K",
    cancellationPolicy: "Pre-bridal packages are non-refundable once started.",
    amenities: ["Nail atelier", "Pre-bridal", "Vegan products"],
    services: [
      { id: "00000000-0000-0000-0002-000000000032", name: "Gel Manicure", durationMin: 45, durationLabel: "45 min", priceFrom: 800, priceTo: 1200, category: "Nails", description: "Chip-resistant UV gel manicure with cuticle care", popular: true },
      { id: "00000000-0000-0000-0002-000000000033", name: "Nail Art (per nail)", durationMin: 10, durationLabel: "10 min", priceFrom: 80, priceTo: 200, category: "Nails", description: "Custom hand-drawn or chrome nail art" },
      { id: "00000000-0000-0000-0002-000000000034", name: "Pedicure Spa", durationMin: 45, durationLabel: "45 min", priceFrom: 700, priceTo: 1000, category: "Nails", description: "Exfoliating foot soak and massage" },
      { id: "00000000-0000-0000-0002-000000000035", name: "Pre-bridal Glow Package", durationMin: 120, durationLabel: "120 min", priceFrom: 3500, priceTo: 5000, category: "Skin & Beauty", description: "Intensive brightening and polishing session", popular: true },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000017", name: "Nimrata Singh", role: "Nail Artist", rating: 4.8, avatarColor: "#29434D", initials: "NS", yearsExperience: 6, bio: "Gel extensions & 3D nail art" },
      { id: "00000000-0000-0000-0003-000000000018", name: "Ayesha Roshan", role: "Bridal Artist", rating: 4.9, avatarColor: "#28C4DC", initials: "AR", yearsExperience: 8, bio: "Pre-bridal glow specialist" },
    ],
  },
  {
    id: "00000000-0000-0000-0001-000000000010",
    name: "The Style Hub",
    tagline: "Full-service unisex salon & spa",
    description: "The Style Hub is a full-service destination salon with hair, skin, nails and spa under one roof. Built for families, groups and weekend self-care sessions with simultaneous multi-stylist bookings.",
    category: "Hair",
    coverImage: "/salons/salon-30.jpg",
    gallery: ["/salons/salon-31.jpg", "/salons/salon-33.jpg", "/salons/salon-08.jpg", "/salons/salon-13.jpg"],
    rating: 4.6,
    reviewCount: 209,
    distanceKm: 3.6,
    priceFrom: 300,
    openUntil: "21:00",
    isOpen: true,
    verified: true,
    city: "Srinagar",
    area: "Bemina Crossing",
    address: "Bemina Crossing, Srinagar, J&K",
    cancellationPolicy: "Free cancellation up to 4 hours before the appointment.",
    amenities: ["Family bookings", "Multi-stylist", "Free parking"],
    services: [
      { id: "00000000-0000-0000-0002-000000000036", name: "Family Haircut (4 pax)", durationMin: 60, durationLabel: "60 min", priceFrom: 1100, priceTo: 1500, category: "Hair", description: "Group appointment with dedicated stylists", popular: true },
      { id: "00000000-0000-0000-0002-000000000037", name: "Spa Day Package", durationMin: 120, durationLabel: "120 min", priceFrom: 2500, priceTo: 3800, category: "Treatments", description: "Full body scrub and relaxing aromatherapy" },
      { id: "00000000-0000-0000-0002-000000000038", name: "Global Colour", durationMin: 90, durationLabel: "90 min", priceFrom: 1600, priceTo: 2800, category: "Hair", description: "Complete grey coverage or shade change" },
      { id: "00000000-0000-0000-0002-000000000039", name: "Bridal Mehandi", durationMin: 120, durationLabel: "120 min", priceFrom: 2500, priceTo: 4500, category: "Makeup", description: "Organic dark-stain intricate henna" },
    ],
    staff: [
      { id: "00000000-0000-0000-0003-000000000019", name: "Vikram Khanna", role: "Salon Director", rating: 4.7, avatarColor: "#0B91B5", initials: "VK", yearsExperience: 14, bio: "Master stylist & colourist" },
      { id: "00000000-0000-0000-0003-000000000020", name: "Shazia Bhat", role: "Spa Lead", rating: 4.6, avatarColor: "#1D4653", initials: "SB", yearsExperience: 9, bio: "Holistic spa therapist" },
    ],
  },
];

async function main() {
  console.log("Seeding SQLite test DB with 10 production-grade salons...");

  for (const s of SEED_SALONS) {
    const salon = await prisma.salon.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        category: s.category,
        coverImage: s.coverImage,
        gallery: JSON.stringify(s.gallery),
        rating: s.rating,
        reviewCount: s.reviewCount,
        distanceKm: s.distanceKm,
        priceFrom: s.priceFrom,
        openUntil: s.openUntil,
        isOpen: s.isOpen,
        verified: s.verified,
        city: s.city,
        area: s.area,
        address: s.address,
        cancellationPolicy: s.cancellationPolicy,
        amenities: JSON.stringify(s.amenities),
        openingHours: JSON.stringify(STANDARD_HOURS),
        isPublished: true,
        status: "active",
      } as any,
      create: {
        id: s.id,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        category: s.category,
        coverImage: s.coverImage,
        gallery: JSON.stringify(s.gallery),
        rating: s.rating,
        reviewCount: s.reviewCount,
        distanceKm: s.distanceKm,
        priceFrom: s.priceFrom,
        openUntil: s.openUntil,
        isOpen: s.isOpen,
        verified: s.verified,
        city: s.city,
        area: s.area,
        address: s.address,
        cancellationPolicy: s.cancellationPolicy,
        amenities: JSON.stringify(s.amenities),
        openingHours: JSON.stringify(STANDARD_HOURS),
        isPublished: true,
        status: "active",
      } as any,
    });

    const salonServiceIds: string[] = [];

    for (const srv of s.services) {
      // Upsert master service
      const masterService = await prisma.service.upsert({
        where: { name: srv.name },
        update: {
          category: srv.category,
          description: srv.description,
          defaultDuration: srv.durationMin,
          status: "active",
        },
        create: {
          id: srv.id,
          name: srv.name,
          category: srv.category,
          description: srv.description,
          defaultDuration: srv.durationMin,
          status: "active",
        },
      });

      // Upsert salon service
      const salonService = await prisma.salonService.upsert({
        where: { id: srv.id },
        update: {
          salonId: salon.id,
          serviceId: masterService.id,
          name: srv.name,
          description: srv.description,
          durationMin: srv.durationMin,
          durationLabel: srv.durationLabel,
          priceFrom: srv.priceFrom,
          priceTo: srv.priceTo || srv.priceFrom,
          popular: srv.popular || false,
          category: srv.category,
          status: "active",
          isPublished: true,
        } as any,
        create: {
          id: srv.id,
          salonId: salon.id,
          serviceId: masterService.id,
          name: srv.name,
          description: srv.description,
          durationMin: srv.durationMin,
          durationLabel: srv.durationLabel,
          priceFrom: srv.priceFrom,
          priceTo: srv.priceTo || srv.priceFrom,
          popular: srv.popular || false,
          category: srv.category,
          status: "active",
          isPublished: true,
        } as any,
      });

      salonServiceIds.push(salonService.id);
    }

    for (const st of s.staff) {
      await prisma.staffMember.upsert({
        where: { id: st.id },
        update: {
          salonId: salon.id,
          name: st.name,
          role: st.role,
          rating: st.rating,
          reviewCount: Math.floor(st.rating * 20),
          avatarColor: st.avatarColor,
          initials: st.initials,
          yearsExperience: st.yearsExperience,
          bio: st.bio,
          specializations: JSON.stringify(s.services.map((x) => x.name)),
          workingHours: JSON.stringify(STANDARD_WORKING_HOURS),
          breaks: JSON.stringify([]),
          daysOff: JSON.stringify([]),
          serviceIds: JSON.stringify(salonServiceIds),
          isPublished: true,
        } as any,
        create: {
          id: st.id,
          salonId: salon.id,
          name: st.name,
          role: st.role,
          rating: st.rating,
          reviewCount: Math.floor(st.rating * 20),
          avatarColor: st.avatarColor,
          initials: st.initials,
          yearsExperience: st.yearsExperience,
          bio: st.bio,
          specializations: JSON.stringify(s.services.map((x) => x.name)),
          workingHours: JSON.stringify(STANDARD_WORKING_HOURS),
          breaks: JSON.stringify([]),
          daysOff: JSON.stringify([]),
          serviceIds: JSON.stringify(salonServiceIds),
          isPublished: true,
        } as any,
      });
    }

    console.log(`✓ Seeded ${salon.name} with ${s.services.length} services and ${s.staff.length} staff members.`);
  }

  console.log("\nComplete! All 10 salons seeded to SQLite test database.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Seed failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
