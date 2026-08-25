// import { supabase } from "../config/supabase.js";

// // GET /api/payments?user_id=xxx
// export const getAllPayments = async (req, res, next) => {
//   try {
//     let query = supabase.from("payments").select("*").order("date", { ascending: false });
//     if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
//     if (req.query.plot_id) query = query.eq("plot_id", req.query.plot_id);

//     const { data, error } = await query;
//     if (error) throw error;
//     res.status(200).json({ success: true, count: data.length, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/payments
// export const createPayment = async (req, res, next) => {
//   try {
//     const { user_id, plot_id, amount, description } = req.body;
//     if (!user_id || amount === undefined) {
//       return res.status(400).json({ success: false, message: "user_id and amount are required" });
//     }

//     const { data, error } = await supabase
//       .from("payments")
//       .insert([{ user_id, plot_id, amount, description, date: new Date().toISOString() }])
//       .select()
//       .single();

//     if (error) throw error;

//     // Auto-update plot's paid_amount if plot_id provided
//     if (plot_id) {
//       const { data: plot } = await supabase
//         .from("plots").select("total_price, paid_amount").eq("id", plot_id).single();
//       if (plot) {
//         const newPaid = (Number(plot.paid_amount) || 0) + Number(amount);
//         const balance = plot.total_price - newPaid;
//         let payment_status = "Not Paid";
//         if (newPaid >= plot.total_price) payment_status = "Fully Paid";
//         else if (newPaid > 0) payment_status = "Partially Paid";

//         await supabase.from("plots")
//           .update({ paid_amount: newPaid, balance_amount: balance, payment_status })
//           .eq("id", plot_id);
//       }
//     }

//     res.status(201).json({ success: true, data });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE /api/payments/:id
// export const deletePayment = async (req, res, next) => {
//   try {
//     const { error } = await supabase.from("payments").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.status(200).json({ success: true, message: "Payment deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
import { tenantDb } from "../utils/tenantDb.js";

// GET /api/payments?user_id=xxx
export const getAllPayments = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    let query = db.from("payments").select("*").order("date", { ascending: false });
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
    if (req.query.plot_id) query = query.eq("plot_id", req.query.plot_id);

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments
export const createPayment = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { user_id, plot_id, amount, description } = req.body;
    if (!user_id || amount === undefined) {
      return res.status(400).json({ success: false, message: "user_id and amount are required" });
    }

    const { data, error } = await db
      .from("payments")
      .insert([{ user_id, plot_id, amount, description, date: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;

    // Auto-update plot's paid_amount if plot_id provided
    if (plot_id) {
      const { data: plot } = await db
        .from("plots").select("total_price, paid_amount").eq("id", plot_id).single();
      if (plot) {
        const newPaid = (Number(plot.paid_amount) || 0) + Number(amount);
        const balance = plot.total_price - newPaid;
        let payment_status = "Not Paid";
        if (newPaid >= plot.total_price) payment_status = "Fully Paid";
        else if (newPaid > 0) payment_status = "Partially Paid";

        await db.from("plots")
          .update({ paid_amount: newPaid, balance_amount: balance, payment_status })
          .eq("id", plot_id);
      }
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/payments/:id
export const deletePayment = async (req, res, next) => {
  try {
    const db = tenantDb(req);

    const { error } = await db.from("payments").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Payment deleted" });
  } catch (err) {
    next(err);
  }
};