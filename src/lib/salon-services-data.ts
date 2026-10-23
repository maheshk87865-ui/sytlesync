import type { SalonCategory } from "./salon-data";

export interface ServiceAddon { id: string; name: string; price: number; }
export interface SalonServiceFull {
  id: string;
  name: string;
  description: string;
  category: SalonCategory;
  durationMin: number;
  durationLabel: string;
  priceFrom: number;
  priceTo?: number;
  rating: number;
  reviews: number;
  image?: string;
  whatsIncluded?: string[];
  addons?: ServiceAddon[];
  staffIds: string[];
  popular?: boolean;
}
export interface StaffMemberFull {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  avatarColor: string;
  initials: string;
  yearsExperience: number;
  bio: string;
  specializations: string[];
  serviceIds: string[];
  workingHours: { start: string; end: string };
  breaks?: { start: string; end: string }[];
  daysOff?: number[];
}
export interface SalonServiceData {
  salonId: string;
  services: SalonServiceFull[];
  staff: StaffMemberFull[];
}

const H = ["/salons/salon-13.jpg","/salons/salon-14.png","/salons/salon-15.jpeg","/salons/salon-16.jpg","/salons/salon-17.jpg","/salons/salon-18.jpg"];
const B = ["/salons/salon-01.jpeg","/salons/salon-02.jpg","/salons/salon-03.jpg","/salons/salon-04.jpg","/salons/salon-05.jpg","/salons/salon-06.jpeg"];
const BE = ["/salons/salon-07.jpg","/salons/salon-08.jpg","/salons/salon-09.jpg","/salons/salon-10.jpg","/salons/salon-11.jpg","/salons/salon-12.jpg"];
const M = ["/salons/salon-19.png","/salons/salon-20.jpg","/salons/salon-21.jpg","/salons/salon-22.jpg","/salons/salon-23.png"];
const N = ["/salons/salon-24.jpg","/salons/salon-25.jpg","/salons/salon-26.jpg","/salons/salon-27.jpg","/salons/salon-28.jpg"];
const P = ["/salons/salon-29.jpg","/salons/salon-30.jpg","/salons/salon-31.jpg","/salons/salon-32.jpeg","/salons/salon-33.jpg","/salons/salon-34.jpg"];
const img = (a: string[], i: number) => a[i % a.length];

export const salonServicesData: SalonServiceData[] = [
  { salonId: "premium-roots", services: [
    { id:"pr-1",name:"Men's Haircut",description:"Professional haircut with consultation, cutting, finishing and basic styling.",category:"Hair",durationMin:45,durationLabel:"45 min",priceFrom:350,rating:4.8,reviews:126,image:img(H,0),whatsIncluded:["Hair consultation","Haircut","Finishing","Basic styling"],addons:[{id:"pr-a1",name:"Hair Wash",price:100},{id:"pr-a2",name:"Hair Styling",price:150}],staffIds:["pr-s1","pr-s2","pr-s3"],popular:true},
    { id:"pr-2",name:"Beard Styling",description:"Beard shaping, lining and styling for a defined look.",category:"Beard & Grooming",durationMin:30,durationLabel:"30 min",priceFrom:200,rating:4.7,reviews:88,image:img(B,1),whatsIncluded:["Beard consultation","Shape & line","Styling"],staffIds:["pr-s1","pr-s3"],popular:true},
    { id:"pr-3",name:"Luxury Facial",description:"Premium facial with cleanse, exfoliation, mask and moisturizer.",category:"Skin & Beauty",durationMin:60,durationLabel:"60 min",priceFrom:800,priceTo:1500,rating:4.9,reviews:64,image:img(BE,0),whatsIncluded:["Cleanse","Exfoliation","Mask","Massage","Moisturizer"],staffIds:["pr-s2"]},
    { id:"pr-4",name:"Hair Colour",description:"Global hair colour using premium ammonia-free products.",category:"Hair",durationMin:90,durationLabel:"90 min",priceFrom:1800,priceTo:3500,rating:4.6,reviews:42,image:img(H,3),whatsIncluded:["Consultation","Application","Processing","Wash & style"],staffIds:["pr-s1"]},
    { id:"pr-5",name:"Hair Spa",description:"Deep-conditioning hair spa with scalp massage.",category:"Treatments",durationMin:45,durationLabel:"45 min",priceFrom:450,rating:4.7,reviews:51,image:img(P,0),whatsIncluded:["Cleanse","Deep conditioning","Scalp massage","Steam"],staffIds:["pr-s2"]},
    { id:"pr-6",name:"Hot Towel Shave",description:"Traditional hot-towel shave with pre-shave oil and aftercare.",category:"Beard & Grooming",durationMin:30,durationLabel:"30 min",priceFrom:320,rating:4.8,reviews:39,image:img(B,2),whatsIncluded:["Hot towel prep","Pre-shave oil","Shave","Aftercare"],staffIds:["pr-s1","pr-s3"]},
    { id:"pr-7",name:"Cleanup",description:"Quick skin cleanup with steam, extraction and mask.",category:"Skin & Beauty",durationMin:30,durationLabel:"30 min",priceFrom:500,rating:4.6,reviews:33,image:img(BE,1),whatsIncluded:["Cleanse","Steam","Extraction","Mask"],staffIds:["pr-s2"]},
    { id:"pr-8",name:"Keratin Treatment",description:"Smoothing keratin treatment for frizz-free hair.",category:"Treatments",durationMin:120,durationLabel:"120 min",priceFrom:4000,rating:4.7,reviews:18,image:img(H,4),whatsIncluded:["Consultation","Application","Processing","Flat iron","Wash"],staffIds:["pr-s1"]},
  ], staff: [
    { id:"pr-s1",name:"Aamir Bhat",role:"Master Stylist",rating:4.9,reviews:214,avatarColor:"#0B91B5",initials:"AB",yearsExperience:8,bio:"Experienced barber and stylist specialising in modern men's cuts and beard design. Trained in Mumbai and Dubai.",specializations:["Men's Haircuts","Beard Styling","Hair Colour"],serviceIds:["pr-1","pr-2","pr-4","pr-6","pr-8"],workingHours:{start:"10:00",end:"20:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[1]},
    { id:"pr-s2",name:"Sana Khan",role:"Senior Esthetician",rating:4.8,reviews:156,avatarColor:"#18AFC7",initials:"SK",yearsExperience:6,bio:"Skin and beauty specialist with focus on facials, cleanups and hair spa treatments. Vegan product advocate.",specializations:["Facials","Cleanups","Hair Spa","Skin Consultation"],serviceIds:["pr-3","pr-5","pr-7"],workingHours:{start:"11:00",end:"20:30"},breaks:[{start:"14:30",end:"15:30"}],daysOff:[2]},
    { id:"pr-s3",name:"Imran Shah",role:"Barber Specialist",rating:4.7,reviews:98,avatarColor:"#1D4653",initials:"IS",yearsExperience:5,bio:"Classic barber specialising in hot-towel shaves, beard sculpting and traditional cuts.",specializations:["Hot Towel Shave","Beard Sculpting","Classic Cuts"],serviceIds:["pr-1","pr-2","pr-6"],workingHours:{start:"09:00",end:"19:00"},breaks:[{start:"13:00",end:"14:00"}],daysOff:[3]},
  ]},
  { salonId: "royal-roots", services: [
    { id:"rr-1",name:"Classic Haircut",description:"Traditional scissor cut with consultation and finish.",category:"Hair",durationMin:30,durationLabel:"30 min",priceFrom:250,rating:4.7,reviews:142,image:img(B,0),whatsIncluded:["Consultation","Scissor cut","Neck shave","Finish"],staffIds:["rr-s1","rr-s2"],popular:true},
    { id:"rr-2",name:"Beard Sculpt & Trim",description:"Precision beard sculpting with straight razor lining.",category:"Beard & Grooming",durationMin:20,durationLabel:"20 min",priceFrom:180,rating:4.8,reviews:96,image:img(B,3),whatsIncluded:["Beard consult","Scissor trim","Razor line","Hot towel"],staffIds:["rr-s1"],popular:true},
    { id:"rr-3",name:"Hot Towel Shave",description:"Traditional hot-towel straight razor shave.",category:"Beard & Grooming",durationMin:40,durationLabel:"30-40 min",priceFrom:320,rating:4.9,reviews:71,image:img(B,4),whatsIncluded:["Hot towel prep","Pre-shave oil","Straight razor shave","Aftercare balm"],addons:[{id:"rr-a1",name:"Face massage",price:100}],staffIds:["rr-s1","rr-s2"]},
    { id:"rr-4",name:"Head Massage",description:"Relaxing Indian head massage with herbal oil.",category:"Treatments",durationMin:20,durationLabel:"20 min",priceFrom:150,rating:4.6,reviews:58,image:img(P,1),whatsIncluded:["Oil application","Scalp massage","Neck & shoulders"],staffIds:["rr-s2"]},
    { id:"rr-5",name:"Hair Wash & Style",description:"Quick hair wash and styling for refresh.",category:"Hair",durationMin:15,durationLabel:"15 min",priceFrom:100,rating:4.5,reviews:34,image:img(H,1),whatsIncluded:["Hair wash","Towel dry","Basic style"],staffIds:["rr-s2"]},
    { id:"rr-6",name:"Cut + Beard Combo",description:"Haircut with beard trim combo — best value package.",category:"Hair",durationMin:45,durationLabel:"45 min",priceFrom:380,rating:4.8,reviews:64,image:img(B,5),whatsIncluded:["Haircut","Beard trim","Hot towel finish"],staffIds:["rr-s1"]},
  ], staff: [
    { id:"rr-s1",name:"Bilal Ahmad",role:"Master Barber",rating:4.9,reviews:318,avatarColor:"#0B91B5",initials:"BA",yearsExperience:12,bio:"Third-generation barber with a passion for traditional straight-razor work and classic scissor cuts.",specializations:["Classic Haircuts","Hot Towel Shave","Beard Sculpting"],serviceIds:["rr-1","rr-2","rr-3","rr-6"],workingHours:{start:"09:00",end:"21:00"},breaks:[{start:"13:30",end:"14:30"}],daysOff:[0]},
    { id:"rr-s2",name:"Hamid Sheikh",role:"Barber",rating:4.6,reviews:142,avatarColor:"#1D4653",initials:"HS",yearsExperience:5,bio:"Skilled barber focused on quick, clean cuts and relaxing head massages.",specializations:["Quick Cuts","Head Massage","Hair Wash"],serviceIds:["rr-1","rr-3","rr-4","rr-5"],workingHours:{start:"10:00",end:"20:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[1]},
  ]},
  { salonId: "kashmir-beauty-studio", services: [
    { id:"kb-1",name:"Signature HydraFacial",description:"Medical-grade hydra-facial with dermoscope consultation.",category:"Skin & Beauty",durationMin:60,durationLabel:"60 min",priceFrom:1500,rating:4.9,reviews:88,image:img(BE,2),whatsIncluded:["Skin consultation","Cleanse","Acid peel","Extraction","Hydration","LED"],addons:[{id:"kb-a1",name:"Booster serum",price:400}],staffIds:["kb-s1"],popular:true},
    { id:"kb-2",name:"Skin Consult + Cleanup",description:"Dermatologist consultation followed by a basic cleanup.",category:"Skin & Beauty",durationMin:45,durationLabel:"45 min",priceFrom:700,rating:4.8,reviews:56,image:img(BE,3),whatsIncluded:["Dermoscope check","Cleanse","Steam","Extraction","Mask"],staffIds:["kb-s1"]},
    { id:"kb-3",name:"Anti-tan Facial",description:"De-tan facial with fruit-based peels and brightening mask.",category:"Skin & Beauty",durationMin:45,durationLabel:"45 min",priceFrom:900,rating:4.7,reviews:41,image:img(BE,4),whatsIncluded:["Cleanse","De-tan peel","Massage","Brightening mask"],staffIds:["kb-s2"]},
    { id:"kb-4",name:"Threading",description:"Eyebrow and upper-lip threading.",category:"Skin & Beauty",durationMin:10,durationLabel:"10 min",priceFrom:80,rating:4.6,reviews:122,image:img(BE,5),whatsIncluded:["Eyebrow","Upper lip"],staffIds:["kb-s2"]},
    { id:"kb-5",name:"Manicure",description:"Classic manicure with shape, cuticle care and polish.",category:"Nails",durationMin:45,durationLabel:"45 min",priceFrom:400,rating:4.7,reviews:28,image:img(N,0),whatsIncluded:["Soak","Shape","Cuticle","Massage","Polish"],staffIds:["kb-s2"]},
  ], staff: [
    { id:"kb-s1",name:"Dr. Hiba Roshan",role:"Dermatologist",rating:4.9,reviews:156,avatarColor:"#0B91B5",initials:"HR",yearsExperience:10,bio:"Board-certified dermatologist specialising in skin-health facials and clinical cleanups. Vegan product advocate.",specializations:["HydraFacial","Skin Consultation","Anti-tan"],serviceIds:["kb-1","kb-2"],workingHours:{start:"10:00",end:"19:30"},breaks:[{start:"13:00",end:"14:00"}],daysOff:[0,1]},
    { id:"kb-s2",name:"Mehreen Bhat",role:"Beauty Therapist",rating:4.8,reviews:78,avatarColor:"#18AFC7",initials:"MB",yearsExperience:4,bio:"Beauty therapist focused on threading, cleanups, facials and manicures.",specializations:["Threading","Cleanups","Anti-tan Facial","Manicure"],serviceIds:["kb-3","kb-4","kb-5"],workingHours:{start:"11:00",end:"20:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[2]},
  ]},
  { salonId: "glow-grace", services: [
    { id:"gg-1",name:"Bridal HD Makeup",description:"Full bridal HD makeup with draping and trial.",category:"Makeup",durationMin:90,durationLabel:"90 min",priceFrom:4500,rating:4.9,reviews:42,image:img(M,1),whatsIncluded:["Prep","HD foundation","Eyes","Contour","Lips","Draping"],addons:[{id:"gg-a1",name:"Trial session",price:1500}],staffIds:["gg-s1"],popular:true},
    { id:"gg-2",name:"Party Glam",description:"Party makeup with lashes and contour.",category:"Makeup",durationMin:45,durationLabel:"45 min",priceFrom:1500,rating:4.7,reviews:58,image:img(M,2),whatsIncluded:["Prep","Foundation","Eye makeup","Lashes","Lips"],staffIds:["gg-s1","gg-s2"]},
    { id:"gg-3",name:"Engagement Look",description:"Soft glam engagement makeup with romantic tones.",category:"Makeup",durationMin:60,durationLabel:"60 min",priceFrom:2500,rating:4.8,reviews:24,image:img(M,3),whatsIncluded:["Prep","Soft glam","Eye detail","Lips"],staffIds:["gg-s1"]},
    { id:"gg-4",name:"Saree Draping",description:"Designer saree draping in any style.",category:"Makeup",durationMin:20,durationLabel:"20 min",priceFrom:400,rating:4.6,reviews:18,image:img(M,4),whatsIncluded:["Saree draping","Pleats","Pallu setting"],staffIds:["gg-s2"]},
  ], staff: [
    { id:"gg-s1",name:"Ananya Kaul",role:"Lead Makeup Artist",rating:4.9,reviews:187,avatarColor:"#0B91B5",initials:"AK",yearsExperience:9,bio:"Award-winning bridal and editorial makeup artist. Trained in Mumbai and London.",specializations:["Bridal HD Makeup","Party Glam","Engagement Looks"],serviceIds:["gg-1","gg-2","gg-3"],workingHours:{start:"10:00",end:"20:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[1]},
    { id:"gg-s2",name:"Saima Lone",role:"Makeup Artist",rating:4.7,reviews:64,avatarColor:"#18AFC7",initials:"SL",yearsExperience:4,bio:"Makeup artist focused on party looks and saree draping.",specializations:["Party Makeup","Saree Draping"],serviceIds:["gg-2","gg-4"],workingHours:{start:"11:00",end:"20:00"},breaks:[{start:"14:30",end:"15:30"}],daysOff:[2]},
  ]},
  { salonId: "urban-groom", services: [
    { id:"ug-1",name:"Skin Fade",description:"Precision skin fade with clipper-over-comb technique.",category:"Hair",durationMin:40,durationLabel:"30-40 min",priceFrom:250,rating:4.8,reviews:112,image:img(H,5),whatsIncluded:["Consultation","Skin fade","Line up","Finish"],staffIds:["ug-s1","ug-s2"],popular:true},
    { id:"ug-2",name:"Beard Design",description:"Custom beard design with cheek-line sculpting.",category:"Beard & Grooming",durationMin:20,durationLabel:"20 min",priceFrom:200,rating:4.7,reviews:68,image:img(B,0),whatsIncluded:["Design consult","Sculpt","Line","Style"],staffIds:["ug-s1"],popular:true},
    { id:"ug-3",name:"Head Massage",description:"Quick head and scalp massage.",category:"Treatments",durationMin:15,durationLabel:"15 min",priceFrom:120,rating:4.5,reviews:24,image:img(P,2),whatsIncluded:["Scalp massage","Oil application"],staffIds:["ug-s2"]},
    { id:"ug-4",name:"Hair Wash & Style",description:"Wash and quick style refresh.",category:"Hair",durationMin:15,durationLabel:"15 min",priceFrom:100,rating:4.4,reviews:19,image:img(H,0),whatsIncluded:["Wash","Towel dry","Style"],staffIds:["ug-s2"]},
    { id:"ug-5",name:"Cut + Beard Combo",description:"Skin fade plus beard design — combo price.",category:"Hair",durationMin:50,durationLabel:"50 min",priceFrom:400,rating:4.8,reviews:36,image:img(B,1),whatsIncluded:["Skin fade","Beard design","Line up","Finish"],staffIds:["ug-s1"]},
  ], staff: [
    { id:"ug-s1",name:"Arslan Dar",role:"Senior Barber",rating:4.8,reviews:142,avatarColor:"#0B91B5",initials:"AD",yearsExperience:7,bio:"Modern barber specialising in skin fades and beard designs. Active on Instagram.",specializations:["Skin Fades","Beard Design","Line-ups"],serviceIds:["ug-1","ug-2","ug-5"],workingHours:{start:"10:00",end:"22:00"},breaks:[{start:"15:00",end:"16:00"}],daysOff:[]},
    { id:"ug-s2",name:"Suhail Wani",role:"Barber",rating:4.5,reviews:64,avatarColor:"#1D4653",initials:"SW",yearsExperience:3,bio:"Junior barber focused on quick cuts, head massage and wash-and-style.",specializations:["Quick Cuts","Head Massage","Wash & Style"],serviceIds:["ug-1","ug-3","ug-4"],workingHours:{start:"11:00",end:"22:00"},breaks:[{start:"16:00",end:"17:00"}],daysOff:[2]},
  ]},
  { salonId: "style-lounge", services: [
    { id:"sl-1",name:"Haircut & Style",description:"Cut and style with consultation.",category:"Hair",durationMin:45,durationLabel:"45 min",priceFrom:350,rating:4.7,reviews:88,image:img(P,3),whatsIncluded:["Consultation","Cut","Style","Finish"],staffIds:["sl-s1","sl-s2"]},
    { id:"sl-2",name:"Global Hair Colour",description:"Full-head colour with premium products.",category:"Hair",durationMin:120,durationLabel:"90-120 min",priceFrom:1800,priceTo:2800,rating:4.6,reviews:32,image:img(H,2),whatsIncluded:["Consultation","Colour application","Processing","Wash & style"],staffIds:["sl-s1"]},
    { id:"sl-3",name:"Balayage",description:"Hand-painted balayage for natural sun-kissed effect.",category:"Hair",durationMin:150,durationLabel:"150 min",priceFrom:3500,rating:4.8,reviews:14,image:img(H,3),whatsIncluded:["Consultation","Hand-painted colour","Processing","Tone","Style"],staffIds:["sl-s1"]},
    { id:"sl-4",name:"Keratin Treatment",description:"Smoothing keratin treatment for frizz-free hair.",category:"Treatments",durationMin:120,durationLabel:"120 min",priceFrom:4000,rating:4.7,reviews:18,image:img(H,4),whatsIncluded:["Consultation","Application","Processing","Flat iron","Wash"],staffIds:["sl-s1"]},
  ], staff: [
    { id:"sl-s1",name:"Ria Mahajan",role:"Colour Director",rating:4.9,reviews:102,avatarColor:"#0B91B5",initials:"RM",yearsExperience:11,bio:"Colour director with international training in balayage and keratin treatments. L'Oréal certified.",specializations:["Balayage","Keratin","Global Colour"],serviceIds:["sl-1","sl-2","sl-3","sl-4"],workingHours:{start:"10:00",end:"20:30"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[0]},
    { id:"sl-s2",name:"Tariq Bhat",role:"Senior Stylist",rating:4.7,reviews:58,avatarColor:"#1D4653",initials:"TB",yearsExperience:6,bio:"Stylist focused on precision cuts and finishing.",specializations:["Haircuts","Styling","Finishing"],serviceIds:["sl-1"],workingHours:{start:"11:00",end:"20:00"},breaks:[{start:"15:00",end:"16:00"}],daysOff:[1]},
  ]},
  { salonId: "elegance-studio", services: [
    { id:"es-1",name:"Full Face Threading",description:"Full face threading including brows, upper lip, chin, sides.",category:"Skin & Beauty",durationMin:15,durationLabel:"15 min",priceFrom:120,rating:4.7,reviews:68,image:img(BE,0),whatsIncluded:["Brows","Upper lip","Chin","Sides"],staffIds:["es-s1"],popular:true},
    { id:"es-2",name:"Full Arms Wax",description:"Roll-on wax for full arms.",category:"Skin & Beauty",durationMin:20,durationLabel:"20 min",priceFrom:250,rating:4.6,reviews:44,image:img(BE,1),whatsIncluded:["Prep","Wax application","Removal","After-lotion"],staffIds:["es-s2"]},
    { id:"es-3",name:"Fruit Cleanup",description:"Fruit-based cleanup with steam and mask.",category:"Skin & Beauty",durationMin:30,durationLabel:"30 min",priceFrom:500,rating:4.6,reviews:32,image:img(BE,3),whatsIncluded:["Cleanse","Steam","Extraction","Fruit mask"],staffIds:["es-s1"]},
    { id:"es-4",name:"De-tan Facial",description:"De-tan facial with brightening mask.",category:"Skin & Beauty",durationMin:45,durationLabel:"45 min",priceFrom:700,rating:4.7,reviews:26,image:img(BE,4),whatsIncluded:["Cleanse","De-tan peel","Massage","Brightening mask"],staffIds:["es-s1"]},
  ], staff: [
    { id:"es-s1",name:"Nusrat Jan",role:"Beauty Therapist",rating:4.7,reviews:88,avatarColor:"#0B91B5",initials:"NJ",yearsExperience:5,bio:"Beauty therapist focused on threading, cleanups and de-tan facials. Vegan wax specialist.",specializations:["Threading","Cleanups","De-tan Facials"],serviceIds:["es-1","es-3","es-4"],workingHours:{start:"10:00",end:"19:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[3]},
    { id:"es-s2",name:"Pooja Raina",role:"Waxing Specialist",rating:4.6,reviews:42,avatarColor:"#18AFC7",initials:"PR",yearsExperience:4,bio:"Waxing specialist using hygienic roll-on technique.",specializations:["Full Arms Wax","Legs Wax","Hygiene-first"],serviceIds:["es-2"],workingHours:{start:"11:00",end:"19:00"},breaks:[{start:"14:30",end:"15:30"}],daysOff:[2]},
  ]},
  { salonId: "groom-room", services: [
    { id:"gr-1",name:"Quick Haircut",description:"Fast no-frills haircut for men.",category:"Hair",durationMin:20,durationLabel:"20 min",priceFrom:180,rating:4.6,reviews:96,image:img(H,1),whatsIncluded:["Quick consult","Cut","Neck shave"],staffIds:["gr-s1","gr-s2"],popular:true},
    { id:"gr-2",name:"Buzz Cut",description:"Single-guard buzz cut.",category:"Hair",durationMin:15,durationLabel:"15 min",priceFrom:150,rating:4.5,reviews:38,image:img(H,2),whatsIncluded:["Buzz cut","Line clean"],staffIds:["gr-s1"]},
    { id:"gr-3",name:"Edge Shave",description:"Straight razor edge shave.",category:"Beard & Grooming",durationMin:15,durationLabel:"15 min",priceFrom:120,rating:4.5,reviews:22,image:img(B,2),whatsIncluded:["Edge shave","Line","Aftercare"],staffIds:["gr-s2"]},
    { id:"gr-4",name:"Cut + Beard Combo",description:"Quick haircut plus beard trim combo.",category:"Hair",durationMin:35,durationLabel:"35 min",priceFrom:320,rating:4.7,reviews:28,image:img(B,3),whatsIncluded:["Haircut","Beard trim","Edge shave"],staffIds:["gr-s1"]},
  ], staff: [
    { id:"gr-s1",name:"Zahid Bhat",role:"Barber",rating:4.6,reviews:112,avatarColor:"#0B91B5",initials:"ZB",yearsExperience:6,bio:"Barber focused on fast, clean cuts. Specialises in buzz cuts and combos.",specializations:["Quick Cuts","Buzz Cuts","Combos"],serviceIds:["gr-1","gr-2","gr-4"],workingHours:{start:"10:00",end:"21:30"},breaks:[{start:"15:00",end:"16:00"}],daysOff:[0]},
    { id:"gr-s2",name:"Aadil Khan",role:"Barber",rating:4.5,reviews:56,avatarColor:"#1D4653",initials:"AK",yearsExperience:4,bio:"Barber focused on edge shaves and quick cuts.",specializations:["Edge Shave","Quick Cuts"],serviceIds:["gr-1","gr-3"],workingHours:{start:"11:00",end:"21:30"},breaks:[{start:"16:00",end:"17:00"}],daysOff:[1]},
  ]},
  { salonId: "aura-beauty", services: [
    { id:"au-1",name:"Gel Manicure",description:"Long-lasting gel manicure with shape and colour.",category:"Nails",durationMin:45,durationLabel:"45 min",priceFrom:800,rating:4.8,reviews:36,image:img(N,1),whatsIncluded:["Soak","Shape","Cuticle","Gel application","Cure","Top coat"],staffIds:["au-s1"],popular:true},
    { id:"au-2",name:"Nail Art (per nail)",description:"Custom nail art — price per nail.",category:"Nails",durationMin:10,durationLabel:"10 min",priceFrom:80,rating:4.7,reviews:22,image:img(N,2),whatsIncluded:["Design consult","Hand-painted art"],staffIds:["au-s1"]},
    { id:"au-3",name:"Pre-bridal Glow (5-day)",description:"Multi-day pre-bridal glow program. Price on consultation.",category:"Makeup",durationMin:480,durationLabel:"Multi-day",priceFrom:9000,rating:4.8,reviews:12,image:img(M,0),whatsIncluded:["Day 1 consultation","Day 2 facial","Day 3 body polish","Day 4 pre-bridal","Day 5 bridal"],staffIds:["au-s2"]},
    { id:"au-4",name:"Pedicure Spa",description:"Spa pedicure with scrub, mask and massage.",category:"Nails",durationMin:45,durationLabel:"45 min",priceFrom:700,rating:4.7,reviews:28,image:img(N,3),whatsIncluded:["Soak","Scrub","Mask","Massage","Polish"],staffIds:["au-s1"]},
  ], staff: [
    { id:"au-s1",name:"Nimrata Singh",role:"Nail Artist",rating:4.8,reviews:64,avatarColor:"#0B91B5",initials:"NS",yearsExperience:5,bio:"Nail artist trained in Mumbai. Specialises in gel manicure and intricate nail art.",specializations:["Gel Manicure","Nail Art","Pedicure Spa"],serviceIds:["au-1","au-2","au-4"],workingHours:{start:"10:00",end:"20:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[2]},
    { id:"au-s2",name:"Ayesha Roshan",role:"Bridal Artist",rating:4.9,reviews:48,avatarColor:"#18AFC7",initials:"AR",yearsExperience:8,bio:"Bridal and pre-bridal specialist with 8 years of wedding-season experience.",specializations:["Pre-bridal Programs","Bridal HD Makeup"],serviceIds:["au-3"],workingHours:{start:"11:00",end:"20:00"},breaks:[{start:"15:00",end:"16:00"}],daysOff:[1]},
  ]},
  { salonId: "style-hub", services: [
    { id:"sh-1",name:"Family Haircut (4 pax)",description:"Family haircut package for 4 people.",category:"Hair",durationMin:60,durationLabel:"60 min",priceFrom:1100,rating:4.7,reviews:24,image:img(P,4),whatsIncluded:["4 haircuts","Consultations","Finishing"],staffIds:["sh-s1","sh-s2"]},
    { id:"sh-2",name:"Spa Day Package",description:"Full spa day with facial, massage and hair spa.",category:"Treatments",durationMin:120,durationLabel:"120 min",priceFrom:2500,rating:4.8,reviews:18,image:img(P,5),whatsIncluded:["Facial","Head massage","Hair spa","Foot massage"],staffIds:["sh-s2"]},
    { id:"sh-3",name:"Global Colour",description:"Full-head colour with premium products.",category:"Hair",durationMin:90,durationLabel:"90 min",priceFrom:1600,rating:4.6,reviews:22,image:img(H,3),whatsIncluded:["Consultation","Colour","Processing","Wash & style"],staffIds:["sh-s1"]},
    { id:"sh-4",name:"Bridal Mehandi",description:"Intricate bridal mehandi application.",category:"Makeup",durationMin:120,durationLabel:"120 min",priceFrom:2500,rating:4.7,reviews:14,image:img(M,4),whatsIncluded:["Both hands","Both feet","Intricate design"],staffIds:["sh-s2"]},
  ], staff: [
    { id:"sh-s1",name:"Vikram Khanna",role:"Salon Director",rating:4.7,reviews:124,avatarColor:"#0B91B5",initials:"VK",yearsExperience:14,bio:"Salon director with 14 years of experience across India. Oversees the family-booking program and colour services.",specializations:["Family Cuts","Global Colour","Salon Management"],serviceIds:["sh-1","sh-3"],workingHours:{start:"09:00",end:"21:00"},breaks:[{start:"13:00",end:"14:00"}],daysOff:[0]},
    { id:"sh-s2",name:"Shazia Bhat",role:"Spa Lead",rating:4.6,reviews:78,avatarColor:"#18AFC7",initials:"SB",yearsExperience:7,bio:"Spa lead specialising in bridal mehandi, facials and head massage.",specializations:["Spa Day","Bridal Mehandi","Massage"],serviceIds:["sh-1","sh-2","sh-4"],workingHours:{start:"10:00",end:"21:00"},breaks:[{start:"14:00",end:"15:00"}],daysOff:[1]},
  ]},
];

export function getSalonServiceData(salonId: string): SalonServiceData | undefined {
  return salonServicesData.find((s) => s.salonId === salonId);
}
export function getSalonServices(salonId: string): SalonServiceFull[] {
  return getSalonServiceData(salonId)?.services ?? [];
}
export function getServiceById(salonId: string, serviceId: string): SalonServiceFull | undefined {
  return getSalonServices(salonId).find((s) => s.id === serviceId);
}
export function getSalonStaff(salonId: string): StaffMemberFull[] {
  return getSalonServiceData(salonId)?.staff ?? [];
}
export function getStaffById(salonId: string, staffId: string): StaffMemberFull | undefined {
  return getSalonStaff(salonId).find((s) => s.id === staffId);
}
export function getStaffForService(salonId: string, serviceId: string): StaffMemberFull[] {
  const staff = getSalonStaff(salonId);
  return staff.filter((s) => s.serviceIds.includes(serviceId));
}
export function getServicesForStaff(salonId: string, staffId: string): SalonServiceFull[] {
  const staff = getStaffById(salonId, staffId);
  if (!staff) return [];
  const services = getSalonServices(salonId);
  return services.filter((s) => staff.serviceIds.includes(s.id));
}
export function getSalonCategories(salonId: string): SalonCategory[] {
  const services = getSalonServices(salonId);
  const set = new Set<SalonCategory>();
  services.forEach((s) => set.add(s.category));
  return Array.from(set);
}
export function getSalonServiceStats(salonId: string): { serviceCount: number; staffCount: number; categories: SalonCategory[] } {
  const data = getSalonServiceData(salonId);
  return { serviceCount: data?.services.length ?? 0, staffCount: data?.staff.length ?? 0, categories: getSalonCategories(salonId) };
}
export function formatPrice(svc: Pick<SalonServiceFull, "priceFrom" | "priceTo">): string {
  if (svc.priceTo) return `₹${svc.priceFrom} – ₹${svc.priceTo}`;
  return `₹${svc.priceFrom}`;
}
