import { Token } from "./token";

export class Lexer {

    private _input: string;

    private _tokens: Token[];

    constructor(input: string) {
        this._input = input;
        this._tokens = [];
    }

    public lex(): Token[] {
        let position = 0;
        let chunk: string;
        while (chunk = this._input.slice(position)) {
            const bytesConsumed =
                this.tokenizeByWords(position, chunk, [
                    "SELECT",
                    "FROM",
                    "WHERE",
                    "ORDER BY",
                    "SKIP",
                    "TAKE"
                ]) ||
                this.tokenizeByWords(position, chunk, [
                    "ASC",
                    "DESC"
                ]) ||
                this.tokenizeByComma(position, chunk) ||
                this.tokenizeByStar(position, chunk) ||
                this.tokenizeByWords(position, chunk, [
                    "=", "!=",
                    ">=", ">",
                    "<=", "<",
                    "~", "!~",
                    "IN", "NOT IN"
                ]) ||
                this.tokenizeByNull(position, chunk) ||
                this.tokenizeByWords(position, chunk, [
                    "AND",
                    "OR"
                ]) ||
                this.tokenizeByFunction(position, chunk) ||
                this.tokenizeByNumber(position, chunk) ||
                this.tokenizeByString(position, chunk) ||
                this.tokenizeByParen(position, chunk) ||
                this.tokenizeBySpaces(chunk) ||
                this.tokenizeByLiteral(position, chunk);

            if (bytesConsumed < 1) {
                throw Error(`lexer failed at ${position}`);
            }
            position += bytesConsumed;
        }
        this.tokenize("EOF", "", position);
        return this._tokens;
    }

    private tokenize(type: string, value: any, position: number): void {
        this._tokens.push({
            type: type,
            value: value,
            position: position
        });
    }

    private tokenizeByWords(position: number, chunk: string, words: string[]): number {
        for (const raw of words) {
            const word = this.escape(raw);
            const matcher = (/^\w+$/).test(word) ? new RegExp(`^(${word})\\b`, 'ig') : new RegExp(`^(${word})`, 'ig');
            const match = matcher.exec(chunk);
            if (match && match.length > 0) {
                this.tokenize(raw, match[1], position);
                return match[1].length;
            }
        }
        return 0;
    }

    private tokenizeBySpaces(chunk: string): number {
        const match = /^[ \n\r]+/.exec(chunk);
        if (match) {
            const partMatch = match[0];
            return partMatch.length;
        }
        else {
            return 0;
        }
    }

    private tokenizeByFunction(position: number, chunk: string): number {
        const match = /^([a-z_][a-z0-9_]*\([^\)]*\))/i.exec(chunk);
        if (match && match.length > 0) {
            this.tokenize("FUNCTION", match[1], position);
            return match[1].length;
        }
        else {
            return 0;
        }
    }

    private tokenizeByLiteral(position: number, chunk: string): number {
        const match = /^`?([a-z_][a-z0-9_]{0,})`?/i.exec(chunk);
        if (match && match.length > 0) {
            this.tokenize("LITERAL", match[1], position);
            return match[1].length;
        }
        else {
            return 0;
        }
    }

    private tokenizeByNumber(position: number, chunk: string): number {
        const match = /^(\+|\-)?[0-9]+(\.[0-9]+)?/i.exec(chunk);
        if (match && match.length > 0) {
            this.tokenize("NUMBER", Number(match[0]), position);
            return match[0].length;
        }
        else {
            return 0;
        }
    }

    private tokenizeByString(position: number, chunk: string): number {
        {
            const match = /^'([^\\']*(?:\\.[^\\']*)*)'/.exec(chunk);
            if (match && match.length > 0) {
                this.tokenize("STRING", match[1], position);
                return match[0].length;

            }
        }
        {
            const match = /^"([^\\"]*(?:\\.[^\\"]*)*)"/.exec(chunk);
            if (match && match.length > 0) {
                this.tokenize("STRING", match[1], position);
                return match[0].length;

            }
        }
        return 0;
    }

    private tokenizeByNull(position: number, chunk: string): number {
        const match = /^NULL/i.exec(chunk);
        if (match && match.length >= 0) {
            this.tokenize("NULL", null, position);
            return match[0].length;
        }
        return 0;
    }

    private tokenizeByParen(position: number, chunk: string): number {
        {
            const match = /^\(/.exec(chunk);
            if (match && match.length >= 0) {
                this.tokenize("(", match[0], position);
                return match[0].length;

            }
        }
        {
            const match = /^\)/.exec(chunk);
            if (match && match.length >= 0) {
                this.tokenize(")", match[0], position);
                return match[0].length;

            }
        }
        {
            const match = /^\[/.exec(chunk);
            if (match && match.length >= 0) {
                this.tokenize("[", match[0], position);
                return match[0].length;

            }
        }
        {
            const match = /^\]/.exec(chunk);
            if (match && match.length >= 0) {
                this.tokenize("]", match[0], position);
                return match[0].length;

            }
        }
        return 0;
    }

    private tokenizeByComma(position: number, chunk: string): number {
        const match = /^,/.exec(chunk);
        if (match && match.length >= 0) {
            this.tokenize("COMMA", match[0], position);
            return match[0].length;
        }
        else {
            return 0;
        }
    }

    private tokenizeByStar(position: number, chunk: string): number {
        const match = /^\*/.exec(chunk);
        if (match && match.length >= 0) {
            this.tokenize("*", match[0], position);
            return match[0].length;
        }
        else {
            return 0;
        }
    }

    private escape(str: string): string {
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

}