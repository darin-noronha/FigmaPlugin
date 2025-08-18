import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
// We'll only consider layouts with between 2 and 10 direct children.
const MIN_CHILDREN = 2;
const MAX_CHILDREN = 10;
// Each child has 4 properties (x, y, width, height).
const PROPERTIES_PER_CHILD = 4;
// The final length of our data vector for each layout.
const PADDED_LENGTH = MAX_CHILDREN * PROPERTIES_PER_CHILD;
// ---

const dataDir = './data_scraper/output';
const allProcessedLayouts = [];

// This is our main recursive function to traverse the Figma JSON tree.
function traverse(node) {
    // This checks if the current node or any of its children are missing dimensions.
  if (!node.absoluteBoundingBox || (node.children && node.children.some(child => !child.absoluteBoundingBox))) {
    // If so, we just skip it and continue down the tree.
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
    return; // Exit the function for this node
  }
  // Check if the current node is a valid layout example.
  // It must have children, and the number of children must be within our defined range.
  if (node.children && node.children.length >= MIN_CHILDREN && node.children.length <= MAX_CHILDREN) {
    
    // We only care about the parent's dimensions for normalization.
    const parentBounds = node.absoluteBoundingBox;
    const layoutVector = [];

    // Loop through each child of this node.
    for (const child of node.children) {
      const childBounds = child.absoluteBoundingBox;

      // This is the most important step: NORMALIZATION.
      // We calculate the child's position and size relative to its parent.
      // This makes our data scale-independent.
      const normalizedX = (childBounds.x - parentBounds.x) / parentBounds.width;
      const normalizedY = (childBounds.y - parentBounds.y) / parentBounds.height;
      const normalizedWidth = childBounds.width / parentBounds.width;
      const normalizedHeight = childBounds.height / parentBounds.height;

      // Add the normalized values to our flat vector for this layout.
      layoutVector.push(normalizedX, normalizedY, normalizedWidth, normalizedHeight);
    }

    // PADDING: Since layouts have different numbers of children, we must pad
    // the vector to a fixed length so the AI model can handle it.
    while (layoutVector.length < PADDED_LENGTH) {
      layoutVector.push(-1); // Use -1 as a special padding value.
    }

    // Add the final, processed vector to our main array.
    allProcessedLayouts.push(layoutVector);
  }

  // If the current node has children, continue traversing down the tree.
  if (node.children) {
    for (const child of node.children) {
      traverse(child);
    }
  }
}

// --- SCRIPT EXECUTION ---
console.log('Starting data processing...');
const files = fs.readdirSync(dataDir);

for (const file of files) {
  if (path.extname(file) === '.json') {
    const filePath = path.join(dataDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const document = JSON.parse(fileContent);
    
    // Start the traversal from the root of the document.
    traverse(document);
    console.log(`Processed ${file}, found ${allProcessedLayouts.length} layouts so far...`);
  }
}

// Save the final, clean dataset to a new file.
fs.writeFileSync('./data_scraper/processed-layouts.json', JSON.stringify(allProcessedLayouts));
console.log(`✨ Done! Found a total of ${allProcessedLayouts.length} valid layouts.`);
console.log('Saved processed data to processed-layouts.json');