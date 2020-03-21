import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
import { Parser2 } from "../src/parser2";
import { Parser3 } from "../src/parser3";

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
// const query = `a = 1 and (b = 2 and c = 3 or d = 4)`;
const query = `a in [1, ["a", 3], 4] and b = "b" and c = me()`;
const lexer = new Lexer(query);
const tokens = lexer.lex();

console.log(query);
// console.log(JSON.stringify(tokens, undefined, 2));

// const parser = new Parser();
// parser.parse(tokens);
// console.log(JSON.stringify(parser.stack, undefined, 2));

// const parser2 = new Parser2();
// parser2.parse(tokens);
// console.log(JSON.stringify(parser2.root, undefined, 2));

const parser3 = new Parser3();
const ast = parser3.parse(tokens);
console.log(JSON.stringify(ast, undefined, 2));