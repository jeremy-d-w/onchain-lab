import * as fs from 'fs';
import * as path from 'path';
import { SchemaParser } from './utils/schema-parser';
import { PolicyGenerator } from './utils/policy-generator';
import { RuleEngine, RuleContext } from './utils/rule-engine';

/**
 * Load a JSON policy from a file
 */
const loadPolicyFromFile = (filePath: string): any => {
  const fullPath = path.resolve(filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(fileContent);
};

/**
 * Save generated code to a file
 */
const saveGeneratedCode = (filePath: string, code: string): void => {
  const fullPath = path.resolve(filePath);
  fs.writeFileSync(fullPath, code, 'utf-8');
  console.log(`Generated code saved to ${fullPath}`);
};

/**
 * Test the rule engine with a simple rule
 */
const testRuleEngine = (rule: string, context: RuleContext): void => {
  const ruleEngine = new RuleEngine();
  try {
    const result = ruleEngine.checkPermission(rule, context);
    console.log(`Rule "${rule}" evaluated to: ${result}`);
  } catch (error) {
    console.error(`Error evaluating rule "${rule}":`, error);
  }
};

/**
 * Main demo function
 */
const runDemo = async () => {
  try {
    // 1. Load the policy JSON
    console.log('Loading policy schema...');
    const policySchema = loadPolicyFromFile('../tarobase-policy.json');
    
    // 2. Parse the policy schema
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
    
    // 3. Generate policy code
    console.log('\nGenerating policy code...');
    const policyGenerator = new PolicyGenerator();
    const generatedCode = policyGenerator.generatePolicyCode(parsedConfig);
    
    // 4. Save the generated code
    saveGeneratedCode('../src/utils/generated-policy.ts', generatedCode);
    
    // 5. Test the rule engine with some example rules
    console.log('\nTesting rule engine...');
    
    // Example: Check if a user can create a post
    testRuleEngine('@newData.createdBy == @user.address', {
      user: { address: '0x1234' },
      newData: { createdBy: '0x1234' }
    });
    
    // Example: Check if a user can delete a post
    testRuleEngine('@resource.data.createdBy == @user.address', {
      user: { address: '0x1234' },
      resource: { data: { createdBy: '0x5678' } }
    });
    
    // Example: Check if a user has paid for access
    testRuleEngine('@hasAccess(@user.address, $postId)', {
      user: { address: '0x1234' },
      get: (path: string) => ({ hasAccess: true }),
      resource: { post: { 'abc123': { isPaid: true } } }
    });
    
    console.log('\nDemo completed successfully!');
  } catch (error) {
    console.error('Error running demo:', error);
  }
};

// Run the demo
runDemo(); 