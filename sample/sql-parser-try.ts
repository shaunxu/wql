const sqlparser = require("sql-parser");

const tokens = sqlparser.lexer.tokenize('select name from my_table where a = 1 and (b = 2 or c = 3) order by a asc, b desc');
console.log(tokens);

const ast = sqlparser.parser.parse(tokens);
console.log(JSON.stringify(ast, undefined, 2));