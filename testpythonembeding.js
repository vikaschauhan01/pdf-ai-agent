import { generateEmbeddings } from "./embeddingservice.js";

const embeddings = await generateEmbeddings([
  "credit card expenses",
]);

console.log("Vectors:", embeddings.length);
console.log("Dimensions:", embeddings[0].length);