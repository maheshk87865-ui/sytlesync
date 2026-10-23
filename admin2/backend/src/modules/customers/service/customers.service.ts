// ============================================================
// Customers — Service (business logic)
// ============================================================

import { customersRepository } from '../repository/customers.repository.js';
import { NotFoundError } from '../../../middleware/errorHandler.js';

export class CustomersService {
  async list(salonId: string, filters: any) {
    return customersRepository.list(salonId, filters);
  }

  async getById(salonId: string, id: string) {
    const customer = await customersRepository.findById(salonId, id);
    if (!customer) throw new NotFoundError('Customer not found');

    // Fetch next appointment
    const nextAppointment = await customersRepository.getNextAppointment(salonId, id);

    // Fetch favorite services (resolved)
    const favoriteServices = await customersRepository.getPreferredServicesByCustomer(salonId, id);

    return {
      ...customer,
      nextAppointment,
      favoriteServices,
    };
  }

  async create(salonId: string, data: any) {
    return customersRepository.create(salonId, data);
  }

  async update(salonId: string, id: string, data: any) {
    const c = await customersRepository.update(salonId, id, data);
    if (!c) throw new NotFoundError('Customer not found');
    return c;
  }

  async remove(salonId: string, id: string) {
    const ok = await customersRepository.remove(salonId, id);
    if (!ok) throw new NotFoundError('Customer not found');
  }

  // --- Customer history (all bookings, formatted) ---
  async getHistory(salonId: string, customerId: string) {
    // Verify customer exists in this salon
    await this.getById(salonId, customerId);
    const bookings = await customersRepository.getHistory(salonId, customerId);
    return bookings.map((b) => ({
      bookingId: b.id,
      date: b.date,
      serviceName: b.serviceName,
      staffName: b.staffName,
      pricePaise: b.pricePaise,
      status: b.status,
      paymentStatus: b.paymentStatus,
      durationMin: b.durationMin,
      startTime: b.startTime,
      endTime: b.endTime,
    }));
  }

  // --- Customer insights (calculated from actual records) ---
  async getInsights(salonId: string) {
    const [serviceDemand, mostFrequentCustomers, repeatRate, avgSpend] = await Promise.all([
      customersRepository.getServiceDemand(salonId),
      customersRepository.getMostFrequentCustomers(salonId),
      customersRepository.getRepeatRate(salonId),
      customersRepository.getAverageSpend(salonId),
    ]);

    // Least requested services (reverse of most requested)
    const leastRequested = [...serviceDemand].sort((a, b) => (a!.bookingCount - b!.bookingCount)).slice(0, 5);

    return {
      mostRequestedServices: serviceDemand.slice(0, 5),
      leastRequestedServices: leastRequested,
      mostFrequentCustomers,
      repeatRate,
      averageSpend: avgSpend,
    };
  }
}

export const customersService = new CustomersService();
