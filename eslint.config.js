import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".wrangler/**",
      "review/**",
      "docs/**",
      "backups/**"
    ]
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='env'][property.name=/^DB_/]",
          message: "Direct access to env.DB_* is strictly forbidden outside src/worker/data. Handlers and Durable Objects must call data-layer functions (Rules §10)."
        },
        {
          selector: "CallExpression[callee.property.name='prepare'] > :matches(BinaryExpression, TemplateLiteral:has(TemplateElement[value.raw!='']))",
          message: "String-built SQL is forbidden. Use static SQL statements with bound parameters (?1, ?2, ...) (Rules §10)."
        }
      ]
    }
  },
  {
    // Exemption: Only src/worker/data is permitted to access env.DB_* bindings
    files: ["src/worker/data/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='prepare'] > :matches(BinaryExpression, TemplateLiteral:has(TemplateElement[value.raw!='']))",
          message: "String-built SQL is forbidden. Use static SQL statements with bound parameters (?1, ?2, ...) (Rules §10)."
        }
      ]
    }
  }
];
