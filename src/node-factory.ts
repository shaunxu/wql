export interface Node {
    type: string;
    children: any[];
    maxChildren: number;
}

export class Node {

    public get isNoChildren(): boolean {
        return this.maxChildren <= 0;
    }

    public get isNotFull(): boolean {
        return this.maxChildren > 0 && this.children.length < this.maxChildren;
    }

    public get isFull(): boolean {
        return this.maxChildren > 0 && this.children.length >= this.maxChildren;
    }

    constructor(
        public type: string,
        public children: any[],
        public maxChildren: number
    ) { }

}

export class NodeFactory {

    private static createNode(type: string, children: any[], maxChildren: number): Node {
        return new Node(type, children, maxChildren);
    }

    public static createRootNode(): Node {
        return NodeFactory.createNode("ROOT", [], 0);
    }

    public static createNumberNode(value: number): Node {
        return NodeFactory.createNode("NUMBER", [value], 1);
    }

    public static createLiteralNode(value: string): Node {
        return NodeFactory.createNode("LITERAL", [value], 1);
    }

    public static createCompareNode(type: string): Node {
        switch (type) {
            case ">":
                return NodeFactory.createNode(">", [], 2);
            case ">=":
                return NodeFactory.createNode(">=", [], 2);
            case "<":
                return NodeFactory.createNode("<", [], 2);
            case "<=":
                return NodeFactory.createNode("<=", [], 2);
            case "=":
                return NodeFactory.createNode("=", [], 2);
            case "!=":
                return NodeFactory.createNode("!=", [], 2);
            default:
                throw new Error(`Invalid token type "${type}" for compare node.`);
        }
    }

}