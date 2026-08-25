// // ============================================================
// // ETOR ADMIN + PARTNER BACKEND
// // All routes inline. Controllers + middleware in separate files.
// // ============================================================

// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import dotenv from "dotenv";
// import multer from "multer";

// // ── Middleware ───────────────────────────────────────────────
// import { authenticate } from "./src/middleware/auth.js";
// import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

// // ── Admin Controllers ────────────────────────────────────────
// import { login, getMe } from "./src/controllers/auth.controller.js";
// import {
//   getAllLayouts, getLayoutById, upsertLayout, updateLayout, deleteLayout,
// } from "./src/controllers/layout.controller.js";
// import {
//   getAllBlocks, getBlockById, upsertBlock, updateBlock, deleteBlock,
// } from "./src/controllers/block.controller.js";
// import {
//   getAllPlots, getPlotById, upsertPlot, updatePlot,
//   updatePlotStatus, updatePayment, assignPlotsToUser, deletePlot,
// } from "./src/controllers/plot.controller.js";
// import {
//   getAllPartners, getPartnerById, createPartner, updatePartner, deletePartner,
// } from "./src/controllers/partnerAdmin.controller.js";
// import {
//   getAllDocuments, getDocumentById, uploadDocument, deleteDocument,
// } from "./src/controllers/document.controller.js";
// import {
//   getAllPayments, createPayment, deletePayment,
// } from "./src/controllers/payment.controller.js";
// import {
//   getCowsForFarm, getAllCows, assignCowsToCustomer, unassignCow,
//   getAssignmentsForCustomer, getAllAssignments,
//   createCow, updateCowLiveFeed, getCowsForUser,
//   getDfmsCows,
// } from "./src/controllers/cow.controller.js";
// import { getDashboardStats } from "./src/controllers/dashboard.controller.js";
// import {
//   getAdminNotifications, getAdminNotificationCount,
//   markAdminNotificationRead, markAllAdminNotificationsRead,
//   getAdminVisitRequests, updateAdminVisitRequest,
//   getAdminTransferRequests, updateAdminTransferRequest,
//   getAdminSupportMessages, getAdminSupportThread, replyToSupportMessage,
// } from "./src/controllers/adminData.controller.js";
// import {
//   getAllEmployees, createEmployee, updateEmployee, deleteEmployee,
// } from "./src/controllers/employee.controller.js";
// import {
//   getTeam, addTeamMember, updateTeamMember, deleteTeamMember,
//   getLeads, createLead, updateLead, deleteLead, addLeadNote, uploadLeadDocument, convertLeadToBooking, getBookings,
// } from "./src/controllers/sales.controller.js";
// import {
//   getMyExpenses, getTeamExpenses, getAllExpenses,
//   createExpense, updateExpenseStatus, reimburseExpense, deleteExpense,
// } from "./src/controllers/travelExpense.controller.js";

// // ── Partner Controllers ──────────────────────────────────────
// import {
//   partnerLogin, getPartnerMe, updatePartnerProfile, changePartnerPassword,
//   uploadAvatar, deleteAvatar,   // ← ADD THESE TWO
// } from "./src/controllers/partnerAuth.controller.js";
// import {
//   getMyCows,
//   getMyPlots, getMyPlotById, getMyTransactions, getMyDocuments,
//   getMyNotifications, markNotificationRead, markAllNotificationsRead,
//   scheduleVisit, getMyVisits, cancelVisit,
//   getMySupportMessages, sendSupportMessage,
//   getMyTransfers, requestOwnershipTransfer, cancelTransfer, getMyDashboard,
// } from "./src/controllers/partnerData.controller.js";

// dotenv.config();

// const app = express();
// app.disable("etag");

// // ============================================================
// // MIDDLEWARE
// // ============================================================
// app.use(helmet({ crossOriginResourcePolicy: false }));

// // ── CORS ─────────────────────────────────────────────────────
// // ALLOWED_ORIGINS in .env should be a comma-separated list of
// // production origins, e.g.:
// //   ALLOWED_ORIGINS=https://etor.com,https://www.etor.com
// // Any localhost/127.0.0.1 origin (any port) is always allowed,
// // since Flutter web's dev server picks a random port each run.
// const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
//   .split(",")
//   .map((o) => o.trim())
//   .filter(Boolean);

// app.use(cors({
//   origin: (origin, callback) => {
//     // Allow non-browser requests (curl, server-to-server, no Origin header)
//     if (!origin) return callback(null, true);

//     // Allow any localhost/127.0.0.1 port — Flutter web dev server uses random ports
//     if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
//       return callback(null, true);
//     }

//     // Allow explicitly whitelisted production origins
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }

//     return callback(new Error(`Not allowed by CORS: ${origin}`));
//   },
//   credentials: true,
// }));

// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(morgan("dev"));

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 25 * 1024 * 1024 },
// });

// // ============================================================
// // HEALTH CHECK
// // ============================================================
// app.get("/", (req, res) => res.send("Etor Backend running 🚀"));
// app.get("/api/test", (req, res) =>
//   res.status(200).json({ success: true, message: "API is working 🚀" })
// );
// app.get("/api/test-supabase", async (req, res) => {
//   const { supabase } = await import("./src/config/supabase.js");
//   const { data, error } = await supabase
//     .from("partners")
//     .select("id, email, is_active")
//     .eq("email", "partner@test.com")
//     .single();
//   res.json({ data, error });
// });
// app.get("/api/test-api-table", async (req, res) => {
//   try {
//     const { supabase } = await import("./src/config/supabase.js");

//     const { data, error } = await supabase
//       .from("test_api")
//       .select("*");

//     res.json({ data, error });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// });

// // ============================================================
// // ADMIN AUTH ROUTES
// // ============================================================
// app.post("/api/auth/login", login);
// app.get("/api/auth/me", authenticate, getMe);

// // ============================================================
// // ADMIN LAYOUT ROUTES
// // ============================================================
// app.get("/api/layouts", authenticate, getAllLayouts);
// app.get("/api/layouts/:id", authenticate, getLayoutById);
// app.post("/api/layouts", authenticate, upsertLayout);
// app.put("/api/layouts/:id", authenticate, updateLayout);
// app.delete("/api/layouts/:id", authenticate, deleteLayout);

// // ============================================================
// // ADMIN BLOCK ROUTES
// // ============================================================
// app.get("/api/blocks", authenticate, getAllBlocks);
// app.get("/api/blocks/:id", authenticate, getBlockById);
// app.post("/api/blocks", authenticate, upsertBlock);
// app.put("/api/blocks/:id", authenticate, updateBlock);
// app.delete("/api/blocks/:id", authenticate, deleteBlock);

// // ============================================================
// // ADMIN PLOT ROUTES
// // ============================================================
// app.get("/api/plots", authenticate, getAllPlots);
// app.post("/api/plots/assign", authenticate, assignPlotsToUser);
// app.get("/api/plots/:id", authenticate, getPlotById);
// app.post("/api/plots", authenticate, upsertPlot);
// app.put("/api/plots/:id", authenticate, updatePlot);
// app.patch("/api/plots/:id/status", authenticate, updatePlotStatus);
// app.patch("/api/plots/:id/payment", authenticate, updatePayment);
// app.delete("/api/plots/:id", authenticate, deletePlot);

// // ============================================================
// // ADMIN PARTNER ROUTES
// // ============================================================
// app.get("/api/partners", authenticate, getAllPartners);
// app.get("/api/partners/:id", authenticate, getPartnerById);
// app.post("/api/partners", authenticate, createPartner);
// app.put("/api/partners/:id", authenticate, updatePartner);
// app.delete("/api/partners/:id", authenticate, deletePartner);

// // ============================================================
// // ADMIN DOCUMENT ROUTES
// // ============================================================
// app.get("/api/documents", authenticate, getAllDocuments);
// app.get("/api/documents/:id", authenticate, getDocumentById);
// app.post("/api/documents", authenticate, upload.single("file"), uploadDocument);
// app.delete("/api/documents/:id", authenticate, deleteDocument);

// // ============================================================
// // ADMIN PAYMENT ROUTES
// // ============================================================
// app.get("/api/payments", authenticate, getAllPayments);
// app.post("/api/payments", authenticate, createPayment);
// app.delete("/api/payments/:id", authenticate, deletePayment);

// // ============================================================
// // ADMIN EMPLOYEE ROUTES
// // ============================================================
// app.get("/api/employees", authenticate, getAllEmployees);
// app.post("/api/employees", authenticate, createEmployee);
// app.put("/api/employees/:id", authenticate, updateEmployee);
// app.delete("/api/employees/:id", authenticate, deleteEmployee);

// // ============================================================
// // SALES TEAM MEMBER ROUTES
// // ============================================================
// app.get("/api/sales/team", authenticate, getTeam);
// app.post("/api/sales/team", authenticate, addTeamMember);
// app.put("/api/sales/team/:id", authenticate, updateTeamMember);
// app.delete("/api/sales/team/:id", authenticate, deleteTeamMember);

// // ============================================================
// // SALES LEAD & BOOKING ROUTES
// // ============================================================
// app.get("/api/sales/leads", authenticate, getLeads);
// app.post("/api/sales/leads", authenticate, createLead);
// app.put("/api/sales/leads/:id", authenticate, updateLead);
// app.delete("/api/sales/leads/:id", authenticate, deleteLead);
// app.post("/api/sales/leads/:id/notes", authenticate, addLeadNote);
// app.post("/api/sales/leads/:id/document", authenticate, upload.single("file"), uploadLeadDocument);
// app.post("/api/sales/leads/:id/convert", authenticate, convertLeadToBooking);
// app.get("/api/sales/bookings", authenticate, getBookings);

// // ============================================================
// // ADMIN TRAVEL EXPENSE ROUTES
// // ============================================================
// app.get("/api/travel-expenses/mine", authenticate, getMyExpenses);
// app.get("/api/travel-expenses/team", authenticate, getTeamExpenses);
// app.get("/api/travel-expenses", authenticate, getAllExpenses);
// app.post("/api/travel-expenses", authenticate, upload.single("file"), createExpense);
// app.patch("/api/travel-expenses/:id/status", authenticate, updateExpenseStatus);
// app.patch("/api/travel-expenses/:id/reimburse", authenticate, reimburseExpense);
// app.delete("/api/travel-expenses/:id", authenticate, deleteExpense);

// // ============================================================
// // ADMIN COW ROUTES
// // ============================================================
// app.get("/api/cows/farms", authenticate, async (req, res) => {
//   try {
//     const { default: fetch } = await import("node-fetch").catch(() => ({ default: globalThis.fetch }));
//     const baseUrl = process.env.DFMS_API_URL || "https://dfms.impacgo.com";
//     const token = process.env.DFMS_ADMIN_TOKEN || "";
//     const response = await fetch(`${baseUrl}/api/admins`, {
//       headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
//     });
//     if (!response.ok) return res.status(200).json({ success: true, data: [] });
//     const data = await response.json();
//     res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
//   } catch {
//     res.status(200).json({ success: true, data: [] });
//   }
// });
// app.get("/api/cows", authenticate, getAllCows);
// app.post("/api/cows", authenticate, createCow);
// app.get("/api/cows/dfms/list", authenticate, getDfmsCows);
// app.get("/api/cows/farm/:farmAdminId", authenticate, getCowsForFarm);
// app.get("/api/cows/assignments", authenticate, getAllAssignments);
// app.get("/api/cows/assignments/:customerId", authenticate, getAssignmentsForCustomer);
// app.get("/api/cows/for-user/:userId", authenticate, getCowsForUser);
// app.post("/api/cows/assign", authenticate, assignCowsToCustomer);
// app.post("/api/cows/assign/remove", authenticate, unassignCow);
// app.delete("/api/cows/assign", authenticate, unassignCow);
// app.patch("/api/cows/:id/live-feed", authenticate, updateCowLiveFeed);

// // ============================================================
// // ADMIN DASHBOARD
// // ============================================================
// app.get("/api/dashboard/stats", authenticate, getDashboardStats);

// // ============================================================
// // ADMIN NOTIFICATIONS + REQUESTS
// // ============================================================
// // mark-all-read MUST come before /:id/read
// app.patch("/api/admin/notifications/mark-all-read", authenticate, markAllAdminNotificationsRead);
// app.get("/api/admin/notifications/count", authenticate, getAdminNotificationCount);
// app.get("/api/admin/notifications", authenticate, getAdminNotifications);
// app.patch("/api/admin/notifications/:id/read", authenticate, markAdminNotificationRead);

// app.get("/api/admin/requests/visits", authenticate, getAdminVisitRequests);
// app.patch("/api/admin/requests/visits/:id", authenticate, updateAdminVisitRequest);

// app.get("/api/admin/requests/transfers", authenticate, getAdminTransferRequests);
// app.patch("/api/admin/requests/transfers/:id", authenticate, updateAdminTransferRequest);

// app.get("/api/admin/requests/support", authenticate, getAdminSupportMessages);
// app.get("/api/admin/support/:partnerId/thread", authenticate, getAdminSupportThread);
// app.post("/api/admin/requests/support/:partnerId/reply", authenticate, replyToSupportMessage);

// // ============================================================
// // PARTNER AUTH ROUTES (separate JWT, role: "partner")
// // ============================================================
// app.post("/api/partner-auth/login", partnerLogin);
// app.get("/api/partner-auth/me", authenticate, getPartnerMe);
// app.put("/api/partner-auth/profile", authenticate, updatePartnerProfile);
// app.post("/api/partner-auth/change-password", authenticate, changePartnerPassword);

// // Avatar upload/delete (NEW)
// app.post("/api/partner-auth/avatar", authenticate, upload.single("file"), uploadAvatar);
// app.delete("/api/partner-auth/avatar", authenticate, deleteAvatar);

// // ============================================================
// // PARTNER DATA ROUTES (scoped to logged-in partner)
// // ============================================================
// app.get("/api/partner/dashboard", authenticate, getMyDashboard);

// app.get("/api/partner/cows", authenticate, getMyCows);

// app.get("/api/partner/plots", authenticate, getMyPlots);
// app.get("/api/partner/plots/:id", authenticate, getMyPlotById);

// app.get("/api/partner/transactions", authenticate, getMyTransactions);
// app.get("/api/partner/documents", authenticate, getMyDocuments);
// app.post("/api/partner/documents", authenticate, upload.single("file"), async (req, res, next) => {
//   req.body.related_user_id = req.user.id;
//   return uploadDocument(req, res, next);
// });

// // /mark-all-read MUST come before /:id/read (more specific routes first)
// app.patch("/api/partner/notifications/mark-all-read", authenticate, markAllNotificationsRead);
// app.get("/api/partner/notifications", authenticate, getMyNotifications);
// app.patch("/api/partner/notifications/:id/read", authenticate, markNotificationRead);

// app.post("/api/partner/visits", authenticate, scheduleVisit);
// app.get("/api/partner/visits", authenticate, getMyVisits);
// app.delete("/api/partner/visits/:id", authenticate, cancelVisit);

// app.get("/api/partner/support", authenticate, getMySupportMessages);
// app.post("/api/partner/support", authenticate, sendSupportMessage);

// app.get("/api/partner/ownership-transfer", authenticate, getMyTransfers);
// app.post("/api/partner/ownership-transfer", authenticate, requestOwnershipTransfer);
// app.delete("/api/partner/ownership-transfer/:id", authenticate, cancelTransfer);

// // ============================================================
// // ERROR HANDLERS (must be last)
// // ============================================================
// app.use(notFound);
// app.use(errorHandler);

// // ============================================================
// // START SERVER
// // ============================================================

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`\n🚀 Server running on port ${PORT}`);

// });
// ============================================================
// ETOR ADMIN + PARTNER BACKEND
// All routes inline. Controllers + middleware in separate files.
// ============================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import multer from "multer";

// ── Middleware ───────────────────────────────────────────────
import { authenticate, requireSuperAdmin } from "./src/middleware/auth.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";
import { tenantDb } from "./src/utils/tenantDb.js";
import { startTrialExpiryCron } from "./src/utils/trialExpiryCron.js";

// ── Admin Controllers ────────────────────────────────────────
import { login, getMe, register } from "./src/controllers/auth.controller.js";
import {
  listTenants, getPlatformOverview, extendTrial, setTenantSubscribed, setTenantActive,
} from "./src/controllers/tenantAdmin.controller.js";
import {
  getAllLayouts, getLayoutById, upsertLayout, updateLayout, deleteLayout,
} from "./src/controllers/layout.controller.js";
import {
  getAllBlocks, getBlockById, upsertBlock, updateBlock, deleteBlock,
} from "./src/controllers/block.controller.js";
import {
  getAllPlots, getPlotById, upsertPlot, updatePlot,
  updatePlotStatus, updatePayment, assignPlotsToUser, deletePlot,
} from "./src/controllers/plot.controller.js";
import {
  getAllPartners, getPartnerById, createPartner, updatePartner, deletePartner,
} from "./src/controllers/partnerAdmin.controller.js";
import {
  getAllDocuments, getDocumentById, uploadDocument, deleteDocument,
} from "./src/controllers/document.controller.js";
import {
  getAllPayments, createPayment, deletePayment,
} from "./src/controllers/payment.controller.js";
import {
  getCowsForFarm, getAllCows, assignCowsToCustomer, unassignCow,
  getAssignmentsForCustomer, getAllAssignments,
  createCow, updateCowLiveFeed, getCowsForUser,
  getDfmsCows,
} from "./src/controllers/cow.controller.js";
import { getDashboardStats } from "./src/controllers/dashboard.controller.js";
import {
  getAdminNotifications, getAdminNotificationCount,
  markAdminNotificationRead, markAllAdminNotificationsRead,
  getAdminVisitRequests, updateAdminVisitRequest,
  getAdminTransferRequests, updateAdminTransferRequest,
  getAdminSupportMessages, getAdminSupportThread, replyToSupportMessage,
} from "./src/controllers/adminData.controller.js";
import {
  getAllEmployees, createEmployee, updateEmployee, deleteEmployee,
} from "./src/controllers/employee.controller.js";
import {
  getTeam, addTeamMember, updateTeamMember, deleteTeamMember,
  getLeads, createLead, updateLead, deleteLead, addLeadNote, uploadLeadDocument, convertLeadToBooking, getBookings,
} from "./src/controllers/sales.controller.js";
import {
  getMyExpenses, getTeamExpenses, getAllExpenses,
  createExpense, updateExpenseStatus, reimburseExpense, deleteExpense,
} from "./src/controllers/travelExpense.controller.js";

// ── Partner Controllers ──────────────────────────────────────
import {
  partnerLogin, getPartnerMe, updatePartnerProfile, changePartnerPassword,
  uploadAvatar, deleteAvatar,   // ← ADD THESE TWO
} from "./src/controllers/partnerAuth.controller.js";
import {
  getMyCows,
  getMyPlots, getMyPlotById, getMyTransactions, getMyDocuments,
  getMyNotifications, markNotificationRead, markAllNotificationsRead,
  scheduleVisit, getMyVisits, cancelVisit,
  getMySupportMessages, sendSupportMessage,
  getMyTransfers, requestOwnershipTransfer, cancelTransfer, getMyDashboard,
} from "./src/controllers/partnerData.controller.js";

dotenv.config();

const app = express();
app.disable("etag");

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet({ crossOriginResourcePolicy: false }));

// ── CORS ─────────────────────────────────────────────────────
// Allow every origin (reflects the request's Origin back), any method,
// any headers.
const _corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-schema"],
  optionsSuccessStatus: 204,
};

// Handle preflight for every route first, then apply CORS to all responses.
app.options("*", cors(_corsOptions));
app.use(cors(_corsOptions));



app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// ── Tenant resolution ────────────────────────────────────────
// EVERY controller converted so far calls tenantDb(req), which reads
// req.tenantSchema — so it has to be set before ANY route runs, including
// the unauthenticated ones (POST /api/auth/login, POST /api/partner-auth/login),
// since those log in before there's a JWT to derive anything from.
//
// PLACEHOLDER: this reads an `x-tenant-schema` header. Replace this with
// whatever actually identifies a tenant in this app — a subdomain
// (req.hostname), a slug in the URL, a lookup against a domains table, etc.
// Until this matches the real tenant-resolution rule, every tenantDb(req)
// call in every controller will throw or hit the wrong schema.


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/", (req, res) => res.send("Etor Backend running 🚀"));
app.get("/api/test", (req, res) =>
  res.status(200).json({ success: true, message: "API is working 🚀" })
);
app.get("/api/test-supabase", async (req, res) => {
  const db = tenantDb(req);
  const { data, error } = await db
    .from("partners")
    .select("id, email, is_active")
    .eq("email", "partner@test.com")
    .single();
  res.json({ data, error });
});
app.get("/api/test-api-table", async (req, res) => {
  try {
    const db = tenantDb(req);

    const { data, error } = await db
      .from("test_api")
      .select("*");

    res.json({ data, error });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================================
// ADMIN AUTH ROUTES
// ============================================================
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/register", register);
app.get("/api/auth/me", authenticate, getMe);

// ============================================================
// ADMIN LAYOUT ROUTES
// ============================================================
app.get("/api/layouts", authenticate, getAllLayouts);
app.get("/api/layouts/:id", authenticate, getLayoutById);
app.post("/api/layouts", authenticate, upsertLayout);
app.put("/api/layouts/:id", authenticate, updateLayout);
app.delete("/api/layouts/:id", authenticate, deleteLayout);

// ============================================================
// ADMIN BLOCK ROUTES
// ============================================================
app.get("/api/blocks", authenticate, getAllBlocks);
app.get("/api/blocks/:id", authenticate, getBlockById);
app.post("/api/blocks", authenticate, upsertBlock);
app.put("/api/blocks/:id", authenticate, updateBlock);
app.delete("/api/blocks/:id", authenticate, deleteBlock);

// ============================================================
// ADMIN PLOT ROUTES
// ============================================================
app.get("/api/plots", authenticate, getAllPlots);
app.post("/api/plots/assign", authenticate, assignPlotsToUser);
app.get("/api/plots/:id", authenticate, getPlotById);
app.post("/api/plots", authenticate, upsertPlot);
app.put("/api/plots/:id", authenticate, updatePlot);
app.patch("/api/plots/:id/status", authenticate, updatePlotStatus);
app.patch("/api/plots/:id/payment", authenticate, updatePayment);
app.delete("/api/plots/:id", authenticate, deletePlot);

// ============================================================
// ADMIN PARTNER ROUTES
// ============================================================
app.get("/api/partners", authenticate, getAllPartners);
app.get("/api/partners/:id", authenticate, getPartnerById);
app.post("/api/partners", authenticate, createPartner);
app.put("/api/partners/:id", authenticate, updatePartner);
app.delete("/api/partners/:id", authenticate, deletePartner);

// ============================================================
// ADMIN DOCUMENT ROUTES
// ============================================================
app.get("/api/documents", authenticate, getAllDocuments);
app.get("/api/documents/:id", authenticate, getDocumentById);
app.post("/api/documents", authenticate, upload.single("file"), uploadDocument);
app.delete("/api/documents/:id", authenticate, deleteDocument);

// ============================================================
// ADMIN PAYMENT ROUTES
// ============================================================
app.get("/api/payments", authenticate, getAllPayments);
app.post("/api/payments", authenticate, createPayment);
app.delete("/api/payments/:id", authenticate, deletePayment);

// ============================================================
// ADMIN EMPLOYEE ROUTES
// ============================================================
app.get("/api/employees", authenticate, getAllEmployees);
app.post("/api/employees", authenticate, createEmployee);
app.put("/api/employees/:id", authenticate, updateEmployee);
app.delete("/api/employees/:id", authenticate, deleteEmployee);

// ============================================================
// SALES TEAM MEMBER ROUTES
// ============================================================
app.get("/api/sales/team", authenticate, getTeam);
app.post("/api/sales/team", authenticate, addTeamMember);
app.put("/api/sales/team/:id", authenticate, updateTeamMember);
app.delete("/api/sales/team/:id", authenticate, deleteTeamMember);

// ============================================================
// SALES LEAD & BOOKING ROUTES
// ============================================================
app.get("/api/sales/leads", authenticate, getLeads);
app.post("/api/sales/leads", authenticate, createLead);
app.put("/api/sales/leads/:id", authenticate, updateLead);
app.delete("/api/sales/leads/:id", authenticate, deleteLead);
app.post("/api/sales/leads/:id/notes", authenticate, addLeadNote);
app.post("/api/sales/leads/:id/document", authenticate, upload.single("file"), uploadLeadDocument);
app.post("/api/sales/leads/:id/convert", authenticate, convertLeadToBooking);
app.get("/api/sales/bookings", authenticate, getBookings);

// ============================================================
// ADMIN TRAVEL EXPENSE ROUTES
// ============================================================
app.get("/api/travel-expenses/mine", authenticate, getMyExpenses);
app.get("/api/travel-expenses/team", authenticate, getTeamExpenses);
app.get("/api/travel-expenses", authenticate, getAllExpenses);
app.post("/api/travel-expenses", authenticate, upload.single("file"), createExpense);
app.patch("/api/travel-expenses/:id/status", authenticate, updateExpenseStatus);
app.patch("/api/travel-expenses/:id/reimburse", authenticate, reimburseExpense);
app.delete("/api/travel-expenses/:id", authenticate, deleteExpense);

// ============================================================
// ADMIN COW ROUTES
// ============================================================
app.get("/api/cows/farms", authenticate, async (req, res) => {
  try {
    const { default: fetch } = await import("node-fetch").catch(() => ({ default: globalThis.fetch }));
    const baseUrl = process.env.DFMS_API_URL || "https://dfms.impacgo.com";
    const token = process.env.DFMS_ADMIN_TOKEN || "";
    const response = await fetch(`${baseUrl}/api/admins`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) return res.status(200).json({ success: true, data: [] });
    const data = await response.json();
    res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch {
    res.status(200).json({ success: true, data: [] });
  }
});
app.get("/api/cows", authenticate, getAllCows);
app.post("/api/cows", authenticate, createCow);
app.get("/api/cows/dfms/list", authenticate, getDfmsCows);
app.get("/api/cows/farm/:farmAdminId", authenticate, getCowsForFarm);
app.get("/api/cows/assignments", authenticate, getAllAssignments);
app.get("/api/cows/assignments/:customerId", authenticate, getAssignmentsForCustomer);
app.get("/api/cows/for-user/:userId", authenticate, getCowsForUser);
app.post("/api/cows/assign", authenticate, assignCowsToCustomer);
app.post("/api/cows/assign/remove", authenticate, unassignCow);
app.delete("/api/cows/assign", authenticate, unassignCow);
app.patch("/api/cows/:id/live-feed", authenticate, updateCowLiveFeed);

// ============================================================
// ADMIN DASHBOARD
// ============================================================
app.get("/api/dashboard/stats", authenticate, getDashboardStats);

// ============================================================
// PLATFORM SUPER ADMIN — TENANTS / TRIAL / SUBSCRIPTION
// (cross-tenant; requires is_platform_admin, not just role: super_admin —
// every org's own admin also carries that role, scoped to their own tenant)
// ============================================================
app.get("/api/admin/overview", authenticate, requireSuperAdmin, getPlatformOverview);
app.get("/api/admin/tenants", authenticate, requireSuperAdmin, listTenants);
app.patch("/api/admin/tenants/:id/extend-trial", authenticate, requireSuperAdmin, extendTrial);
app.patch("/api/admin/tenants/:id/subscription", authenticate, requireSuperAdmin, setTenantSubscribed);
app.patch("/api/admin/tenants/:id/status", authenticate, requireSuperAdmin, setTenantActive);

// ============================================================
// ADMIN NOTIFICATIONS + REQUESTS
// ============================================================
// mark-all-read MUST come before /:id/read
app.patch("/api/admin/notifications/mark-all-read", authenticate, markAllAdminNotificationsRead);
app.get("/api/admin/notifications/count", authenticate, getAdminNotificationCount);
app.get("/api/admin/notifications", authenticate, getAdminNotifications);
app.patch("/api/admin/notifications/:id/read", authenticate, markAdminNotificationRead);

app.get("/api/admin/requests/visits", authenticate, getAdminVisitRequests);
app.patch("/api/admin/requests/visits/:id", authenticate, updateAdminVisitRequest);

app.get("/api/admin/requests/transfers", authenticate, getAdminTransferRequests);
app.patch("/api/admin/requests/transfers/:id", authenticate, updateAdminTransferRequest);

app.get("/api/admin/requests/support", authenticate, getAdminSupportMessages);
app.get("/api/admin/support/:partnerId/thread", authenticate, getAdminSupportThread);
app.post("/api/admin/requests/support/:partnerId/reply", authenticate, replyToSupportMessage);

// ============================================================
// PARTNER AUTH ROUTES (separate JWT, role: "partner")
// ============================================================
app.post("/api/partner-auth/login", partnerLogin);
app.get("/api/partner-auth/me", authenticate, getPartnerMe);
app.put("/api/partner-auth/profile", authenticate, updatePartnerProfile);
app.post("/api/partner-auth/change-password", authenticate, changePartnerPassword);

// Avatar upload/delete (NEW)
app.post("/api/partner-auth/avatar", authenticate, upload.single("file"), uploadAvatar);
app.delete("/api/partner-auth/avatar", authenticate, deleteAvatar);

// ============================================================
// PARTNER DATA ROUTES (scoped to logged-in partner)
// ============================================================
app.get("/api/partner/dashboard", authenticate, getMyDashboard);

app.get("/api/partner/cows", authenticate, getMyCows);

app.get("/api/partner/plots", authenticate, getMyPlots);
app.get("/api/partner/plots/:id", authenticate, getMyPlotById);

app.get("/api/partner/transactions", authenticate, getMyTransactions);
app.get("/api/partner/documents", authenticate, getMyDocuments);
app.post("/api/partner/documents", authenticate, upload.single("file"), async (req, res, next) => {
  req.body.related_user_id = req.user.id;
  return uploadDocument(req, res, next);
});

// /mark-all-read MUST come before /:id/read (more specific routes first)
app.patch("/api/partner/notifications/mark-all-read", authenticate, markAllNotificationsRead);
app.get("/api/partner/notifications", authenticate, getMyNotifications);
app.patch("/api/partner/notifications/:id/read", authenticate, markNotificationRead);

app.post("/api/partner/visits", authenticate, scheduleVisit);
app.get("/api/partner/visits", authenticate, getMyVisits);
app.delete("/api/partner/visits/:id", authenticate, cancelVisit);

app.get("/api/partner/support", authenticate, getMySupportMessages);
app.post("/api/partner/support", authenticate, sendSupportMessage);

app.get("/api/partner/ownership-transfer", authenticate, getMyTransfers);
app.post("/api/partner/ownership-transfer", authenticate, requestOwnershipTransfer);
app.delete("/api/partner/ownership-transfer/:id", authenticate, cancelTransfer);

// ============================================================
// ERROR HANDLERS (must be last)
// ============================================================
app.use(notFound);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  startTrialExpiryCron();
});
