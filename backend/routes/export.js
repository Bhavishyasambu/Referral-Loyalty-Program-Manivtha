const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/auth');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// GET /api/export/csv - Export bookings to CSV
router.get('/csv', verifyAdmin, async (req, res) => {
  try {
    const queryText = `
      SELECT b.booking_ref, b.tour_name, b.amount, b.status, b.trip_date, u.name as customer_name, u.email as customer_email
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      ORDER BY b.created_at DESC
    `;
    const result = await db.query(queryText);
    const bookings = result.rows;

    const fields = ['booking_ref', 'tour_name', 'amount', 'status', 'trip_date', 'customer_name', 'customer_email'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(bookings);

    res.header('Content-Type', 'text/csv');
    res.attachment('bookings_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('CSV Export error:', err);
    return res.status(500).json({ message: 'Server error generating CSV.', error: err.message });
  }
});

// GET /api/export/pdf - Export bookings summary to PDF
router.get('/pdf', verifyAdmin, async (req, res) => {
  try {
    const queryText = `
      SELECT b.booking_ref, b.tour_name, b.amount, b.status, b.trip_date, u.name as customer_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `;
    const result = await db.query(queryText);
    const bookings = result.rows;

    const doc = new PDFDocument({ margin: 50 });
    res.header('Content-Type', 'application/pdf');
    res.attachment('bookings_report.pdf');
    
    doc.pipe(res);

    doc.fontSize(20).text('Travel Loyalty - Bookings Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    bookings.forEach(b => {
      doc.fontSize(12)
         .font('Helvetica-Bold').text(`Ref: ${b.booking_ref} - ${b.tour_name}`)
         .font('Helvetica').text(`Customer: ${b.customer_name} | Amount: $${parseFloat(b.amount).toFixed(2)} | Status: ${b.status} | Date: ${b.trip_date}`)
         .moveDown(0.5);
      
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('PDF Export error:', err);
    return res.status(500).json({ message: 'Server error generating PDF.', error: err.message });
  }
});

module.exports = router;
