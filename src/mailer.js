import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Creamos el "transportador" que se encargará de enviar los correos
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu usuario de Gmail
    pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación de Gmail
  },
});

// Solo verificar si hay credenciales configuradas
if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
    process.env.EMAIL_USER !== 'noreply@ugeltalara.gob.pe') {
  transporter.verify().then(() => {
    console.log('✅ Servicio de correo configurado y listo para enviar. 📧');
  }).catch((error) => {
    console.warn('⚠️ Servicio de correo no configurado (esto no afecta otras funcionalidades)');
  });
} else {
  console.log('ℹ️ Servicio de correo no configurado (credenciales no proporcionadas)');
}