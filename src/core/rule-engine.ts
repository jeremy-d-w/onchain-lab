/**
 * Rule Engine
 * 
 * This module is responsible for parsing and evaluating rule expressions
 * from the policy schema. It supports various operators, comparisons,
 * path references, and function calls.
 */

/**
 * RuleContext interface defines the context for rule evaluation
 */
export interface RuleContext {
  /** Current user context */
  user?: {
    /** User's wallet address */
    address: string;
    /** Additional user properties */
    [key: string]: any;
  };
  /** Resource data context */
  resource?: {
    /** Current resource data */
    data?: any;
    /** Additional resource properties */
    [key: string]: any;
  };
  /** New data being written */
  newData?: any;
  /** System constants */
  constants?: Record<string, any>;
  /** Function to get data by path */
  get?: (path: string) => any;
}

/**
 * ExpressionNode interface represents a node in the parsed expression tree
 */
interface ExpressionNode {
  /** Node type */
  type: 'literal' | 'reference' | 'binary' | 'logical' | 'function';
  /** Literal value (for literal nodes) */
  value?: any;
  /** Left operand (for binary and logical nodes) */
  left?: ExpressionNode;
  /** Right operand (for binary and logical nodes) */
  right?: ExpressionNode;
  /** Operator (for binary and logical nodes) */
  operator?: string;
  /** Path (for reference nodes) */
  path?: string;
  /** Arguments (for function nodes) */
  args?: ExpressionNode[];
  /** Function name (for function nodes) */
  name?: string;
}

/**
 * ExpressionParser class for parsing rule expressions
 */
export class ExpressionParser {
  /**
   * Tokenize an expression string into tokens
   * 
   * @param expression - Expression string to tokenize
   * @returns Array of tokens
   */
  private tokenize(expression: string): string[] {
    // Simple tokenizer - in a real implementation, this would be more robust
    // Replace operators with spaces around them for easier splitting
    let processed = expression
      .replace(/([=!<>]=|[=!<>&|]{1,2})/g, ' $1 ')
      .replace(/\(/g, ' ( ')
      .replace(/\)/g, ' ) ')
      .replace(/,/g, ' , ');
      
    // Split by whitespace and filter out empty tokens
    return processed.split(/\s+/).filter(token => token.length > 0);
  }

  /**
   * Parse an expression string into an expression node
   * 
   * @param expression - Expression string to parse
   * @returns Parsed expression node
   */
  parse(expression: string): ExpressionNode {
    const tokens = this.tokenize(expression);
    return this.parseExpression(tokens, 0).node;
  }

  /**
   * Parse tokens into an expression node
   * 
   * @param tokens - Array of tokens
   * @param index - Current token index
   * @returns Parsed expression node and new index
   */
  private parseExpression(tokens: string[], index: number): { node: ExpressionNode, newIndex: number } {
    // Start with a single term
    let { node, newIndex } = this.parseTerm(tokens, index);
    
    // If there are more tokens and the next token is a logical operator
    while (newIndex < tokens.length && (tokens[newIndex] === '&&' || tokens[newIndex] === '||')) {
      const operator = tokens[newIndex];
      const { node: rightNode, newIndex: nextIndex } = this.parseTerm(tokens, newIndex + 1);
      
      node = {
        type: 'logical',
        operator,
        left: node,
        right: rightNode
      };
      
      newIndex = nextIndex;
    }
    
    return { node, newIndex };
  }

  /**
   * Parse a term (part of an expression)
   * 
   * @param tokens - Array of tokens
   * @param index - Current token index
   * @returns Parsed term node and new index
   */
  private parseTerm(tokens: string[], index: number): { node: ExpressionNode, newIndex: number } {
    // Start with a factor
    let { node, newIndex } = this.parseFactor(tokens, index);
    
    // If there are more tokens and the next token is a comparison operator
    while (newIndex < tokens.length && ['==', '!=', '<', '>', '<=', '>='].includes(tokens[newIndex])) {
      const operator = tokens[newIndex];
      const { node: rightNode, newIndex: nextIndex } = this.parseFactor(tokens, newIndex + 1);
      
      node = {
        type: 'binary',
        operator,
        left: node,
        right: rightNode
      };
      
      newIndex = nextIndex;
    }
    
    return { node, newIndex };
  }

  /**
   * Parse a factor (atomic part of an expression)
   * 
   * @param tokens - Array of tokens
   * @param index - Current token index
   * @returns Parsed factor node and new index
   */
  private parseFactor(tokens: string[], index: number): { node: ExpressionNode, newIndex: number } {
    if (index >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }
    
    const token = tokens[index];
    
    // Handle parenthesized expressions
    if (token === '(') {
      const { node, newIndex } = this.parseExpression(tokens, index + 1);
      
      if (newIndex >= tokens.length || tokens[newIndex] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      
      return { node, newIndex: newIndex + 1 };
    }
    
    // Handle @-prefixed references
    if (token.startsWith('@')) {
      return {
        node: {
          type: 'reference',
          path: token.substring(1) // Remove @ prefix
        },
        newIndex: index + 1
      };
    }
    
    // Handle function calls
    if (token.startsWith('@') && index + 1 < tokens.length && tokens[index + 1] === '(') {
      const funcName = token.substring(1); // Remove @ prefix
      const args: ExpressionNode[] = [];
      let newIndex = index + 2; // Skip function name and opening parenthesis
      
      // Parse arguments
      while (newIndex < tokens.length && tokens[newIndex] !== ')') {
        if (tokens[newIndex] === ',') {
          newIndex++; // Skip comma
          continue;
        }
        
        const { node: argNode, newIndex: nextIndex } = this.parseExpression(tokens, newIndex);
        args.push(argNode);
        newIndex = nextIndex;
      }
      
      if (newIndex >= tokens.length || tokens[newIndex] !== ')') {
        throw new Error('Missing closing parenthesis in function call');
      }
      
      return {
        node: {
          type: 'function',
          name: funcName,
          args
        },
        newIndex: newIndex + 1
      };
    }
    
    // Handle literals (true, false, numbers, strings)
    if (token === 'true') {
      return { node: { type: 'literal', value: true }, newIndex: index + 1 };
    }
    
    if (token === 'false') {
      return { node: { type: 'literal', value: false }, newIndex: index + 1 };
    }
    
    // Handle numbers
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      return { node: { type: 'literal', value: parseFloat(token) }, newIndex: index + 1 };
    }
    
    // Handle string literals (simple handling - would need more robust parsing for real quotes)
    if ((token.startsWith('"') && token.endsWith('"')) || 
        (token.startsWith("'") && token.endsWith("'"))) {
      return { 
        node: { 
          type: 'literal', 
          value: token.substring(1, token.length - 1) 
        }, 
        newIndex: index + 1 
      };
    }
    
    // Default: treat as a variable or property reference
    return { 
      node: { 
        type: 'literal', 
        value: token 
      }, 
      newIndex: index + 1 
    };
  }

  /**
   * Evaluate a parsed expression against a context
   * 
   * @param node - Expression node to evaluate
   * @param context - Context for evaluation
   * @returns Evaluation result
   */
  evaluate(node: ExpressionNode, context: RuleContext): any {
    switch (node.type) {
      case 'literal':
        return node.value;
        
      case 'reference':
        return this.resolveReference(node.path || '', context);
        
      case 'binary':
        return this.evaluateOperator(
          node.operator || '',
          this.evaluate(node.left!, context),
          this.evaluate(node.right!, context)
        );
        
      case 'logical':
        if (node.operator === '&&') {
          return this.evaluate(node.left!, context) && this.evaluate(node.right!, context);
        } else if (node.operator === '||') {
          return this.evaluate(node.left!, context) || this.evaluate(node.right!, context);
        }
        throw new Error(`Unsupported logical operator: ${node.operator}`);
        
      case 'function':
        const args = node.args!.map(arg => this.evaluate(arg, context));
        return this.callFunction(node.name || '', args, context);
        
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  /**
   * Resolve a reference path against a context
   * 
   * @param path - Reference path (e.g., 'user.address')
   * @param context - Context for resolution
   * @returns Resolved value
   */
  private resolveReference(path: string, context: RuleContext): any {
    const parts = path.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Evaluate a binary operator
   * 
   * @param operator - Operator string (e.g., '==', '!=')
   * @param left - Left operand
   * @param right - Right operand
   * @returns Evaluation result
   */
  private evaluateOperator(operator: string, left: any, right: any): boolean {
    switch (operator) {
      case '==': return left === right;
      case '!=': return left !== right;
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      default: throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Call a function by name with arguments
   * 
   * @param name - Function name
   * @param args - Function arguments
   * @param context - Context for function call
   * @returns Function result
   */
  private callFunction(name: string, args: any[], context: RuleContext): any {
    // Handle built-in functions
    if (name === 'get' && context.get) {
      return context.get(args[0]);
    }
    
    // In a real implementation, this would look up custom functions from the context
    throw new Error(`Unknown function: ${name}`);
  }
}

/**
 * RuleEngine class for compiling and evaluating rules
 */
export class RuleEngine {
  private expressionParser: ExpressionParser;
  private compiledRules: Map<string, Function> = new Map();

  constructor() {
    this.expressionParser = new ExpressionParser();
  }

  /**
   * Compile a rule expression
   * 
   * @param ruleExpression - Rule expression string
   * @returns Compiled rule function
   */
  compileRule(ruleExpression: string): Function {
    if (!this.compiledRules.has(ruleExpression)) {
      const parsed = this.expressionParser.parse(ruleExpression);
      const compiledRule = (context: RuleContext) => {
        return this.expressionParser.evaluate(parsed, context);
      };
      this.compiledRules.set(ruleExpression, compiledRule);
    }
    return this.compiledRules.get(ruleExpression)!;
  }

  /**
   * Check if an operation is permitted based on a rule
   * 
   * @param ruleExpression - Rule expression string
   * @param context - Context for rule evaluation
   * @returns Whether the operation is permitted
   */
  checkPermission(ruleExpression: string, context: RuleContext): boolean {
    if (!ruleExpression || ruleExpression === 'true') {
      return true;
    }
    
    if (ruleExpression === 'false') {
      return false;
    }
    
    const rule = this.compileRule(ruleExpression);
    try {
      return rule(context);
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false; // Default to deny on error
    }
  }
} 