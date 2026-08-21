import { z } from "zod";

/**
 * The shape of a problem's interface, kept apart from the rest of the schema.
 *
 * Both the interview and the editor need these, and both reach them from the
 * browser. Everything else in schema.ts pulls in the archetype catalogue, whose
 * tells and confusable lists are the answers to Zed's gates — so they must not
 * travel with a type definition.
 */
/**
 * A language-agnostic signature. Stubs for all ten editor languages render from
 * this, so adding a language is one formatter rather than N hand-written stubs.
 */
export const parameterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum([
    "int",
    "float",
    "string",
    "bool",
    "int[]",
    "float[]",
    "string[]",
    "bool[]",
    "int[][]",
    "string[][]",
  ]),
  description: z.string().trim().min(1),
});
export type Parameter = z.infer<typeof parameterSchema>;

export const signatureSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  parameters: z.array(parameterSchema).min(1).max(4),
  returnType: parameterSchema.shape.type,
});
export type Signature = z.infer<typeof signatureSchema>;

export const testCaseSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
  /** Only ever populated on public tests. */
  explanation: z.string().trim().optional(),
});
