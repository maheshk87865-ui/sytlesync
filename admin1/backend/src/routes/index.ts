/**
 * API v1 routes — registers every module under /api/v1/.
 * ------------------------------------------------------------
 * Mount order matters: more specific routes (e.g. /search/salons)
 * must be registered before generic ones (e.g. /:id) to avoid
 * being shadowed.
 */

import { Router } from "express";
import healthRouter from "./health";
import authRouter from "../modules/auth";
import customersRouter from "../modules/customers";
import salonsRouter from "../modules/salons";
import servicesRouter from "../modules/services";
import searchRouter from "../modules/search";
import availabilityRouter from "../modules/availability";
import bookingsRouter from "../modules/bookings";
import paymentsRouter from "../modules/payments";
import reviewsRouter from "../modules/reviews";
import favoritesRouter from "../modules/favorites";
import notificationsRouter from "../modules/notifications";
import aiRouter from "../modules/ai";
import photosRouter from "../modules/photos";
import supportRouter from "../modules/support";
import categoriesRouter from "../modules/categories";
import historyRouter from "../modules/history";
import locationRouter from "../modules/location";
import { guardDatabase } from "../middleware/guard-database";
import { authLimiter, aiLimiter, uploadLimiter, searchLimiter, bookingLimiter, paymentLimiter, reviewLimiter } from "../middleware/rate-limiter";

export const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authLimiter, authRouter);  // auth limiter; guardDatabase applied per-route inside auth module
apiV1Router.use("/customers", customersRouter);
// Public discovery routes — DB guard + search rate limiter (these are read-only public routes)
apiV1Router.use("/salons", guardDatabase, searchLimiter, salonsRouter);
apiV1Router.use("/services", guardDatabase, servicesRouter);
apiV1Router.use("/categories", guardDatabase, categoriesRouter);
apiV1Router.use("/search", guardDatabase, searchLimiter, searchRouter);
apiV1Router.use("/locations", guardDatabase, locationRouter);
// Availability + reviews have MIXED public/protected routes — DB guard applied per-route
// (after requireAuth on protected routes so auth check runs first when DB is down)
apiV1Router.use("/availability", availabilityRouter);
apiV1Router.use("/bookings", bookingLimiter, bookingsRouter);  // booking rate limiter
apiV1Router.use("/payments", paymentLimiter, paymentsRouter);  // payment rate limiter
apiV1Router.use("/reviews", reviewLimiter, reviewsRouter);  // review rate limiter
apiV1Router.use("/favorites", favoritesRouter);
apiV1Router.use("/history", historyRouter);
apiV1Router.use("/notifications", notificationsRouter);
apiV1Router.use("/ai", aiLimiter, aiRouter);  // AI rate limiter (strict)
apiV1Router.use("/photos", uploadLimiter, photosRouter);  // upload rate limiter
apiV1Router.use("/support", supportRouter);
