const axios = require('axios');
const { format } = require('date-fns');
const { htmlToText } = require('html-to-text');
const cheerio = require('cheerio');
// Define constants
const apiBaseUrl = 'https://api.curseforge.com/v1/mods/715572';
const apiKey = 'not for you'; // Replace 'YOUR_API_KEY' with your actual CurseForge API key

// Define headers
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'x-api-key': apiKey
};

// Function to fetch information about the latest file
async function getLatest() {
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
    const message = await getFileDetails(newestFile.id);
    return message;
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
      const response = await axios.get(`${apiBaseUrl}/files/${fileId}/changelog`, {
        headers: headers
      });
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

module.exports = { getLatest, getFileDetails };
