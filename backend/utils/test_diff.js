const { diffIngredients } = require('./diff');

const prev = ['Chicken', 'Brown Rice', 'Peas', 'Added Color'];
const curr = ['Chicken', 'Rice, Brown ', 'Carrots', 'Vitamin E'];

console.log("Testing diff implementation...\n");
const result = diffIngredients(prev, curr);

console.log('Previous:', prev);
console.log('Current:', curr);
console.log('\nResult:');
console.log(JSON.stringify(result, null, 2));
