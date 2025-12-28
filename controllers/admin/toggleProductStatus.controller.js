/* global process */
const {
  generateAllowedListJsonl,
  generateOrchestratorConfig,
  executeVectorScript
} = require('../../utils/vectorUpsertHelper');

/**
 * Toggle product status and trigger vector upsert script
 * POST /api/v1/admin/toggle-product-status
 * Body: { 
 *   productId: string, 
 *   status: "ACTIVE" | "IN ACTIVE",
 *   category: string,
 *   activeProductIds: string[],  // All active product IDs for this category
 *   categoryConfig: {            // Category S3 paths configuration
 *     texts_jsonl: string,
 *     normalized_jsonl: string,
 *     schema_spec: string,
 *     index: string,
 *     namespace_routing_field: string
 *   }
 * }
 */
exports.toggleProductStatus = async (req, res) => {
  try {
    const { 
      productId, 
      status,
      category, 
      activeProductIds,
      categoryConfig
    } = req.body;

    // Validate input
    if (!productId || !status || !category) {
      return res.status(400).json({
        status: false,
        message: "productId, status, and category are required",
        data: null,
      });
    }

    if (!['ACTIVE', 'IN ACTIVE'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "status must be either 'ACTIVE' or 'IN ACTIVE'",
        data: null,
      });
    }

    if (!Array.isArray(activeProductIds) || activeProductIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "activeProductIds array is required and must contain at least one product",
        data: null,
      });
    }

    if (!categoryConfig) {
      return res.status(400).json({
        status: false,
        message: "categoryConfig is required",
        data: null,
      });
    }

    console.log(`Toggling product ${productId} to ${status} for category ${category}`);
    console.log(`Active products count: ${activeProductIds.length}`);

    // Prepare products array for JSONL file
    // Each product should have: product_id, category, action
    // The allowed_list.jsonl contains all products that should be active, so action is always "activate"
    const productsForJsonl = activeProductIds.map(pid => ({
      product_id: pid,
      category: category,
      action: status === "ACTIVE" ? "activate" : "deactivate"
    }));

    // Step 1: Generate allowed_list.jsonl
    let allowedListPath;
    try {
      allowedListPath = await generateAllowedListJsonl(productsForJsonl);
      console.log(`Generated allowed_list.jsonl at: ${allowedListPath}`);
    } catch (error) {
      console.error('Failed to generate allowed_list.jsonl:', error);
      return res.status(500).json({
        status: false,
        message: "Failed to generate allowed_list.jsonl",
        error: error.message,
        data: null,
      });
    }

    // Step 2: Generate orchestrator_config.json
    const normalizedCategory = category;

    console.log("normalizedCategory", normalizedCategory);
    
    const orchestratorConfig = {
      categories: {
        [normalizedCategory]: {
          texts_jsonl: categoryConfig.texts_jsonl,
          normalized_jsonl: categoryConfig.normalized_jsonl,
          schema_spec: categoryConfig.schema_spec,
          index: categoryConfig.index || 'test',
          namespace_routing_field: categoryConfig.namespace_routing_field || 'gender_target'
        }
      }
    };

    let configPath;
    try {
      configPath = await generateOrchestratorConfig(orchestratorConfig);
      console.log(`Generated orchestrator_config.json at: ${configPath}`);
    } catch (error) {
      console.error('Failed to generate orchestrator_config.json:', error);
      return res.status(500).json({
        status: false,
        message: "Failed to generate orchestrator_config.json",
        error: error.message,
        data: null,
      });
    }

    // Step 3: Execute vector.sh script
    let scriptResult;
    try {
      console.log('Executing vector.sh script...');
      scriptResult = await executeVectorScript('orchestrator_config.json');
      console.log('vector.sh completed successfully');
      console.log('vector.sh stdout:', scriptResult.stdout);
      if (scriptResult.stderr) {
        console.log('vector.sh stderr:', scriptResult.stderr);
      }
    } catch (error) {
      console.error('vector.sh failed:', error);
      return res.status(500).json({
        status: false,
        message: "vector.sh script execution failed",
        error: error.message,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        data: null,
      });
    }

    // Success response
    return res.status(200).json({
      status: true,
      message: "Product status updated and vector script executed successfully",
      data: {
        productId,
        status,
        category,
        allowedListPath,
        configPath,
        scriptOutput: {
          stdout: scriptResult.stdout,
          stderr: scriptResult.stderr || "",
        }
      },
    });

  } catch (error) {
    console.error("Unexpected error in toggleProductStatus controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};
