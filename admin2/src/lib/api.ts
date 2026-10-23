// StyleSync Shared Backend API Client for Salon Partner App (admin2)
// Connects to Authoritative Backend at http://localhost:4000/api/v1

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('ss_salon_auth_token', token);
    else localStorage.removeItem('ss_salon_auth_token');
  }
}

export function getApiAuthToken(): string | null {
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('ss_salon_auth_token');
  }
  return authToken;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string; error?: string }> {
  const token = getApiAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        data: null as any,
        error: json.message || json.error || `Request failed with status ${res.status}`,
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      data: null as any,
      error: err.message || 'Network request failed',
    };
  }
}

// Salon partner operational sync methods
export const salonApi = {
  // Bookings
  getBookings: (salonId: string, status?: string) =>
    apiRequest(`/bookings/salon/${salonId}${status ? `?status=${status}` : ''}`),

  updateBookingStatus: (bookingId: string, status: string, reason?: string) =>
    apiRequest(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancellationReason: reason }),
    }),

  // Services
  getServices: (salonId: string) =>
    apiRequest(`/services/salon/${salonId}`),

  createService: (salonId: string, serviceData: { name: string; category: string; price: number; duration: number; description?: string }) =>
    apiRequest('/services/salon', {
      method: 'POST',
      body: JSON.stringify({ salonId, ...serviceData }),
    }),

  updateService: (serviceId: string, updates: { name?: string; price?: number; duration?: number; status?: string; description?: string }) =>
    apiRequest(`/services/salon/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteService: (serviceId: string) =>
    apiRequest(`/services/salon/${serviceId}`, {
      method: 'DELETE',
    }),

  // Staff
  getStaff: (salonId: string) =>
    apiRequest(`/salons/${salonId}/staff`),

  // Salon Details
  getSalonDetails: (salonId: string) =>
    apiRequest(`/salons/${salonId}`),
};
