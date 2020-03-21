import { Token } from "./token";
import * as uuid from "uuid";

export interface Node {
    type: string;
    value: any;
    left?: Node;
    right?: Node;
}

export const OP_PRIORITIES: { [key: string]: number } = {
    "OR": 1,
    "AND": 2,
    "=": 3, "!=": 3, ">": 3, ">=": 3, "<": 3, "<=": 3, "IN": 3, "NOT IN": 3
};

export const LEFT_TYPES = [
    "LITERAL",
    "NODE"
];

export const RIGHT_TYPES = [
    "NUMBER",
    "STRING",
    "ARRAY",
    "NULL",
    "FUNCTION",
    "NODE"
];

export const OP_TYPES = Object.keys(OP_PRIORITIES);

export class Parser3 {

    constructor() {
    }

    private peekLastOpToken(stack: Token[]): Token | undefined {
        for (let i = stack.length - 1; i >= 0; i--) {
            const token = stack[i];
            if (Object.keys(OP_PRIORITIES).some(x => x === token.type)) {
                return token;
            }
        }
    }

    private packgeNode(stack: Token[], nodes: Map<string, Node>): void {
        if (stack.length < 3) {
            throw new Error(`Cannot package a node from stack with less than 3 tokens`);
        }

        const right = stack.pop() as Token;
        const op = stack.pop() as Token;
        const left = stack.pop() as Token;

        if (!LEFT_TYPES.some(x => x === left.type)) {
            throw new Error(`Invalid left part at ${left.position} ${left.value}`);
        }
        if (!RIGHT_TYPES.some(x => x === right.type)) {
            throw new Error(`Invalid right part at ${right.position} ${right.value}`);
        }
        if (!OP_TYPES.some(x => x === op.type)) {
            throw new Error(`Invalid operator part at ${op.position} ${op.value}`);
        }

        const node: Node = {
            type: op.type,
            value: op.value,
            left: {
                type: left.type,
                value: left.value
            },
            right: {
                type: right.type,
                value: right.value
            }
        };
        const key = uuid.v4();
        nodes.set(key, node);
        stack.push({
            type: "NODE",
            value: key,
            position: -1
        });
    }

    private buildNode(node: Node, nodes: Map<string, Node>): void {
        if (node.left && node.left.type === "NODE") {
            node.left = nodes.get(node.left.value) as Node;
            this.buildNode(node.left as Node, nodes);
        }
        if (node.right && node.right.type === "NODE") {
            node.right = nodes.get(node.right.value) as Node;
            this.buildNode(node.right as Node, nodes);
        }
    }

    public parse(tokens: Token[]): Node {
        const { top, nodes } = this.parseTokens(tokens);
        return this.build(top.value, nodes);
    }

    private build(rootKey: string, nodes: Map<string, Node>): Node {
        const root = nodes.get(rootKey) as Node;
        this.buildNode(root, nodes);
        return root;
    }

    private parseArray(tokens: Token[], current: any): number {
        let i = 0;
        while (i <= tokens.length - 1) {
            const token = tokens[i];

            if (token.type === "NUMBER") {
                current.push(token.value);
                i++;
                continue;
            }

            if (token.type === "STRING") {
                current.push(token.value);
                i++;
                continue;
            }

            if (token.type === "COMMA") {
                i++;
                continue;
            }

            if (token.type === "[") {
                const sub: any[] = [];
                current.push(sub);
                const step = this.parseArray(tokens.slice(i + 1), sub);
                i = i + step;
                continue;
            }

            if (token.type === "]") {
                return i + 2; // i + 2 means skip the last "]"
            }
        }

        throw new Error(`Parse array failed.`);
    }

    private parseTokens(tokens: Token[]): { top: Token, length: number, nodes: Map<string, Node> } {
        const stack: Token[] = [];
        const nodes: Map<string, Node> = new Map<string, Node>();
        let i = 0;

        while (i <= tokens.length - 1) {
            const token = tokens[i];

            // literal
            if (token.type === "LITERAL") {
                stack.push(token);
                i++;
                continue;
            }

            // number, null, string, function
            if (token.type === "NUMBER" || token.type === "NULL" || token.type === "STRING" || token.type === "FUNCTION") {
                stack.push(token);
                i++
                continue;
            }

            // operator (=, !=, >, >=, ...)
            if (Object.keys(OP_PRIORITIES).some(x => x === token.type)) {
                let pack = true;
                while (pack) {
                    const lastOpToken = this.peekLastOpToken(stack);
                    if (lastOpToken) {
                        const lastOpTokenPriority = OP_PRIORITIES[lastOpToken.type];
                        const thisOpTokenPriority = OP_PRIORITIES[token.type];
                        if (thisOpTokenPriority < lastOpTokenPriority) {
                            this.packgeNode(stack, nodes);
                            pack = true;
                        }
                        else {
                            pack = false;
                        }
                    }
                    else {
                        pack = false;
                    }
                }
                stack.push(token);
                i++;
                continue;
            }

            // left paren
            if (token.type === "(") {
                const intermediate = this.parseTokens(tokens.slice(i + 1)); // i + 1 means skip the left paren
                stack.push(intermediate.top);
                intermediate.nodes.forEach((n, k) => {
                    nodes.set(k, n);
                });
                i = i + intermediate.length;
                continue;
            }

            // right paren
            if (token.type === ")") {
                while (stack.length > 1) {
                    this.packgeNode(stack, nodes);
                }
                return {
                    top: stack[0],
                    length: i + 2, // i + 2 means skip the right paren
                    nodes: nodes
                };
            }

            // left bracket
            if (token.type === "[") {
                const arr: any = [];
                const step = this.parseArray(tokens.slice(i + 1), arr);
                stack.push({
                    type: "ARRAY",
                    value: arr,
                    position: i
                });
                i = i + step;
                continue;
            }

            // eof
            if (token.type === "EOF") {
                while (stack.length > 1) {
                    this.packgeNode(stack, nodes);
                }
                return {
                    top: stack[0],
                    length: i,
                    nodes: nodes
                };
            }

            // meet invalid token
            throw new Error(`Invalid token [${token.type}, ${token.value}] at ${token.position}`);
        }

        throw new Error(`Parse error`);
    }

}