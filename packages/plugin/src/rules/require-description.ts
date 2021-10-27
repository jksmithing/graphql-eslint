import { GraphQLESLintRule, GraphQLESLintRuleContext, ValueOf } from '../types';
import { GraphQLESTreeNode } from '../estree-parser/estree-ast';
import { ASTKindToNode, Kind, StringValueNode } from 'graphql';

const REQUIRE_DESCRIPTION_ERROR = 'REQUIRE_DESCRIPTION_ERROR';
const DESCRIBABLE_NODES = [
  Kind.SCHEMA_DEFINITION,
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.FIELD_DEFINITION,
  Kind.INPUT_VALUE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.UNION_TYPE_DEFINITION,
  Kind.ENUM_TYPE_DEFINITION,
  Kind.ENUM_VALUE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.DIRECTIVE_DEFINITION,
];
type RequireDescriptionRuleConfig = [{ on: typeof DESCRIBABLE_NODES }];

type AllowedKind = typeof DESCRIBABLE_NODES[number];
type AllowedKindToNode = Pick<ASTKindToNode, AllowedKind>;

function verifyRule(
  context: GraphQLESLintRuleContext<RequireDescriptionRuleConfig>,
  node: GraphQLESTreeNode<ValueOf<AllowedKindToNode>> & {
    readonly description?: GraphQLESTreeNode<StringValueNode>;
  }
) {
  if (node) {
    if (!node.description || !node.description.value || node.description.value.trim().length === 0) {
      const { start, end } = ('name' in node ? node.name : node).loc;

      context.report({
        loc: {
          start: {
            line: start.line,
            column: start.column - 1,
          },
          end: {
            line: end.line,
            column:
              // node.name don't exist on SchemaDefinition
              'name' in node ? end.column - 1 + node.name.value.length : end.column,
          },
        },
        messageId: REQUIRE_DESCRIPTION_ERROR,
        data: {
          nodeType: node.kind,
        },
      });
    }
  }
}

const rule: GraphQLESLintRule<RequireDescriptionRuleConfig> = {
  meta: {
    docs: {
      category: 'Best Practices',
      description: `Enforce descriptions in your type definitions.`,
      url: `https://github.com/dotansimha/graphql-eslint/blob/master/docs/rules/require-description.md`,
      examples: [
        {
          title: 'Incorrect',
          usage: [{ on: ['ObjectTypeDefinition', 'FieldDefinition'] }],
          code: /* GraphQL */ `
            type someTypeName {
              name: String
            }
          `,
        },
        {
          title: 'Correct',
          usage: [{ on: ['ObjectTypeDefinition', 'FieldDefinition'] }],
          code: /* GraphQL */ `
            """
            Some type description
            """
            type someTypeName {
              """
              Name description
              """
              name: String
            }
          `,
        },
      ],
    },
    type: 'suggestion',
    messages: {
      [REQUIRE_DESCRIPTION_ERROR]: `Description is required for nodes of type "{{ nodeType }}"`,
    },
    schema: {
      type: 'array',
      additionalItems: false,
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        require: ['on'],
        properties: {
          on: {
            type: 'array',
            minItems: 1,
            additionalItems: false,
            items: {
              type: 'string',
              enum: DESCRIBABLE_NODES,
            },
          },
        },
      },
    },
  },
  create(context) {
    return Object.fromEntries(context.options[0].on.map(optionKey => [optionKey, node => verifyRule(context, node)]));
  },
};

export default rule;
