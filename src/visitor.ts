import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
  DocumentMode,
  RawClientSideBasePluginConfig,
} from "@graphql-codegen/visitor-plugin-common";
import { GraphQLSchema, OperationDefinitionNode, Kind } from "graphql";
import { SolidStartUrqlPluginConfig } from "./config";

export interface SolidStartUrqlPluginRawConfig
  extends RawClientSideBasePluginConfig {
  withPrimitives?: boolean;
  urqlImportFrom?: string;
}

export class SolidStartUrqlVisitor extends ClientSideBaseVisitor<
  SolidStartUrqlPluginRawConfig,
  SolidStartUrqlPluginConfig
> {
  private _externalImportPrefix: string;

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: SolidStartUrqlPluginRawConfig,
    documents: any[],
  ) {
    super(schema, fragments, rawConfig, {
      withPrimitives: rawConfig.withPrimitives !== false,
      urqlImportFrom: rawConfig.urqlImportFrom || "@urql/solid-start",
      documentMode: DocumentMode.string,
    } as any);

    this._externalImportPrefix = this.config.importOperationTypesFrom
      ? `${this.config.importOperationTypesFrom}.`
      : "";
  }

  public getImports(): string[] {
    const baseImports = super.getImports();
    const imports: string[] = [...baseImports];

    if (this.config.withPrimitives) {
      imports.push(
        `import { createQuery, createMutation } from '${this.config.urqlImportFrom}';`,
      );
    }

    return imports.filter(Boolean);
  }

  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean,
  ): string {
    const operationName = this.convertName(node.name?.value || "", {
      useTypesPrefix: false,
      useTypesSuffix: false,
    });

    if (!this.config.withPrimitives) {
      return "";
    }

    if (operationType === "Query") {
      return this.buildQueryPrimitive(
        node,
        operationName,
        documentVariableName,
        operationResultType,
        operationVariablesTypes,
        hasRequiredVariables,
      );
    } else if (operationType === "Mutation") {
      return this.buildMutationPrimitive(
        node,
        operationName,
        documentVariableName,
        operationResultType,
        operationVariablesTypes,
        hasRequiredVariables,
      );
    }

    // Skip subscriptions
    return "";
  }

  private buildQueryPrimitive(
    node: OperationDefinitionNode,
    operationName: string,
    documentVariableName: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean,
  ): string {
    const functionName = `query${operationName}`;
    const kebabCaseKey = operationName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .substring(1);

    return `
export const ${functionName} = createQuery<${operationResultType}, ${operationVariablesTypes}>(
  ${documentVariableName},
  '${kebabCaseKey}'
);
`;
  }

  private buildMutationPrimitive(
    node: OperationDefinitionNode,
    operationName: string,
    documentVariableName: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean,
  ): string {
    const functionName = `action${operationName}`;
    const kebabCaseKey = operationName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .substring(1);

    return `
export const ${functionName} = () => createMutation<${operationResultType}, ${operationVariablesTypes}>(
  ${documentVariableName},
  '${kebabCaseKey}'
);
`;
  }
}
