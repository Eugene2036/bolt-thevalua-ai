import React, { useEffect, useState } from "react";
import { Link, useFetcher } from "@remix-run/react";
import { TopProfileImage } from "~/components/TopProfileImage";
import { Mailbox, Mail, Activity } from 'tabler-icons-react';
import { AppLinks } from "~/models/links";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    profilePic: string | null;
    notifications: Notification[];
}

interface Notification {
    noteId: string;
}

interface UserProfileProps {
    email: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ email }) => {
    const fetcher = useFetcher<User | { error: string }>();
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (email) {
            fetcher.load(`/user_profile?email=${email}`);
        }
    }, [email]);

    useEffect(() => {
        if (fetcher.data) {
            if ("error" in fetcher.data) {
                setError(fetcher.data.error);
            } else {
                setUser(fetcher.data);
            }
        }
    }, [fetcher.data]);

    if (fetcher.state === "loading") {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-100">
                Error: {error}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-4 text-gray-600 bg-gray-50 rounded-lg border border-gray-100">
                No user found
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-3">
                <a href={AppLinks.EditUserProfileDetails(email)} className="flex items-center space-x-3">
                    <div className="relative">
                        {user.profilePic ? (
                            <TopProfileImage
                                imageId={user.profilePic as string}
                                removeImage={() => { }}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{email}</p>
                    </div>
                </a>
            </div>

            <div className="relative">
                {user.notifications.length > 0 && (
                    <Link to={AppLinks.UserProfile(user.id) + `?tab=1`}>
                        <div className="p-3 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 cursor-pointer" onClick={() => window.location.href = (user.notifications.length > 0 ? AppLinks.UserProfile(user.id) + `?tab=1` : '')}>
                            <Mail size={22} />
                            {user.notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {user.notifications.length}
                                </span>
                            )}
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
};