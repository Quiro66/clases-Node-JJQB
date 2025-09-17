import cron from 'node-cron'
import fs from 'fs-extra'
import path from 'path'
import moment from 'moment'
import { fileURLToPath } from 'url';
import os from 'os';

const currentFile = fileURLToPath(import.meta.url);

// Configuración
const CONFIG = {
    logDir: './logs',
    logFile: 'cron-test.log'
};

// Asegurar que existe el directorio de logs
fs.ensureDirSync(CONFIG.logDir);

// Función de logging
function log(message, level = 'INFO') {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    // Mostrar en consola
    console.log(logMessage);

    // Guardar en archivo
    const logPath = path.join(CONFIG.logDir, CONFIG.logFile);
    fs.appendFileSync(logPath, logMessage + '\n');
}

// Función para obtener información del sistema
function getSystemInfo() {

    return {
        platform: os.platform(),
        architecture: os.arch(),
        hostname: os.hostname(),
        uptime: Math.floor(os.uptime()),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
        freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        nodeVersion: process.version,
        processId: process.pid
    };
}

// Función principal del cron job
function executeTask() {
    try {
        log('=== CRON JOB EJECUTADO ===');

        const sysInfo = getSystemInfo();
        log(`Hostname: ${sysInfo.hostname}`);
        log(`Platform: ${sysInfo.platform} (${sysInfo.architecture})`);
        log(`Uptime: ${sysInfo.uptime} segundos`);
        log(`Memoria: ${sysInfo.freeMemory}MB libre de ${sysInfo.totalMemory}MB total`);
        log(`CPU: ${sysInfo.cpuCount} cores`);
        log(`Load Average: ${sysInfo.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
        log(`Node.js: ${sysInfo.nodeVersion}`);
        log(`Process ID: ${sysInfo.processId}`);

        // Simular algún trabajo
        log('Ejecutando tarea simulada...');

        // Crear un archivo de prueba
        const testFile = path.join(CONFIG.logDir, `test-${moment().format('YYYY-MM-DD-HH-mm-ss')}.txt`);
        const testData = {
            timestamp: new Date().toISOString(),
            message: 'Archivo generado por cron job',
            systemInfo: sysInfo
        };

        fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));
        log(`Archivo de prueba creado: ${testFile}`);

        // Limpiar archivos de prueba antiguos (mantener solo los últimos 5)
        cleanupTestFiles();

        log('=== TAREA COMPLETADA ===');
        log(''); // Línea en blanco

    } catch (error) {
        log(`ERROR: ${error.message}`, 'ERROR');
        log(`Stack: ${error.stack}`, 'ERROR');
    }
}

// Función para limpiar archivos de prueba antiguos
function cleanupTestFiles() {
    try {
        const files = fs.readdirSync(CONFIG.logDir)
            .filter(file => file.startsWith('test-') && file.endsWith('.txt'))
            .map(file => ({
                name: file,
                path: path.join(CONFIG.logDir, file),
                mtime: fs.statSync(path.join(CONFIG.logDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        // Mantener solo los últimos 5 archivos
        const filesToDelete = files.slice(5);

        filesToDelete.forEach(file => {
            fs.removeSync(file.path);
            log(`Archivo antiguo eliminado: ${file.name}`);
        });

        if (filesToDelete.length > 0) {
            log(`${filesToDelete.length} archivos antiguos eliminados`);
        }

    } catch (error) {
        log(`Error limpiando archivos: ${error.message}`, 'ERROR');
    }
}

// Configurar diferentes cron jobs
function setupCronJobs() {
    log('Configurando cron jobs...');

    // Job cada minuto (para pruebas)
    cron.schedule('* * * * *', () => {
        log('Cron job ejecutándose cada minuto');
        executeTask();
    }, {
        scheduled: false, // Iniciar manualmente
        timezone: "America/Bogota"
    });

    // Job cada 5 minutos
    const job5min = cron.schedule('*/5 * * * *', () => {
        log('Cron job ejecutándose cada 5 minutos');
        executeTask();
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    // Job cada hora
    const jobHourly = cron.schedule('0 * * * *', () => {
        log('Cron job ejecutándose cada hora');
        executeTask();

        // Limpiar logs antiguos cada hora
        cleanupOldLogs();
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    // Job diario a las 8:00 AM
    const jobDaily = cron.schedule('0 8 * * *', () => {
        log('Cron job diario ejecutándose a las 8:00 AM');
        executeTask();
        generateDailyReport();
    }, {
        scheduled: true,
        timezone: "America/Bogota"
    });

    log('Cron jobs configurados:');
    log('- Cada 5 minutos: ACTIVO');
    log('- Cada hora: ACTIVO');
    log('- Diario 8:00 AM: ACTIVO');

    return { job5min, jobHourly, jobDaily };
}

// Función para limpiar logs antiguos
function cleanupOldLogs() {
    try {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
        const now = Date.now();

        const logFiles = fs.readdirSync(CONFIG.logDir)
            .filter(file => file.endsWith('.log'))
            .forEach(file => {
                const filePath = path.join(CONFIG.logDir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    fs.removeSync(filePath);
                    log(`Log antiguo eliminado: ${file}`);
                }
            });

    } catch (error) {
        log(`Error limpiando logs: ${error.message}`, 'ERROR');
    }
}

// Función para generar reporte diario
function generateDailyReport() {
    try {
        const reportData = {
            date: moment().format('YYYY-MM-DD'),
            systemInfo: getSystemInfo(),
            logStats: getLogStats(),
            uptime: process.uptime()
        };

        const reportFile = path.join(CONFIG.logDir, `daily-report-${moment().format('YYYY-MM-DD')}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

        log(`Reporte diario generado: ${reportFile}`);

    } catch (error) {
        log(`Error generando reporte diario: ${error.message}`, 'ERROR');
    }
}

// Función para obtener estadísticas de logs
function getLogStats() {
    try {
        const logPath = path.join(CONFIG.logDir, CONFIG.logFile);

        if (!fs.existsSync(logPath)) {
            return { lines: 0, size: 0 };
        }

        const stats = fs.statSync(logPath);
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').length - 1;

        return {
            lines: lines,
            size: stats.size,
            lastModified: stats.mtime
        };

    } catch (error) {
        log(`Error obteniendo stats de logs: ${error.message}`, 'ERROR');
        return { lines: 0, size: 0 };
    }
}

// Manejo de señales del sistema
process.on('SIGINT', () => {
    log('Recibida señal SIGINT, cerrando aplicación...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Recibida señal SIGTERM, cerrando aplicación...');
    process.exit(0);
});

// Función principal
function main() {
    log('=== INICIANDO APLICACIÓN CRON ===');
    log(`Directorio de logs: ${path.resolve(CONFIG.logDir)}`);
    log(`Timezone: America/Bogota`);

    // Ejecutar una vez al inicio para probar
    executeTask();

    // Configurar cron jobs
    const jobs = setupCronJobs();

    log('Aplicación iniciada. Presiona Ctrl+C para salir.');

    // Mantener la aplicación corriendo
    return jobs;
}

// Ejecutar si es el archivo principal
if (process.argv[1] === currentFile) {
    main();
}

const testScript = {
    executeTask,
    setupCronJobs,
    getSystemInfo,
    log
};

export default testScript