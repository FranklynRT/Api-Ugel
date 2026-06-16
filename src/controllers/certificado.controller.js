// ============================================================
// CONTROLADOR: GENERAR CERTIFICADO DE PARTICIPACIÓN - UGEL TALARA
// ============================================================
// NOTA: Esta función ha sido deshabilitada. Los certificados ahora se generan desde el frontend.

// import { pool } from '../database/conexion.js';
// import PDFDocument from 'pdfkit';
// import QRCode from 'qrcode';
// import jwt from 'jsonwebtoken';

// ============================================================
// FUNCIÓN PRINCIPAL: generarCertificado
// ============================================================
export const generarCertificado = async (req, res) => {
  // Función deshabilitada - Los certificados se generan desde el frontend
  res.status(410).json({ 
    error: 'Esta función ha sido deshabilitada',
    message: 'Los certificados ahora se generan desde el frontend del sistema.'
  });
};