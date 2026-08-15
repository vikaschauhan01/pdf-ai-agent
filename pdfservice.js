import dotenv from "dotenv";
dotenv.config();

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { generateEmbeddings } from "./embeddingservice.js";

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        realtime: { transport: ws },
        auth: { persistSession: false },
    }
);

export async function processPDF(filePath, sessionId) {
    try {

        // await supabaseClient
        //     .from("documents_bge")
        //     .delete()
        //     .filter(
        //         "metadata->>sessionId",
        //         "eq",
        //         sessionId
        //     );

        const loader = new PDFLoader(filePath);

        const docs = await loader.load();

        console.log(
            `Pages loaded: ${docs.length}`
        );

        const validPages = docs.filter(
            doc =>
                doc.pageContent &&
                doc.pageContent.trim().length > 0
        );

        const splitter =
            new RecursiveCharacterTextSplitter({
                chunkSize: 1200,
                chunkOverlap: 200,
            });

        const splitDocs =
            await splitter.splitDocuments(
                validPages
            );

        const validChunks =
            splitDocs.filter(
                doc =>
                    doc.pageContent &&
                    doc.pageContent.trim().length >
                        20
            );

        console.log(
            `Valid chunks: ${validChunks.length}`
        );

        validChunks.forEach(doc => {
            doc.pageContent =
                doc.pageContent
                    .replace(/\u0000/g, "")
                    .replace(
                        /[^\x20-\x7E\n\r\t]/g,
                        " "
                    )
                    .trim();

            doc.metadata.sessionId =
                sessionId;
        });

        const batchSize = 20;

let successChunks = 0;
let failedChunks = 0;

for (
    let i = 0;
    i < validChunks.length;
    i += batchSize
) {

    const batch =
        validChunks.slice(
            i,
            i + batchSize
        );

    console.log(
        `\n========== BATCH ${i}-${i + batch.length - 1} ==========`
    );

    try {

        const texts =
            batch.map(
                doc => doc.pageContent
            );

        const vectors =
            await generateEmbeddings(
                texts
            );

        const rows =
            batch.map(
                (doc, index) => ({
                    content:
                        doc.pageContent,
                    metadata:
                        doc.metadata,
                    embedding:
                        vectors[index],
                })
            );

        const { error } =
            await supabaseClient
                .from(
                    "documents_bge"
                )
                .insert(rows);

        if (error) {
            throw error;
        }

        successChunks +=
            batch.length;

        console.log(
            `Batch Success`
        );

    } catch (batchError) {

        console.error(
            `Batch Failed ${i}-${i + batch.length - 1}`
        );

        console.error(
            batchError.message
        );

        for (
            let j = 0;
            j < batch.length;
            j++
        ) {

            try {

                const doc =
                    batch[j];

                const [vector] =
                    await generateEmbeddings([
                        doc.pageContent,
                    ]);

                const {
                    error,
                } =
                    await supabaseClient
                        .from(
                            "documents_bge"
                        )
                        .insert([
                            {
                                content:
                                    doc.pageContent,
                                metadata:
                                    doc.metadata,
                                embedding:
                                    vector,
                            },
                        ]);

                if (error) {
                    throw error;
                }

                successChunks++;

                console.log(
                    `Chunk ${i + j} Success`
                );

            } catch (
                chunkError
            ) {

                failedChunks++;

                console.error(
                    `Chunk ${i + j} Failed`
                );

                console.error(
                    chunkError.message
                );

                console.log(
                    "Page:",
                    batch[j]
                        .metadata
                        ?.loc?.pageNumber ||
                    "Unknown"
                );

                continue;
            }
        }
    }

    console.log(
        `Progress: ${successChunks}/${validChunks.length}`
    );
}

console.log("\n========== SUMMARY ==========");

console.log(
    `Total Chunks: ${validChunks.length}`
);

console.log(
    `Success: ${successChunks}`
);

console.log(
    `Failed: ${failedChunks}`
) }catch (error) {
        console.error(error);
        throw error;
    }
}

export async function answerPDFQuestion(
    question,
    sessionId
) {
    try {

        const model =
            new ChatGoogleGenerativeAI({
                apiKey:
                    process.env
                        .GOOGLE_API_KEY,
                model:
                    "gemini-3.1-flash-lite",
                temperature: 0,
            });

        const [questionEmbedding] =
            await generateEmbeddings([
                question,
            ]);

        const { data, error } =
            await supabaseClient.rpc(
                "match_documents_bge",
                {
                    query_embedding:
                        questionEmbedding,
                    match_count: 20,
                }
            );

        if (error) {
            throw error;
        }

        const docs = data.filter(
            item =>
                item.metadata
                    ?.sessionId ===
                sessionId
        );

        console.log(
            "QUESTION:",
            question
        );

        console.log(
            "DOCS FOUND:",
            docs.length
        );

        const context = docs
            .map(
                item => item.content
            )
            .join("\n\n");

        const prompt =
            ChatPromptTemplate.fromMessages([
                [
                    "system",
                    `You are a tax document assistant.

Use only the provided PDF context.

Instructions:
- Find the relevant section.
- Combine multiple chunks if needed.
- Mention section numbers.
- Do not use outside knowledge.

If answer not found:

"I could not find that information in the uploaded PDF."

Context:

{context}
`,
                ],
                ["human", "{input}"],
            ]);

        const formatted =
            await prompt.formatMessages({
                context,
                input: question,
            });

        const response =
            await model.invoke(
                formatted
            );

        return response.content;

    } catch (error) {
        console.error(error);
        throw error;
    }
}