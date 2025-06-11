import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

// // Define the expected structure of the API response
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
}

export const action: ActionFunction = async ({ request }) => {
    try {
        // const formData = await request.json();
        const formData = (await request.json()) as ChatRequest;
        const message = formData.message;

        if (!message) {
            return json({ error: "Message is required" }, { status: 400 });
        }

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: message }],
                temperature: 0.7,
            }),
        });

        const data = (await response.json()) as DeepSeekResponse;

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to get response from DeepSeek API');
        }

        return json({
            completion: data.choices[0]?.message?.content || "No response from AI",
        });

    } catch (error: unknown) {
        console.error("AI processing error:", error);
        return json({ error: "Internal Server Error" }, { status: 500 });
    }
};








// import { json } from "@remix-run/node";
// import type { ActionFunction } from "@remix-run/node";

// interface ErrorResponse {
//     message: string;
//     type?: string;
//     code?: string;
// }

// export const action: ActionFunction = async ({ request }) => {
//     try {
//         const formData = await request.json();
//         const message = formData.message;

//         if (!message) {
//             return json({ error: "Message is required" }, { status: 400 });
//         }

//         const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
//             },
//             body: JSON.stringify({
//                 model: 'deepseek-chat',
//                 messages: [{ role: 'user', content: message }],
//                 temperature: 0.7,
//             }),
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             throw new Error(data.error?.message || 'Failed to get response from DeepSeek API');
//         }

//         return json({
//             completion: data.choices[0]?.message?.content || "No response from AI",
//         });

//     } catch (error: unknown) {
//         console.error("AI processing error:", error);

//         let errorResponse: ErrorResponse = {
//             message: "An unknown error occurred",
//             type: 'unknown_error',
//             code: 'unknown'
//         };

//         if (error instanceof Error) {
//             errorResponse = {
//                 message: error.message,
//                 type: 'type' in error ? (error as any).type as string : 'api_error',
//                 code: 'code' in error ? (error as any).code as string : 'unknown_error'
//             };
//         } else if (typeof error === 'object' && error !== null) {
//             const err = error as Record<string, unknown>;
//             errorResponse = {
//                 message: err.message ? String(err.message) : 'Unknown error',
//                 type: err.type ? String(err.type) : 'api_error',
//                 code: err.code ? String(err.code) : 'unknown_error'
//             };
//         }

//         return json({ error: errorResponse }, { status: 500 });
//     }
// };
