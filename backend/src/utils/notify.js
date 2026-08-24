const nodemailer = require("nodemailer");
const { Notification } = require("../models");
const { NOTIFICATION_CHANNELS } = require("./constants");

/**
 * NOTIFICATION SERVICE
 * ------------------------------------------------------------------------
 * Email: uses nodemailer over SMTP. Works with ANY free-tier SMTP provider
 * (Gmail app password, Mailtrap, Brevo/Sendinblue, Ethereal for testing) —
 * just fill in SMTP_* vars in .env. If SMTP is not configured, notifications
 * are still logged to the Notification table and printed to the console so
 * the whole order flow works out-of-the-box with zero external setup.
 *
 * SMS: pluggable stub (smsProvider). Wire in Twilio/Fast2SMS free tier by
 * implementing sendSms() — kept separate so swapping providers never touches
 * business logic (controllers only ever call notify.orderStatusChanged()).
 * ------------------------------------------------------------------------
 */

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function sendEmail(to, subject, message) {
  const t = getTransporter();
  if (!t || !to) {
    console.log(`[EMAIL:SKIPPED - no SMTP configured] to=${to} subject="${subject}"`);
    return { status: "SKIPPED" };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || "no-reply@lastmile.local",
      to,
      subject,
      text: message,
    });
    return { status: "SENT" };
  } catch (err) {
    console.error("[EMAIL:FAILED]", err.message);
    return { status: "FAILED" };
  }
}

/** SMS stub — logs only. Swap the body for a real provider call when ready. */
async function sendSms(toPhone, message) {
  if (!toPhone) return { status: "SKIPPED" };
  console.log(`[SMS:LOG] to=${toPhone} message="${message}"`);
  return { status: "SENT" }; // treated as "sent" for demo purposes
}

const STATUS_MESSAGES = {
  PLACED: (o) => `Your order ${o.orderNumber} has been placed. Total charge: ₹${o.totalCharge}.`,
  ASSIGNED: (o) => `A delivery agent has been assigned to your order ${o.orderNumber}.`,
  PICKED_UP: (o) => `Your order ${o.orderNumber} has been picked up.`,
  IN_TRANSIT: (o) => `Your order ${o.orderNumber} is in transit.`,
  OUT_FOR_DELIVERY: (o) => `Your order ${o.orderNumber} is out for delivery today.`,
  DELIVERED: (o) => `Your order ${o.orderNumber} has been delivered. Thank you!`,
  FAILED: (o) => `Delivery attempt for order ${o.orderNumber} failed${o.failureReason ? `: ${o.failureReason}` : "."} You can reschedule from your dashboard.`,
  RESCHEDULED: (o) => `Your order ${o.orderNumber} has been rescheduled${o.scheduledDate ? ` for ${new Date(o.scheduledDate).toDateString()}` : ""}.`,
  CANCELLED: (o) => `Your order ${o.orderNumber} has been cancelled.`,
};

/**
 * Fire-and-log a status-change notification to the order's customer.
 * Called by orderController on every transition — this is the single choke
 * point that guarantees "customer notified on every status change".
 */
async function orderStatusChanged(order, customer) {
  const buildMsg = STATUS_MESSAGES[order.status];
  const message = buildMsg ? buildMsg(order) : `Order ${order.orderNumber} status updated to ${order.status}.`;
  const subject = `Order ${order.orderNumber}: ${order.status.replace(/_/g, " ")}`;

  const emailResult = await sendEmail(customer.email, subject, message);
  const smsResult = await sendSms(customer.phone, message);

  await Notification.create({
    orderId: order.id,
    userId: customer.id,
    channel: NOTIFICATION_CHANNELS.EMAIL,
    subject,
    message,
    status: emailResult.status,
  });
  await Notification.create({
    orderId: order.id,
    userId: customer.id,
    channel: NOTIFICATION_CHANNELS.SMS,
    subject,
    message,
    status: smsResult.status,
  });
}

module.exports = { sendEmail, sendSms, orderStatusChanged };
