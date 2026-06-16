import { pool } from '../database/conexion.js';

async function applyFix() {
    try {
        console.log('🔌 Conectando a la base de datos...');
        const connection = await pool.getConnection();
        console.log('✅ Conexión establecida.');

        // Verificar el valor actual
        const [rowsBefore] = await connection.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('📊 Valor actual:', rowsBefore);

        console.log('🔧 Intentando aumentar max_allowed_packet a 500MB (GLOBAL)...');

        try {
            await connection.query('SET GLOBAL max_allowed_packet = 524288000');
            console.log('✅ max_allowed_packet actualizado correctamente (GLOBAL).');
        } catch (err) {
            console.error('❌ Error al actualizar GLOBAL max_allowed_packet:', err.message);
        }

        // Verificar el valor después (puede requerir nueva conexión para ver el cambio global reflejado en sesión, pero SHOW GLOBAL VARIABLES debería mostrarlo)
        const [rowsAfter] = await connection.query("SHOW GLOBAL VARIABLES LIKE 'max_allowed_packet'");
        console.log('📊 Valor GLOBAL actual:', rowsAfter);

        connection.release();
        console.log('✨ Script finalizado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error general:', error);
        process.exit(1);
    }
}

applyFix();
