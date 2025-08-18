import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';

// --- CONFIGURATION ---
const LAYOUT_VECTOR_LENGTH = 40; // MAX_CHILDREN (10) * PROPERTIES_PER_CHILD (4)
const LATENT_DIM = 2; // How much we compress the data.
const EPOCHS = 50;
const BATCH_SIZE = 32;
// ---

console.log('Loading and preparing data...');

// 1. LOAD YOUR PROCESSED DATA
const data = JSON.parse(fs.readFileSync('./data_scraper/processed-layouts.json', 'utf-8'));
const dataset = tf.tensor2d(data);
// ---

// --- 2. DEFINE THE AUTOENCODER MODEL ---
// This is a much simpler and more stable model structure.

// --- Encoder ---
const encoderInput = tf.input({ shape: [LAYOUT_VECTOR_LENGTH] });
const encoded = tf.layers.dense({ units: LATENT_DIM, activation: 'relu' }).apply(encoderInput);
const encoder = tf.model({ inputs: encoderInput, outputs: encoded, name: 'encoder' });

// --- Decoder ---
const decoderInput = tf.input({ shape: [LATENT_DIM] });
const decoded = tf.layers.dense({ units: LAYOUT_VECTOR_LENGTH, activation: 'sigmoid' }).apply(decoderInput);
const decoder = tf.model({ inputs: decoderInput, outputs: decoded, name: 'decoder' });

// --- Full Autoencoder (for training) ---
const autoencoderInput = tf.input({ shape: [LAYOUT_VECTOR_LENGTH] });
const encodedLayer = encoder.apply(autoencoderInput);
const decodedLayer = decoder.apply(encodedLayer);
const autoencoder = tf.model({ inputs: autoencoderInput, outputs: decodedLayer, name: 'autoencoder' });

console.log('Model built successfully.');
// ---

// --- 3. COMPILE AND TRAIN THE MODEL ---
// We use a standard, reliable loss function. No custom code needed.
autoencoder.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

console.log('Starting training...');

// The standard .fit() method is much more stable than a manual training loop.
await autoencoder.fit(dataset, dataset, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    shuffle: true,
    callbacks: {
        onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}/${EPOCHS} - Loss: ${logs.loss.toFixed(4)}`);
        }
    }
});
console.log('✅ Training complete.');
// ---

// --- 4. SAVE THE TRAINED DECODER ---
// We only need the decoder part for our Figma plugin.
await decoder.save('file://./data_scraper/saved-model');
console.log('✨ Model saved to ./data_scraper/saved-model');
// ---