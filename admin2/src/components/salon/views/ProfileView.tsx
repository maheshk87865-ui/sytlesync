'use client';
import { useState } from 'react';
import { useSalonStore } from '@/lib/store';
import { PageHeader } from '../ui';
import { Stars, SafeImage, formatTime } from '../shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Store, MapPin, Phone, Mail, Clock, Camera, X, Plus, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };

export function ProfileView() {
  const salon = useSalonStore(s => s.salon);
  const updateSalon = useSalonStore(s => s.updateSalon);
  const services = useSalonStore(s => s.services);
  const staff = useSalonStore(s => s.staff);
  const reviews = useSalonStore(s => s.reviews);
  const pushToast = useSalonStore(s => s.pushToast);

  const [tab, setTab] = useState<'PREVIEW' | 'EDIT' | 'LOCATION' | 'PHOTOS'>('PREVIEW');

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : salon.rating;
  const activeServices = services.filter(s => s.active);

  return (
    <div>
      <PageHeader title="Salon Profile" subtitle="How customers see your salon" />

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {(['PREVIEW', 'EDIT', 'LOCATION', 'PHOTOS'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3.5 py-1.5 text-sm font-semibold rounded-xl border whitespace-nowrap transition-colors',
              tab === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted')}>
            {t === 'PREVIEW' ? 'Customer Preview' : t === 'EDIT' ? 'Edit Profile' : t === 'LOCATION' ? 'Location' : 'Photos'}
          </button>
        ))}
      </div>

      {tab === 'PREVIEW' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Cover */}
          <div className="h-40 sm:h-56 relative">
            <SafeImage
              src={salon.coverImage}
              alt={salon.name}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full flex items-center justify-center"
              rounded="none"
              showTextInFallback={false}
            />
          </div>
          {/* Logo + name */}
          <div className="p-5 -mt-12 sm:-mt-16 relative">
            <SafeImage
              src={salon.logo}
              alt={salon.name}
              className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-card object-cover"
              fallbackClassName="w-20 h-20 sm:w-24 sm:h-24 border-4 border-card flex items-center justify-center"
              rounded="2xl"
            />
            <div className="mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{salon.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-status-completed text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-completed" /> Open now
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={avgRating} />
                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">· {salon.totalReviews} reviews</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{salon.area}, {salon.city}</p>
            </div>
          </div>
          {/* About */}
          <div className="px-5 pb-5">
            <h3 className="font-semibold mb-1.5">About</h3>
            <p className="text-sm text-muted-foreground">{salon.about}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <InfoRow icon={MapPin} label="Address" value={salon.address} />
              <InfoRow icon={Phone} label="Phone" value={salon.phone} />
              <InfoRow icon={Mail} label="Email" value={salon.email} />
              <InfoRow icon={Clock} label="Today" value={`${salon.openingHours.monday.open} - ${salon.openingHours.monday.close}`} />
            </div>
            {/* Amenities */}
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Amenities</p>
              <div className="flex gap-2 flex-wrap">
                {salon.amenities.map(a => (
                  <span key={a} className="px-3 py-1.5 rounded-lg bg-accent/40 text-xs font-medium">{a}</span>
                ))}
              </div>
            </div>
            {/* Services preview */}
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Active Services ({activeServices.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeServices.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                    {s.image && <img src={s.image} alt={s.name} className="w-10 h-10 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.category} · ₹{s.price} · {s.duration}min</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Staff preview */}
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Our Team ({staff.length})</p>
              <div className="flex gap-3 flex-wrap">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <img src={s.photo} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'EDIT' && <EditProfile salon={salon} updateSalon={updateSalon} pushToast={pushToast} />}

      {tab === 'LOCATION' && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Location & Address</h3>
          <LocationEditor salon={salon} updateSalon={updateSalon} pushToast={pushToast} />
        </div>
      )}

      {tab === 'PHOTOS' && <PhotosEditor salon={salon} updateSalon={updateSalon} pushToast={pushToast} />}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-accent/40 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function EditProfile({ salon, updateSalon, pushToast }: any) {
  const [name, setName] = useState(salon.name);
  const [description, setDescription] = useState(salon.description);
  const [about, setAbout] = useState(salon.about);
  const [phone, setPhone] = useState(salon.phone);
  const [email, setEmail] = useState(salon.email);
  const [address, setAddress] = useState(salon.address);
  const [logo, setLogo] = useState(salon.logo);
  const [coverImage, setCoverImage] = useState(salon.coverImage);
  const [amenities, setAmenities] = useState<string[]>(salon.amenities);
  const [newAmenity, setNewAmenity] = useState('');
  const [openingHours, setOpeningHours] = useState(salon.openingHours);

  const save = () => {
    updateSalon({ name, description, about, phone, email, address, logo, coverImage, amenities, openingHours });
    pushToast('Profile updated', 'success');
  };

  const updateDay = (day: string, field: string, value: any) =>
    setOpeningHours((prev: any) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Basic Information</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Salon Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>About Salon</Label>
            <Textarea rows={3} value={about} onChange={(e) => setAbout(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input value={logo} onChange={(e) => setLogo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cover Image URL</Label>
              <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Amenities</h3>
        <div className="flex gap-2 flex-wrap mb-3">
          {amenities.map((a: string) => (
            <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/40 text-xs font-medium">
              {a}
              <button onClick={() => setAmenities(amenities.filter((x: string) => x !== a))} className="hover:text-status-cancelled"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Add amenity..." value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} />
          <Button size="sm" onClick={() => { if (newAmenity.trim()) { setAmenities([...amenities, newAmenity.trim()]); setNewAmenity(''); } }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Opening Hours</h3>
        <div className="space-y-1.5">
          {DAYS.map(day => {
            const ds = openingHours[day];
            return (
              <div key={day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <span className="font-medium text-sm w-24">{DAY_LABELS[day]}</span>
                <input type="time" value={ds.open} disabled={ds.closed} onChange={(e) => updateDay(day, 'open', e.target.value)} className="text-xs px-2 py-1 rounded bg-card border border-border flex-1 disabled:opacity-50" />
                <input type="time" value={ds.close} disabled={ds.closed} onChange={(e) => updateDay(day, 'close', e.target.value)} className="text-xs px-2 py-1 rounded bg-card border border-border flex-1 disabled:opacity-50" />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={ds.closed} onChange={(e) => updateDay(day, 'closed', e.target.checked)} className="accent-primary" />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={save} className="w-full">Save Profile Changes</Button>
    </div>
  );
}

function LocationEditor({ salon, updateSalon, pushToast }: any) {
  const [address, setAddress] = useState(salon.address);
  const [area, setArea] = useState(salon.area);
  const [city, setCity] = useState(salon.city);
  const [latitude, setLatitude] = useState(String(salon.latitude));
  const [longitude, setLongitude] = useState(String(salon.longitude));

  const save = () => {
    updateSalon({ address, area, city, latitude: Number(latitude), longitude: Number(longitude) });
    pushToast('Location updated', 'success');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Area</Label>
          <Input value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Latitude</Label>
          <Input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Longitude</Label>
          <Input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg bg-accent/30 p-3 text-xs text-muted-foreground">
        <p>💡 This location data drives customer-side features like:</p>
        <ul className="list-disc pl-4 mt-1 space-y-0.5">
          <li>Distance calculation in customer app</li>
          <li>Maps integration and directions</li>
          <li>Nearby salon discovery</li>
          <li>Currently piloted in <strong>Srinagar</strong> — architecture supports expansion to other cities</li>
        </ul>
      </div>
      <Button onClick={save}>Save Location</Button>
    </div>
  );
}

function PhotosEditor({ salon, updateSalon, pushToast }: any) {
  const [photos, setPhotos] = useState<string[]>(salon.photos);
  const [newUrl, setNewUrl] = useState('');

  const add = () => {
    if (newUrl.trim()) {
      setPhotos([...photos, newUrl.trim()]);
      setNewUrl('');
    }
  };
  const remove = (i: number) => setPhotos(photos.filter((_, idx) => idx !== i));

  const save = () => {
    updateSalon({ photos });
    pushToast('Photos updated', 'success');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold mb-3">Salon Photos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
            <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button onClick={() => remove(i)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-status-cancelled text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <Input placeholder="Paste image URL..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
        <Button onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>
      <Button onClick={save}>Save Photos</Button>
    </div>
  );
}
