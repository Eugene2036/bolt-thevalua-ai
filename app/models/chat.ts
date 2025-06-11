import { json } from "@remix-run/node";
import { prisma } from "~/db.server";

// Fetch messages by notificationId, plotId, and userId
export async function loader({ request }: { request: Request }) {
    const url = new URL(request.url);
    const notificationId = url.searchParams.get("notificationId");
    const userId = url.searchParams.get("userId");
    const plotId = url.searchParams.get("plotId");

    if (!notificationId || !plotId || !userId) {
        return json({ error: "Missing parameters" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
        where: {
            notificationId,
            notification: {
                plotId,
                userId,
            },
        },
        include: {
            notification: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    return json({ messages });
}

// Send a new message
export async function action({ request }: { request: Request }) {
    const { notificationId, userId, content } = await request.json();

    if (!notificationId || !userId || !content) {
        return json({ error: "Missing parameters" }, { status: 400 });
    }

    const newMessage = await prisma.message.create({
        data: {
            content,
            userId,
            notificationId,
        },
    });

    return json({ message: newMessage });
}