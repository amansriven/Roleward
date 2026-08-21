import type { Language } from "@/modules/execution/port";
import type { Parameter, Signature } from "./signature";

type TypeName = Parameter["type"];

/**
 * One formatter per language rather than a hand-written stub per problem per
 * language. Twelve problems across ten languages would be 120 files to keep in
 * sync; this is ten functions and a signature.
 */
const TYPES: Record<Language, Record<TypeName, string>> = {
  python: {
    int: "int",
    float: "float",
    string: "str",
    bool: "bool",
    "int[]": "list[int]",
    "float[]": "list[float]",
    "string[]": "list[str]",
    "bool[]": "list[bool]",
    "int[][]": "list[list[int]]",
    "string[][]": "list[list[str]]",
  },
  javascript: {
    int: "number",
    float: "number",
    string: "string",
    bool: "boolean",
    "int[]": "number[]",
    "float[]": "number[]",
    "string[]": "string[]",
    "bool[]": "boolean[]",
    "int[][]": "number[][]",
    "string[][]": "string[][]",
  },
  typescript: {
    int: "number",
    float: "number",
    string: "string",
    bool: "boolean",
    "int[]": "number[]",
    "float[]": "number[]",
    "string[]": "string[]",
    "bool[]": "boolean[]",
    "int[][]": "number[][]",
    "string[][]": "string[][]",
  },
  java: {
    int: "int",
    float: "double",
    string: "String",
    bool: "boolean",
    "int[]": "int[]",
    "float[]": "double[]",
    "string[]": "String[]",
    "bool[]": "boolean[]",
    "int[][]": "int[][]",
    "string[][]": "String[][]",
  },
  cpp: {
    int: "int",
    float: "double",
    string: "std::string",
    bool: "bool",
    "int[]": "std::vector<int>",
    "float[]": "std::vector<double>",
    "string[]": "std::vector<std::string>",
    "bool[]": "std::vector<bool>",
    "int[][]": "std::vector<std::vector<int>>",
    "string[][]": "std::vector<std::vector<std::string>>",
  },
  go: {
    int: "int",
    float: "float64",
    string: "string",
    bool: "bool",
    "int[]": "[]int",
    "float[]": "[]float64",
    "string[]": "[]string",
    "bool[]": "[]bool",
    "int[][]": "[][]int",
    "string[][]": "[][]string",
  },
  csharp: {
    int: "int",
    float: "double",
    string: "string",
    bool: "bool",
    "int[]": "int[]",
    "float[]": "double[]",
    "string[]": "string[]",
    "bool[]": "bool[]",
    "int[][]": "int[][]",
    "string[][]": "string[][]",
  },
  kotlin: {
    int: "Int",
    float: "Double",
    string: "String",
    bool: "Boolean",
    "int[]": "IntArray",
    "float[]": "DoubleArray",
    "string[]": "Array<String>",
    "bool[]": "BooleanArray",
    "int[][]": "Array<IntArray>",
    "string[][]": "Array<Array<String>>",
  },
  swift: {
    int: "Int",
    float: "Double",
    string: "String",
    bool: "Bool",
    "int[]": "[Int]",
    "float[]": "[Double]",
    "string[]": "[String]",
    "bool[]": "[Bool]",
    "int[][]": "[[Int]]",
    "string[][]": "[[String]]",
  },
  rust: {
    int: "i64",
    float: "f64",
    string: "String",
    bool: "bool",
    "int[]": "Vec<i64>",
    "float[]": "Vec<f64>",
    "string[]": "Vec<String>",
    "bool[]": "Vec<bool>",
    "int[][]": "Vec<Vec<i64>>",
    "string[][]": "Vec<Vec<String>>",
  },
};

const camel = (value: string) =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const pascal = (value: string) => {
  const name = camel(value);
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const COMMENT: Record<Language, string> = {
  python: "#",
  javascript: "//",
  typescript: "//",
  java: "//",
  cpp: "//",
  go: "//",
  csharp: "//",
  kotlin: "//",
  swift: "//",
  rust: "//",
};

export function commentToken(language: Language) {
  return COMMENT[language];
}

export function renderStub(signature: Signature, language: Language): string {
  const types = TYPES[language];
  const hint = `${COMMENT[language]} Talk through your approach before you implement it.`;
  const params = signature.parameters;
  const ret = types[signature.returnType];

  switch (language) {
    case "python": {
      const args = params
        .map((item) => `${item.name}: ${types[item.type]}`)
        .join(", ");
      return `def ${signature.name}(${args}) -> ${ret}:\n    ${hint}\n    pass\n`;
    }
    case "javascript": {
      const args = params
        .map((item) => item.name)
        .map(camel)
        .join(", ");
      const doc = params
        .map((item) => ` * @param {${types[item.type]}} ${camel(item.name)}`)
        .join("\n");
      return `/**\n${doc}\n * @returns {${ret}}\n */\nfunction ${camel(signature.name)}(${args}) {\n  ${hint}\n}\n`;
    }
    case "typescript": {
      const args = params
        .map((item) => `${camel(item.name)}: ${types[item.type]}`)
        .join(", ");
      return `function ${camel(signature.name)}(${args}): ${ret} {\n  ${hint}\n}\n`;
    }
    case "java": {
      const args = params
        .map((item) => `${types[item.type]} ${camel(item.name)}`)
        .join(", ");
      return `class Solution {\n    public ${ret} ${camel(signature.name)}(${args}) {\n        ${hint}\n    }\n}\n`;
    }
    case "cpp": {
      const args = params
        .map((item) => `${types[item.type]} ${item.name}`)
        .join(", ");
      return `class Solution {\npublic:\n    ${ret} ${camel(signature.name)}(${args}) {\n        ${hint}\n    }\n};\n`;
    }
    case "go": {
      const args = params
        .map((item) => `${camel(item.name)} ${types[item.type]}`)
        .join(", ");
      return `func ${pascal(signature.name)}(${args}) ${ret} {\n\t${hint}\n}\n`;
    }
    case "csharp": {
      const args = params
        .map((item) => `${types[item.type]} ${camel(item.name)}`)
        .join(", ");
      return `public class Solution {\n    public ${ret} ${pascal(signature.name)}(${args}) {\n        ${hint}\n    }\n}\n`;
    }
    case "kotlin": {
      const args = params
        .map((item) => `${camel(item.name)}: ${types[item.type]}`)
        .join(", ");
      return `fun ${camel(signature.name)}(${args}): ${ret} {\n    ${hint}\n}\n`;
    }
    case "swift": {
      const args = params
        .map((item) => `_ ${camel(item.name)}: ${types[item.type]}`)
        .join(", ");
      return `func ${camel(signature.name)}(${args}) -> ${ret} {\n    ${hint}\n}\n`;
    }
    case "rust": {
      const args = params
        .map((item) => `${item.name}: ${types[item.type]}`)
        .join(", ");
      return `fn ${signature.name}(${args}) -> ${ret} {\n    ${hint}\n}\n`;
    }
  }
}
