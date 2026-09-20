// Plain JavaScript on purpose: ESLint loads rule files directly, with no TypeScript step.

// Matches a hex colour (#abc, #aabbcc, #aabbccdd) or a CSS colour function anywhere in a string.
// Word boundaries stop "#1" in a room code or "rgb" inside a normal word from matching.
const RAW_COLOR_PATTERN = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;

/**
 * Forbids colour literals outside packages/shared/src/tokens.ts (B1 acceptance criterion).
 * Screens and components must reference a token instead, so a design change is one edit.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
export const noRawColor = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow raw colour literals; use a token from @royal-navy/shared instead",
    },
    messages: {
      rawColor:
        "Raw colour '{{value}}' — use a token from packages/shared/src/tokens.ts instead.",
    },
    schema: [],
  },
  create(context) {
    /** @param {import("eslint").Rule.Node} node @param {string} value */
    function report(node, value) {
      context.report({ node, messageId: "rawColor", data: { value } });
    }
    return {
      Literal(node) {
        if (typeof node.value === "string" && RAW_COLOR_PATTERN.test(node.value)) {
          report(node, node.value);
        }
      },
      TemplateElement(node) {
        const raw = node.value.cooked ?? node.value.raw;
        if (RAW_COLOR_PATTERN.test(raw)) {
          report(node, raw);
        }
      },
    };
  },
};
