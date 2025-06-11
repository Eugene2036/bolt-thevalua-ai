import { LoaderFunction, json } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ request }) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email) {
        return json({ error: "Email is required" }, { status: 400 });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePic: true,
                notifications: {
                    where: { accepted: 'Unread' },
                    select: {
                        noteId: true,
                    }
                },
            },
        });

        if (!user) {
            return json({ error: "User not found" }, { status: 404 });
        }

        return json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        return json({ error: "Internal server error" }, { status: 500 });
    }
};
