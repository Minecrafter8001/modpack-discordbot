const { parentPort } = require('worker_threads');
const { loadSettings, checkUpdates, getBotInfo } = require('./botAPIv2');
const schedule = require('node-schedule');
const { createLogger, format, transports } = require('winston');


const logger = createLogger({
    level: getBotInfo('logger_level'),
    format: format.simple(),
    transports: [new transports.Console()]
});

async function automatedUpdateCheck() {
    try {
        logger.debug('Starting automated update check');
        const servers = await loadSettings('global', 'servers');
        logger.debug(`Loaded ${servers.length} servers from settings`);
        
        if (servers && Array.isArray(servers)) {
            for (const server of servers) {
                logger.debug(`Checking server ${server}`);
                const updateChecking = await loadSettings(server, 'autocheckupdates');
                if (!updateChecking) {
                    logger.debug(`Update checking is disabled for server ${server}`);
                    continue;
                }

                const version = await checkUpdates(server);
                if (version) {
                    logger.debug(`Update found for server ${server}: ${version}`);
                    
                    parentPort.postMessage({ serverId: server, version });
                } else {
                    logger.debug(`No update found for server ${server}`);
                }
            }
        } else {
            logger.error('No servers found or servers is not an array.');
            parentPort.postMessage({ error: 'No servers found or servers is not an array.' });
        }
    } catch (error) {
        logger.error(`Error occurred while checking for updates: ${error.message}`);
        parentPort.postMessage({ error: error.message });
    }
}

parentPort.on('message', (message) => {
    if (message === 'stop') {
        logger.debug('Stopping worker');
        job.cancel(); 
        parentPort.close(); 
        process.exit(); 
    }else if (message === 'start') {
        logger.info('worker started');
    }
});

const job = schedule.scheduleJob('0 * * * *', () => {
    logger.debug('Starting automated update check');
    automatedUpdateCheck();
});


