// import { supabase } from "../config/supabase.js";

// // GET /api/dashboard/stats
// export const getDashboardStats = async (req, res, next) => {
//   try {
//     const [layouts, blocks, plots, partners, payments] = await Promise.all([
//       supabase.from("layouts").select("id", { count: "exact", head: true }),
//       supabase.from("blocks").select("id", { count: "exact", head: true }),
//       supabase.from("plots").select("status, total_price, paid_amount"),
//       supabase.from("partners").select("id", { count: "exact", head: true }),
//       supabase.from("payments").select("amount"),
//     ]);

//     const plotsData = plots.data || [];
//     const totalPlotValue = plotsData.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
//     const totalCollected = plotsData.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
//     const availablePlots = plotsData.filter((p) => p.status === "Available").length;
//     const soldPlots = plotsData.filter((p) => p.status === "Sold").length;
//     const totalRevenue = (payments.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

//     res.status(200).json({
//       success: true,
//       data: {
//         total_layouts: layouts.count || 0,
//         total_blocks: blocks.count || 0,
//         total_plots: plotsData.length,
//         available_plots: availablePlots,
//         sold_plots: soldPlots,
//         total_partners: partners.count || 0,
//         total_plot_value: totalPlotValue,
//         total_collected: totalCollected,
//         outstanding_balance: totalPlotValue - totalCollected,
//         total_payment_revenue: totalRevenue,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";

// GET /api/dashboard/stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const [layouts, blocks, plots, partners, payments] = await Promise.all([
      db.from("layouts").select("id", { count: "exact", head: true }),
      db.from("blocks").select("id", { count: "exact", head: true }),
      db.from("plots").select("status, total_price, paid_amount"),
      db.from("partners").select("id", { count: "exact", head: true }),
      db.from("payments").select("amount"),
    ]);

    const plotsData = plots.data || [];
    const totalPlotValue = plotsData.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
    const totalCollected = plotsData.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const availablePlots = plotsData.filter((p) => p.status === "Available").length;
    const soldPlots = plotsData.filter((p) => p.status === "Sold").length;
    const totalRevenue = (payments.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        total_layouts: layouts.count || 0,
        total_blocks: blocks.count || 0,
        total_plots: plotsData.length,
        available_plots: availablePlots,
        sold_plots: soldPlots,
        total_partners: partners.count || 0,
        total_plot_value: totalPlotValue,
        total_collected: totalCollected,
        outstanding_balance: totalPlotValue - totalCollected,
        total_payment_revenue: totalRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
};