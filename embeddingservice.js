export async function generateEmbeddings(texts) {
  const response = await fetch("http://localhost:8000/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts,
    }),
  });

  const data = await response.json();

  return data.embeddings;
}