import { ConditionNode, AbstractSyntaxTree } from "./parser";
import { PreDefinedFunction } from "./pre-defined-fn";

export interface MongoDBQuery {

    collectionName: string;

    project: string[] | undefined;

    condition: any | undefined;

    sort: Array<[string, 1 | -1]> | undefined;

    skip: number | undefined;

    limit: number | undefined;

}

export class Compiler {

    constructor() {

    }

    private async evaluateRightPart(node: ConditionNode): Promise<ConditionNode> {
        if (node.type === "FUNCTION") {
            const fn: string = node.value;
            const name = fn.substring(0, fn.indexOf("("));
            const args = fn.substring(fn.indexOf("(") + 1, fn.indexOf(")")).split(",").map(x => {
                x = x.trim();
                if (x.startsWith("\"") && x.endsWith("\"")) {
                    return x.substring(1, x.length - 1);
                }
                else {
                    return Number(x);
                }
            });
            node.value = await PreDefinedFunction.invoke(name, args);
            return node;
        }
        else {
            return node;
        }
    }

    private async compileCondition(current: any, node: ConditionNode): Promise<void> {
        if (node.type === "AND") {
            const left: any = {};
            const right: any = {};
            current.$and = [
                left,
                right
            ];
            await Promise.all([
                this.compileCondition(left, node.left!),
                this.compileCondition(right, node.right!)
            ]);
        }

        if (node.type === "OR") {
            const left: any = {};
            const right: any = {};
            current.$or = [
                left,
                right
            ];
            await Promise.all([
                this.compileCondition(left, node.left!),
                this.compileCondition(right, node.right!)
            ]);
        }

        if (node.type === "=") {
            current[node.left?.value] = (await this.evaluateRightPart(node.right!)).value;
        }

        if (node.type === "!=") {
            current[node.left?.value] = {
                $ne: (await this.evaluateRightPart(node.right!)).value
            };
        }

        if (node.type === ">") {
            current[node.left?.value] = {
                $gt: (await this.evaluateRightPart(node.right!)).value
            };
        }

        if (node.type === ">=") {
            current[node.left?.value] = {
                $gte: (await this.evaluateRightPart(node.right!)).value
            };
        }

        if (node.type === "<") {
            current[node.left?.value] = {
                $lte: (await this.evaluateRightPart(node.right!)).value
            };
        }

        if (node.type === "<=") {
            current[node.left?.value] = {
                $lte: (await this.evaluateRightPart(node.right!)).value
            };
        }

        if (node.type === "IN") {
            current[node.left?.value] = {
                $in: (await this.evaluateRightPart(node.right!)).value
            };
        }

        if (node.type === "NOT IN") {
            current[node.left?.value] = {
                $nin: (await this.evaluateRightPart(node.right!)).value
            };
        }
    }

    public async compile(ast: AbstractSyntaxTree): Promise<MongoDBQuery> {
        const query: MongoDBQuery = {
            collectionName: ast.from,
            project: ast.select,
            condition: {},
            sort: undefined,
            skip: ast.skip,
            limit: ast.take
        };
        if (ast.where) {
            this.compileCondition(query.condition, ast.where);
        }
        if (ast.sort) {
            query.sort = [];
            for (const key in ast.sort) {
                query.sort.push([key, ast.sort[key].toUpperCase() === "ASC" ? 1 : -1]);
            }
        }
        return query;
    }

}