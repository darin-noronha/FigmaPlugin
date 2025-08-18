
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

// This line configures dotenv to find your .env file
dotenv.config({ path: './data_scraper/.env' });

// 1. STORE YOUR FILE KEYS
const fileKeys = [
    'KlhS0TSI0V9b1Kouj1y4Su',
    'pufe3wXrCpRrUtGxGLayDz',
    'oQvGsoeleYLbso33Owehvx',
    '7emgtrhUYitzRAvJ2vYCTB',
    'Wkzyx2lTmPwxvANVd2FEb3'  
];

// 2. PREPARE FOR THE API CALL
const figmaToken = process.env.FIGMA_TOKEN;

// This is the main function that will run our script
async function getFigmaData() {
  console.log('Starting data fetch...');

  // 4A. CREATE AN OUTPUT DIRECTORY
  
  const outputDir = './data_scraper/output';
  if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir);
  }

  for (const key of fileKeys) {
    try {
      console.log(`Fetching file: ${key}`);
      const response = await axios.get(`https://api.figma.com/v1/files/${key}`, {
        headers: {
          'X-Figma-Token': figmaToken
        }
      });
      
      const document = response.data.document;

      // 4B. SAVE EACH FILE INDIVIDUALLY
      // We save the data for this one file immediately.
      const filePath = `${outputDir}/${key}.json`;
      fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
      console.log(`✅ Saved data for ${key} to ${filePath}`);

    } catch (error) {
      console.error(`Error fetching file ${key}:`, error);
    }
  }

  console.log('✨ All files have been fetched and saved individually!');
}

getFigmaData();