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
    "=": 3, "!=": 3,
    ">": 4, ">=": 4, "<": 4, "<=": 4
};

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

    public build(rootKey: string, nodes: Map<string, Node>): Node {
        const root = nodes.get(rootKey) as Node;
        this.buildNode(root, nodes);
        return root;
    }

    public parse(tokens: Token[], start: number = 0): { top: Token, length: number, nodes: Map<string, Node> } {
        const stack: Token[] = [];
        const nodes: Map<string, Node> = new Map<string, Node>();
        let i = start;

        while (i <= tokens.length - 1) {
            const token = tokens[i];

            // literal
            if (token.type === "LITERAL") {
                stack.push(token);
                i++;
                continue;
            }

            // number
            if (token.type === "NUMBER") {
                stack.push(token);
                i++
                continue;
            }

            // operator
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
                const intermediate = this.parse(tokens.slice(i + 1)); // i + 1 means skip the left paren
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
                    length: i + 1, // i + 1 means skip the right paren
                    nodes: nodes
                };
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
        }

        throw new Error(`Parse error`);
    }

}