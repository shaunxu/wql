import { Node } from "./parser";
import { PreDefinedFunction } from "./pre-defined-fn";

export class Compiler {

    constructor() {

    }

    private async evaluateRightPart(node: Node): Promise<Node> {
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

    private async compileCondition(current: any, node: Node): Promise<void> {
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

    public async compile(ast: Node): Promise<any> {
        const condition: any = {};
        await this.compileCondition(condition, ast);
        return condition;
    }

}