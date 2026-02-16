const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Directory where files will be stored and script will run
const VECTOR_UPSERT_DIR = '/var/www/html/vector_upsert';

/**
 * Generate allowed_list.jsonl file
 * @param {Array} products - Array of product objects with {product_id, category, action}
 * @returns {Promise<string>} Path to the created file
 */
const generateAllowedListJsonl = async (products) => {
  const filePath = path.join(VECTOR_UPSERT_DIR, 'allowed_list.jsonl');
  
  // Create JSONL content (one JSON object per line)
  // Format: {"product_id": "P123", "category": "Fragrance", "action": "activate"}
  const jsonlContent = products
    .map(product => JSON.stringify({
      product_id: product.product_id,
      category: product.category,
      action: product.action
    }))
    .join('\n');
  
  // Write file
  await fs.writeFile(filePath, jsonlContent, 'utf8');
  
  console.log(`Created allowed_list.jsonl with ${products.length} products`);
  return filePath;
};

/**
 * Generate orchestrator_config.json file
 * @param {Object} config - Configuration object with categories and paths
 * @returns {Promise<string>} Path to the created file
 */
const generateOrchestratorConfig = async (config) => {
  const filePath = path.join(VECTOR_UPSERT_DIR, 'orchestrator_config.json');
  
  // Ensure allowed_list_path is relative to the script directory
  const configData = {
    allowed_list_path: './allowed_list.jsonl',
    env_file: '.env',
    categories: config.categories
  };
  
  // Write JSON file with proper formatting
  await fs.writeFile(filePath, JSON.stringify(configData, null, 2), 'utf8');
  
  console.log('Created orchestrator_config.json');
  return filePath;
};

/**
 * Execute vector.sh script with orchestrator_config.json
 * @param {string} configFileName - Name of the config file (default: orchestrator_config.json)
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const executeVectorScript = async (configFileName = 'orchestrator_config.json') => {
  const command = `./vector.sh ${configFileName}`;
  const scriptDir = VECTOR_UPSERT_DIR;
  
  console.log(`Executing: ${command} in ${scriptDir}`);
  
  return execAsync(command, {
    cwd: scriptDir,
    timeout: 10000000, // 10 hour timeout (same as your other scripts)
  });
};

module.exports = {
  generateAllowedListJsonl,
  generateOrchestratorConfig,
  executeVectorScript,
  VECTOR_UPSERT_DIR
};
