const axios = require('axios');
const { htmlToText } = require('html-to-text');
const cheerio = require('cheerio');
const { messageLink } = require('discord.js');
const fs = require('fs').promises;

// Define constants
const apiBaseUrl = 'https://api.curseforge.com/v1/mods/715572';
const apiKey = '  '; // Replace 'YOUR_API_KEY' with your actual CurseForge API key
const dbFilePath = "./settings.json"
// Define headers
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'x-api-key': apiKey
};

let lastfileid = 0;

async function checkupdates(guildid) {
  try {
    // Load the last file ID from the settings file
    const lastFileId = await loadSettings(guildid, 'lastfileid');
    
    // Fetch the latest file ID from the API
    const latestFileId = await getLatest(true);

    // Compare the latest file ID with the last file ID
    if (latestFileId === lastFileId) {
      return false; // No updates
    } else {
      // If there's a new update, fetch and return the update message
      const message = await getFileDetails(latestFileId);
      
      // Optionally, you might want to update the last file ID here
      // Save the latest file ID to the settings file for future checks
      await saveSettings(guildid, 'lastfileid', latestFileId);
      
      return message;
    }
  } catch (error) {
    console.error('Error occurred while checking updates:', error.message);
    return false;
  }
}


// Function to fetch information about the latest file
async function getLatest(returnfileid) {
  try {
    // Fetch latest file
    const response = await axios.get(`${apiBaseUrl}/files`, { headers });
    const files = response.data.data;

    // Find newest file
    let newestFile = null;
    for (const file of files) {
      if (!newestFile || new Date(file.fileDate) > new Date(newestFile.fileDate)) {
        newestFile = file;
      }
    }

    // Fetch details for newest file
    if (!returnfileid) {
      const message = await getFileDetails(newestFile.id);
      return message;
    } else {
      return newestFile.id;
    }
  } catch (err) {
    console.error(`Error occurred while fetching latest file: ${err.message}`);
    return "An Error occurred while fetching latest file /n please contact bot developer";
  }
}

// Function to fetch details about a specific file
async function getFileDetails(fileId) {
  try {
    // Fetch file details
    const response = await axios.get(`${apiBaseUrl}/files/${fileId}`, { headers });
    const fileData = response.data.data;

    // Check if file details are complete
    if (fileData && fileData.fileName && fileData.fileDate) {
      // Convert ISO date string to Unix timestamp (Discord timestamp)
      const fileDate = new Date(fileData.fileDate);
      const discordTimestamp = Math.floor(fileDate.getTime() / 1000);

      const changelog = await getChangelog(fileId);
      const message = `Version Name: ${fileData.fileName}\nVersion Date: <t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)\nChangelog:\n${changelog}`;
      return message;
    } else {
      console.error('File details not found or incomplete in the response.');
      return "File details not found or incomplete in the response.";
    }
  } catch (err) {
    console.error(`Error occurred while fetching file details: ${err.message}`);
    return "An Error occurred while fetching file details /n please contact bot developer";
  }
}

async function getChangelog(fileId) {
  try {
    // Fetch changelog
    const response = await axios.get(`${apiBaseUrl}/files/${fileId}/changelog`, { headers });
    let changelogData = response.data.data;

    // Load the HTML
    const $ = cheerio.load(changelogData);

    // Modify the HTML here as needed
    // For example, to remove extra spaces around "ALWAYS REMEMBER TO BACKUP BEFORE UPDATING", you can do:
    $('p').each((i, el) => {
      if ($(el).text().trim() === 'ALWAYS REMEMBER TO BACKUP BEFORE UPDATING') {
        $(el).prev().remove();
        $(el).next().remove();
      }
    });

    // Get the modified HTML
    changelogData = $.html();

    // Convert HTML to plain text
    const changelogPlainText = htmlToText(changelogData, { wordwrap: false });

    return changelogPlainText;
  } catch (err) {
    console.error(`Error occurred while fetching changelog: ${err.message}`);
    return 'An Error occurred while fetching changelog /n please contact bot developer'
  }
}

// Function to strip HTML tags from text
function stripHtml(html) {
  return html.replace(/<[^>]*>?/gm, '');
}

async function loadSettings(guildId, setting) {
  try {
      const data = await fs.readFile(dbFilePath); // Use dbFilePath variable instead of hardcoded filename
      const settings = JSON.parse(data);
      return settings[guildId] ? settings[guildId][setting] : undefined;
  } catch (error) {
      console.error('Error occurred while loading settings:', error.message);
      return undefined;
  }
}


// Save settings to the JSON database
async function saveSettings(guildId, setting, value) {
  try {
      let settings = {};
      // Load existing settings if the file exists
      try {
          const data = await fs.readFile(dbFilePath);
          settings = JSON.parse(data);
      } catch (error) {
          // If the file doesn't exist or is empty, initialize settings object
          console.error('Settings file not found or empty. Initializing new settings object.');
      }
      
      // Initialize settings for the guild if not already present
      if (!settings[guildId]) {
          settings[guildId] = {};
      }

      // Update the setting value
      settings[guildId][setting] = value;

      // Write updated settings to the file
      await fs.writeFile(dbFilePath, JSON.stringify(settings, null, 2));
      console.log('Settings saved successfully.');
  } catch (error) {
      console.error('Error occurred while saving settings:', error.message);
  }
}


module.exports = { getLatest, getFileDetails, checkupdates, loadSettings, saveSettings };
