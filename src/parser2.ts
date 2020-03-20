import { Token } from "./token";

export class Node {

    public get lastChild(): any {
        return this.children[this.children.length - 1];
    }

    constructor(
        public type: string,
        public children: any[]
    ) { }

}

export class LiteralNode extends Node {

    constructor(value: string) {
        super("LITERAL", [value]);
    }

}

export class NumberNode extends Node {

    constructor(value: number) {
        super("NUMBER", [value]);
    }

}

export class StringNode extends Node {

    constructor(value: string) {
        super("STRING", [value]);
    }

}

export class CompareNode extends Node {

    constructor() {
        super("CMP", []);
    }

}

export class LogisticalNode extends Node {

    constructor(op: "AND" | "OR") {
        super(op, []);
    }

}


export class Parser2 {

    private _root: LogisticalNode;
    public get root(): Node {
        return this._root;
    }

    constructor() {
        this._root = new LogisticalNode("AND");
    }

    public parse(tokens: Token[]): void {
        let node: Node = this._root;
        for (const token of tokens) {
            node = this.parseToken(node, token);
        }
    }

    public parseToken(node: Node, token: Token): Node {
        
        if (token.type === "LITERAL") {
            if (node.type === "AND" || node.type === "OR") {
                node.children.push(new LiteralNode(token.value));
                return node;
            }
            else {
                throw new Error(`Ch ${token.position}: Cannot parse literal token when current node is not a logistical node`);
            }
        }

        if (["=", "!=", ">", ">=", "<", "<="].some(x => x === token.type)) {
            if (node.type === "AND" || node.type === "OR") {
                if (node.lastChild && node.lastChild.type === "LITERAL") {
                    const cmp = new CompareNode();
                    cmp.children.push(node.lastChild);
                    cmp.children.push(token.value);
                    node.children[0] = cmp;
                    return node;
                }
                else {
                    throw new Error(`Ch ${token.position}: Cannot parse compare token when current node first child is not a literal`);
                }
            }
            else {
                throw new Error(`Ch ${token.position}: Cannot parse compare token when current node is not a logistical node`);
            }
        }

        if (token.type === "NUMBER") {
            if (node.type === "AND" || node.type === "OR") {
                if (node.lastChild && node.lastChild.type === "CMP" && node.lastChild.children.length === 2) {
                    node.lastChild.children.push(new NumberNode(Number(token.value)));
                    return node;
                }
                else {
                    throw new Error(`Ch ${token.position}: Cannot parse number token when current node last child is not [literal, cmp]`);
                }
            }
            else {
                throw new Error(`Ch ${token.position}: Cannot parse number token when current node is not a logistical node`);
            }
        }

        return node;

    }

}