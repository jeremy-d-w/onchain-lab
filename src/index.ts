/**
 * Tarobase Policy Generator - Main Entry Point
 * 
 * This module provides the main API for the Tarobase policy generator system.
 * It allows users to generate forum application code from a policy schema.
 */

import fs from 'fs';
import path from 'path';
import { SchemaParser } from './core/schema-parser';
import { PolicyGenerator } from './core/policy-generator';
import { RuleEngine } from './core/rule-engine';

/**
 * Generate a forum application implementation from a policy schema
 * 
 * @param policySchemaPath - Path to the policy schema JSON file
 * @param outputPath - Path to output the generated code
 * @returns Promise that resolves when generation is complete
 */
export async function generateForumImplementation(
  policySchemaPath: string,
  outputPath: string
): Promise<void> {
  try {
    // 1. Load the policy schema
    console.log(`Loading policy schema from ${policySchemaPath}...`);
    const policySchema = loadPolicyFromFile(policySchemaPath);
    
    // 2. Parse the schema
    console.log('Parsing policy schema...');
    const schemaParser = new SchemaParser();
    const parsedConfig = schemaParser.parseSchema(policySchema);
    
    console.log('Parsed config:');
    console.log(`- Entities: ${Object.keys(parsedConfig.entities).join(', ')}`);
    console.log(`- Rules: ${Object.keys(parsedConfig.rules).join(', ')}`);
    console.log(`- Hooks: ${Object.keys(parsedConfig.hooks).join(', ')}`);
    if (parsedConfig.functions) {
      console.log(`- Functions: ${Object.keys(parsedConfig.functions).join(', ')}`);
    }
    
    // 3. Generate implementation code
    console.log('\nGenerating implementation code...');
    const policyGenerator = new PolicyGenerator();
    const generatedCode = policyGenerator.generatePolicyCode(parsedConfig);
    
    // 4. Save the generated code
    saveGeneratedCode(outputPath, generatedCode);
    
    console.log(`\nForum implementation successfully generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating forum implementation:', error);
    throw error;
  }
}

/**
 * Load a JSON policy from a file
 */
function loadPolicyFromFile(filePath: string): any {
  const fullPath = path.resolve(filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(fileContent);
}

/**
 * Save generated code to a file
 */
function saveGeneratedCode(filePath: string, code: string): void {
  const fullPath = path.resolve(filePath);
  fs.writeFileSync(fullPath, code, 'utf-8');
  console.log(`Generated code saved to ${fullPath}`);
}

/**
 * Evaluate a rule against a context
 * 
 * Utility function for testing rules
 */
export function evaluateRule(rule: string, context: RuleContext): boolean {
  const ruleEngine = new RuleEngine();
  return ruleEngine.checkPermission(rule, context);
}

// Export core classes for advanced usage
export { SchemaParser, PolicyGenerator, RuleEngine, RuleContext };

// Function to generate policy
async function generatePolicy(schemaPath: string, outputPath: string) {
  try {
    // Read the schema file
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    // Parse the schema
    const schemaParser = new SchemaParser();
    const parsedSchema = schemaParser.parse(schema);
    
    // Generate the policy
    const policyGenerator = new PolicyGenerator();
    const policy = policyGenerator.generatePolicy(parsedSchema);
    
    // Create rule engine for validation
    const ruleEngine = new RuleEngine();
    const validationResult = ruleEngine.validatePolicy(policy);
    
    if (validationResult.valid) {
      // Write the policy to the output file
      fs.writeFileSync(outputPath, JSON.stringify(policy, null, 2));
      console.log(`Policy successfully generated and saved to ${outputPath}`);
      return policy;
    } else {
      console.error('Policy validation failed:', validationResult.errors);
      return null;
    }
  } catch (error) {
    console.error('Error generating policy:', error);
    return null;
  }
}

// Main function
async function main() {
  const schemaPath = path.join(__dirname, '../examples/forum-policy.json');
  const outputPath = path.join(__dirname, '../dist/generated-policy.json');
  
  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Starting policy generation...');
  const policy = await generatePolicy(schemaPath, outputPath);
  
  if (policy) {
    console.log('Policy generation completed successfully!');
    console.log('Generated policy:', JSON.stringify(policy, null, 2));
  } else {
    console.error('Policy generation failed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
