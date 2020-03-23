import { Token } from "./token";
import * as uuid from "uuid";

export type Resource = string;

export type Field = string;

export interface Sort {
    [key: string]: "ASC" | "DESC";
}

export interface AbstractSyntaxTree {

    from: Resource;

    select: Field[] | undefined;

    where: ConditionNode | undefined;

    sort: Sort | undefined;

    skip: number | undefined;

    take: number | undefined;

}

export interface ConditionNode {
    type: string;
    value: any;
    left?: ConditionNode;
    right?: ConditionNode;
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

export const KEYWORDS = [
    "FROM",
    "SELECT",
    "WHERE",
    "ORDER BY",
    "SKIP",
    "TAKE",
    "EOF"
]

export const OP_TYPES = Object.keys(OP_PRIORITIES);

export class Parser {

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

    private packageConditionNode(stack: Token[], nodes: Map<string, ConditionNode>): void {
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

        const node: ConditionNode = {
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

    private buildConditionNode(node: ConditionNode, nodes: Map<string, ConditionNode>): void {
        if (node.left && node.left.type === "NODE") {
            node.left = nodes.get(node.left.value) as ConditionNode;
            this.buildConditionNode(node.left as ConditionNode, nodes);
        }
        if (node.right && node.right.type === "NODE") {
            node.right = nodes.get(node.right.value) as ConditionNode;
            this.buildConditionNode(node.right as ConditionNode, nodes);
        }
    }

    public parse(tokens: Token[]): AbstractSyntaxTree {
        const ast: AbstractSyntaxTree = {
            from: "",
            select: undefined,
            where: undefined,
            sort: undefined,
            skip: undefined,
            take: undefined
        };

        let i = 0;
        while (i <= tokens.length - 1) {
            // from
            i = this.parseFrom(tokens, i, ast);

            // select
            i = this.parseSelect(tokens, i, ast);

            // where
            i = this.parseWhere(tokens, i, ast);

            // order by
            i = this.parseSort(tokens, i, ast);

            // skip
            i = this.parseSkip(tokens, i, ast);

            // take
            i = this.parseTake(tokens, i, ast);

            // eof
            if (tokens[i].type === "EOF") {
                i++;
                continue;
            }
        }

        return ast;
    }

    private parseFrom(tokens: Token[], start: number, ast: AbstractSyntaxTree): number {
        let i = start;
        const token = tokens[i];
        
        if (token.type === "FROM") {
            i++;
            if (tokens[i].type === "LITERAL") {
                ast.from = tokens[i].value;
                return i + 1;
            }
            else {
                throw new Error(`[${tokens[i].position}] "FROM" must follows with one resource.`);
            }
        }

        return start;
    }

    private parseSelect(tokens: Token[], start: number, ast: AbstractSyntaxTree): number {
        let i = start;
        let token = tokens[i];

        if (token.type === "SELECT") {
            const fields: Field[] = [];
            i++;
            while (i <= tokens.length - 1) {
                token = tokens[i];
                
                if (token.type === "LITERAL") {
                    fields.push(token.value);
                    i++;
                    continue;
                }

                if (token.type === "COMMA") {
                    i++;
                    continue;
                }

                if (token.type === "FUNCTION") {
                    fields.push(token.value);
                    i++;
                    continue;
                }

                if (token.type === "*") {
                    return i + 1;
                }

                if (KEYWORDS.some(x => x === token.type)) {
                    if (fields.length > 0) {
                        ast.select = fields;
                    }
                    return i;
                }

                throw new Error(`[${i}] "SELECT" must follow with fields, functions, "*" with comma split`);
            }
        }

        return start;
    }

    private parseWhere(tokens: Token[], start: number, ast: AbstractSyntaxTree): number {
        if (tokens[start].type === "WHERE") {
            const { top, length, nodes } = this.parseWhereTokens(tokens.slice(start + 1));
            const node = this.buildWhere(top.value, nodes);
            ast.where = node;
            return start + length + 1;
        }

        return start;
    }

    private buildWhere(rootKey: string, nodes: Map<string, ConditionNode>): ConditionNode {
        const root = nodes.get(rootKey) as ConditionNode;
        this.buildConditionNode(root, nodes);
        return root;
    }

    private parseWhereArray(tokens: Token[], current: any): number {
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
                const step = this.parseWhereArray(tokens.slice(i + 1), sub);
                i = i + step;
                continue;
            }

            if (token.type === "]") {
                return i + 2; // i + 2 means skip the last "]"
            }
        }

        throw new Error(`Parse array failed.`);
    }

    private parseWhereTokens(tokens: Token[]): { top: Token, length: number, nodes: Map<string, ConditionNode> } {
        const stack: Token[] = [];
        const nodes: Map<string, ConditionNode> = new Map<string, ConditionNode>();
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
                            this.packageConditionNode(stack, nodes);
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
                const intermediate = this.parseWhereTokens(tokens.slice(i + 1)); // i + 1 means skip the left paren
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
                    this.packageConditionNode(stack, nodes);
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
                const step = this.parseWhereArray(tokens.slice(i + 1), arr);
                stack.push({
                    type: "ARRAY",
                    value: arr,
                    position: i
                });
                i = i + step;
                continue;
            }

            // end of where (meet new keyword)
            if (KEYWORDS.some(x => x === token.type)) {
                while (stack.length > 1) {
                    this.packageConditionNode(stack, nodes);
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

    private parseSort(tokens: Token[], start: number, ast: AbstractSyntaxTree): number {
        let i = start;
        let token = tokens[i];

        if (token.type === "ORDER BY") {
            const sort: Sort = {};
            i++;
            while (i <= tokens.length - 1) {
                if (tokens[i].type === "LITERAL" && ["ASC", "DESC"].some(x => x === tokens[i + 1].type)) {
                    sort[tokens[i].value] = tokens[i + 1].value;
                    i = i + 2;
                    continue;
                }

                if (tokens[i].type === "COMMA") {
                    i++;
                    continue;
                }

                if (KEYWORDS.some(x => x === token.type)) {
                    ast.sort = sort;
                    return i;
                }

                throw new Error(`[${i}] "SORT" must follow with fields with "ASC" | "DESC"`);
            }
        }

        return start;
    }

    private parseSkip(tokens: Token[], start: number, ast: AbstractSyntaxTree): number {
        let i = start;
        const token = tokens[i];

        if (token.type === "SKIP") {
            i++;
            if (tokens[i].type === "NUMBER") {
                const skip = Number(tokens[i].value);
                if (skip > 0) {
                    ast.skip = skip;
                    return i + 1;
                }
                else if (skip === 0) {
                    // skip 0 means no skip
                    return i + 1;
                }
                else {
                    throw new Error(`[${tokens[i].position}] "SKIP" must follows with number that is greater than or equal to zero.`);
                }
            }
            else {
                throw new Error(`[${tokens[i].position}] "SKIP" must follows with number.`);
            }
        }

        return start;
    }

    private parseTake(tokens: Token[], start: number, ast: AbstractSyntaxTree): number {
        let i = start;
        const token = tokens[i];

        if (token.type === "TAKE") {
            i++;
            if (tokens[i].type === "NUMBER") {
                const take = Number(tokens[i].value);
                if (take > 0) {
                    ast.take = take;
                    return i + 1;
                }
                else {
                    throw new Error(`[${tokens[i].position}] "SKIP" must follows with number that is greater than zero.`);
                }
            }
            else {
                throw new Error(`[${tokens[i].position}] "SKIP" must follows with number.`);
            }
        }

        return start;
    }
}