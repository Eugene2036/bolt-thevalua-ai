import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { z } from "zod";
import { prisma } from '~/db.server';

// Define the expected structure of the API response
interface DeepSeekResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
    error?: {
        message: string;
    };
}

interface ChatRequest {
    message: string;
    plotId: string;
}

export const action: ActionFunction = async ({ request }) => {
    try {
        if (!process.env.DEEPSEEK_API_KEY) {
            return json({ error: "Missing DEEPSEEK_API_KEY" }, { status: 500 });
        }

        const formData = (await request.json()) as ChatRequest;
        const { message, plotId } = formData;

        if (!message || !plotId) {
            return json({ error: "Message and plotId are required" }, { status: 400 });
        }

        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: message }],
                temperature: 0.7,
            }),
        });

        const data = (await response.json()) as DeepSeekResponse;

        if (!response.ok) {
            return json(
                { error: data.error?.message || "Failed to get response from DeepSeek API" },
                { status: response.status }
            );
        }

        const messageContent = data.choices[0]?.message?.content?.trim();

        if (!messageContent) {
            return json({ error: "AI response does not contain valid message content." }, { status: 500 });
        }

        // Remove code fences if present (forgiving parsing)
        let content = messageContent
            .replace(/^```json/, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (err) {
            return json({ error: "Failed to parse AI response as JSON", raw: content }, { status: 500 });
        }

        console.info("Parsed AI response:", parsedContent);

        // Save the query and analysis to the PlotAiAnalysis table
        await prisma.plotAiAnalysis.create({
            data: {
                plotId,
                query: message,
                analysis: JSON.stringify(parsedContent),
            },
        });

        return json({
            completion: parsedContent,
        });
    } catch (error: any) {
        console.error("Error in /api/ai-chat-mv:", error);
        return json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
};