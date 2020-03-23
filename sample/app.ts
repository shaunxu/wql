import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
import { Compiler } from "../src/compiler";

//             0         1         2         3         4         5         6         7         8         9
//             01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
// const query = `FROM workitems SELECT _id, name WHERE name != "shaun xu" AND (value >= -0123.456 OR assignee != NULL) ORDER BY name ASC, value DESC SKIP 100 TAKE 1000`;
// const query = "select name, _id from my_table where a = 1 and (b > 2 or c < 3) order by a asc, b desc";
// const target = {
//     collection: "my_table",
//     project: [
//         "name",
//         "_id"
//     ],
//     match: {
//         condition: {
//             operation: "and",
//             left: {
//                 operation: "=",
//                 left: "a",
//                 right: 1
//             },
//             right: {
//                 operation: "or",
//                 left: {
//                     operation: ">",
//                     left: "b",
//                     right: 2
//                 },
//                 right: {
//                     operation: "<",
//                     left: "c",
//                     right: 3
//                 }
//             }
//         }
//     },
//     sort: [
//         {
//             value: "a",
//             direction: "asc"
//         },
//         {
//             value: "b",
//             direction: "desc"
//         }
//     ]
// };
// const query = `FROM projects SELECT _id, name WHERE owner = me() AND updated_at >= dateOffset(-1, "w")`;
// const query = `a = 1 and (b = 2 or c = 3)`;
const query = `from workitems select _id, name where a = 1 and (b = 2 or c = 3) order by _id asc, created_at desc skip 100 take 1000`;
const lexer = new Lexer(query);
const tokens = lexer.lex();

console.log(query);
// console.log(JSON.stringify(tokens, undefined, 2));

const parser = new Parser();
const ast = parser.parse(tokens);
// console.log(JSON.stringify(ast, undefined, 2));

const compiler = new Compiler();
compiler.compile(ast).then(out => {
    console.log(JSON.stringify(out, undefined, 2));
}).catch(() => { });