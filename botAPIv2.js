const axios = require('axios');
const { htmlToText } = require('html-to-text');
const cheerio = require('cheerio');
const fsPromises = require('fs').promises;
const fs = require('fs');

// Define constants
const apiBaseUrl = 'https://api.curseforge.com/v1/mods';
const dbFilePath = './settings.json';
const botInfoFilePath = './botinfo.json';

function getBotInfo(item) {
  try {
    if (!fs.existsSync(botInfoFilePath)) {
      console.log('Bot info file not found. Creating new file...');
      fs.writeFileSync(botInfoFilePath, '{' +
        '"bot_token": "YOUR_BOT_TOKEN_HERE",\n' +
        '"curseforge_api_key": "YOUR_API_KEY_HERE",\n' +
        '"application_id": "YOUR_APPLICATION_ID_HERE",\n'+
        '"owner_id": "YOUR_USER_ID_HERE"\n' +
       '}');
      console.log('Bot info file created successfully.\nPlease edit it and restart the script.');
      process.exit();
    }
    const data = fs.readFileSync(botInfoFilePath, 'utf8');
    const botinfo = JSON.parse(data);
    if (botinfo[item] === "YOUR_BOT_TOKEN_HERE" || botinfo[item] === "YOUR_API_KEY_HERE" || botinfo[item] === "YOUR_APPLICATION_ID_HERE" || botinfo[item] === "YOUR_USER_ID_HERE") {
      console.log(`${item} not found in botinfo.json. Please edit it and restart the script.`);
      process.exit();
    }
    return botinfo[item];
  } catch (error) {
    console.error('Error occurred while loading bot info:', error.message);
    return undefined;
  }
}

const apiKey = getBotInfo('curseforge_api_key');

// Define headers for API requests
const headers = {
  'Accept': 'application/json',
  'x-api-key': apiKey
};

async function checkUpdates(guildId) {
  try {
    // Load the last file ID from the settings file
    const lastFileId = await loadSettings(guildId, 'lastfileid');
    const serverVersion = await loadSettings(guildId, 'server_version');
    
    // Fetch the latest file ID from the API
    const latestFileId = await getLatestFileId(guildId);

    // Compare the latest file ID with the last file ID
    if (latestFileId === lastFileId | serverVersion === latestFileId) {
      return false; // No updates
    } else {
      // If there's a new update, fetch and return the update message
      const message = await getFileDetails(latestFileId, guildId);
      
      // Save the latest file ID to the settings file for future checks
      await saveSettings(guildId, 'lastfileid', latestFileId);
      
      return message;
    }
  } catch (error) {
    console.error('Error occurred while checking updates:', error.message);
    return false;
  }
}

// Function to fetch all files of a specified mod from CurseForge API
async function getModFiles(modId, queryParams = {}) {
  try {
      console.log('Fetching mod files...');
      const { gameVersion, modLoaderType, gameVersionTypeId, index, pageSize } = queryParams;
      const params = {
          modId: modId,
          gameVersion: gameVersion,
          modLoaderType: modLoaderType,
          gameVersionTypeId: gameVersionTypeId,
          index: index,
          pageSize: pageSize
      };

      console.log('Sending API request...');
      const response = await axios.get(`${apiBaseUrl}/${modId}/files`, { headers, params });

      if (response.status === 200) {
          console.log('Files fetched successfully');
          console.log(response.data);

          return response.data.data; // Assuming response.data contains the 'data' array
      } else {
          console.error(`Failed to fetch files. Status: ${response.status}`);
          throw new Error(`Failed to fetch files. Status: ${response.status}`);
      }
  } catch (error) {
      console.error('API Error: Failed fetching mod files:', error.message);
      throw error; // Re-throw the error to be handled by the caller
  }
}

// Function to fetch the latest file ID from CurseForge API
async function getLatestFileId(guildId) {
  try {
    const modpackId = await loadSettings(guildId, 'modpackid');
    const response = await axios.get(`${apiBaseUrl}/${modpackId}/files`, { headers });
    const files = response.data.data;

    // Find newest file
    let newestFile = null;
    for (const file of files) {
      if (!newestFile || new Date(file.fileDate) > new Date(newestFile.fileDate)) {
        newestFile = file;
      }
    }

    return newestFile ? newestFile.id : null;
  } catch (error) {
    console.error(`Error occurred while fetching latest file ID: ${error.message}`);
    return null;
  }
}

// Function to fetch the latest file details and changelog from CurseForge API
async function getLatest(returnFileId, guildId) {
  try {
    const modpackId = await loadSettings(guildId, 'modpackid');
    const url = apiBaseUrl + "/" + modpackId + "/files"
    console.log(url)
    const response = await axios.get(url, { headers });
    const files = response.data.data;

    // Find newest file
    let newestFile = null;
    for (const file of files) {
      if (!newestFile || new Date(file.fileDate) > new Date(newestFile.fileDate)) {
        newestFile = file;
      }
    }

    if (returnFileId) {
      return newestFile ? newestFile.id : null;
    } else {
      if (newestFile) {
        const changelog = await getChangelog(newestFile.id, guildId);
        return {
          fileName: newestFile.fileName,
          fileDate: newestFile.fileDate,
          changelog: changelog
        };
      } else {
        return null;
      }
    }
  } catch (error) {
    console.error(`Error occurred while fetching latest file: ${error.message}`);
    return "An error occurred while fetching the latest file. Please contact the bot developer.";
  }
}


// Function to fetch details about a specific file from CurseForge API
async function getFileDetails(fileId, guildId,raw) {
  try {
    const modpackId = await loadSettings(guildId, 'modpackid');
    const response = await axios.get(`${apiBaseUrl}/${modpackId}/files/${fileId}`, { headers });
    const fileData = response.data.data;

    if (fileData && fileData.fileName && fileData.fileDate) {
      const fileDate = new Date(fileData.fileDate);
      const discordTimestamp = Math.floor(fileDate.getTime() / 1000);

      const changelog = await getChangelog(fileId, guildId);
      const message = `**File Name:** ${fileData.fileName}\n` +
                      `**File Date:** <t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)\n` +
                      `**Changelog:**\n${changelog}`;

      if (!raw) {
        return message;
      }
      return {
        fileName: fileData.fileName,
        fileDate: fileData.fileDate,
        changelog: changelog
      };
    } else {
      console.error('File details not found or incomplete in the response.');
      return "File details not found or incomplete in the response.";
    }
  } catch (error) {
    console.error(`Error occurred while fetching file details: ${error.message}`);
    return "An error occurred while fetching file details. Please contact the bot developer.";
  }
}


// Function to fetch changelog for a specific file from CurseForge API
async function getChangelog(fileId, guildId) {
  try {
    const modpackId = await loadSettings(guildId, 'modpackid');
    const response = await axios.get(`${apiBaseUrl}/${modpackId}/files/${fileId}/changelog`, { headers });
    let changelogData = response.data.data;

    const $ = cheerio.load(changelogData);
    $('p').each((i, el) => {
      if ($(el).text().trim() === 'ALWAYS REMEMBER TO BACKUP BEFORE UPDATING') {
        $(el).prev().remove();
        $(el).next().remove();
      }
    });

    changelogData = $.html();
    const changelogPlainText = htmlToText(changelogData, { wordwrap: false });

    return changelogPlainText;
  } catch (error) {
    console.error(`Error occurred while fetching changelog: ${error.message}`);
    return 'An error occurred while fetching changelog. Please contact the bot developer.';
  }
}

// Function to load settings from JSON database
async function loadSettings(guildId, setting) {
  try {
    const data = await fsPromises.readFile(dbFilePath); // Use fsPromises
    const settings = JSON.parse(data);
    return settings[guildId] ? settings[guildId][setting] : undefined;
  } catch (error) {
    console.error('Error occurred while loading settings:', error.message);
    return undefined;
  }
}

// Function to save settings to JSON database
async function saveSettings(guildId, setting, value) {
  try {
    let settings = {};
    try {
      const data = await fsPromises.readFile(dbFilePath);
      settings = JSON.parse(data);
    } catch (error) {
      console.error('Settings file not found or empty. Initializing new settings object.');
    }

    if (!settings[guildId]) {
      settings[guildId] = {};
    }

    settings[guildId][setting] = value;

    await fsPromises.writeFile(dbFilePath, JSON.stringify(settings, null, 2));
    console.log('Settings saved successfully.');
  } catch (error) {
    console.error('Error occurred while saving settings:', error.message);
  }
}

module.exports = { getModFiles, getLatestFileId, getFileDetails, checkUpdates, saveSettings, loadSettings, getBotInfo, getLatest };
