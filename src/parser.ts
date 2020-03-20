import { Token } from "./token";
import { Node, NodeFactory } from "./node-factory";

export class Parser {

    private _stack: Node[];
    public get stack(): Node[] {
        return this._stack;
    }

    private _parenNodeSize: number;

    constructor() {
        this._stack = [
            NodeFactory.createRootNode()
        ];
        this._parenNodeSize = 0;
    }

    private peek(): Node {
        return this._stack[this._stack.length - 1];
    }

    private pop(): Node {
        return this._stack.pop() as Node;
    }

    private pushToStack(node: Node): void {
        this._stack.push(node);
    }

    private pushToChildren(top: Node, node: Node): void {
        top.children.push(node);
    }

    private retire(node: Node): void {
        const top = this.pop();
        this.pushToChildren(node, top);
        this.pushToStack(node);
    }

    public parse(tokens: Token[]): void {
        for (const token of tokens) {
            this.parseToken(token);
        }
    }

    public parseToken(token: Token): void {
        const top = this.peek();

        if (token.type === "LITERAL") {
            if (top.isFull) {
                throw new Error(`Cannot parse a literal token when top node is full.`);
            }
            const lit = NodeFactory.createLiteralNode(token.value);
            if (top.isNotFull) {
                throw new Error(`Cannot parse a literal token when top node is not full.`);
            }
            else {
                this.pushToStack(lit);
                return;
            }
        }

        if (["=", "!=", ">", ">=", "<", "<="].some(x => x === token.type)) {
            if (top.isFull) {
                const cmp = NodeFactory.createCompareNode(token.type);
                this.retire(cmp);
                return;
            }
            else {
                throw new Error(`Cannot parse a compare token when top node is not full.`);
            }
        }

        if (token.type === "NUMBER") {
            if (top.isFull) {
                throw new Error(`Cannot parse a number token when top node is full.`);
            }
            const num = NodeFactory.createNumberNode(Number(token.value));
            if (top.isNotFull) {
                this.pushToChildren(top, num);
                return;
            }
            else {
                throw new Error(`Cannot parse a number token when top node is full.`);
            }
        }
    }

}