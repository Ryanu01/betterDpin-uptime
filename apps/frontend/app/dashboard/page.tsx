"use client"

import { Appbar } from "@/components/Appbar";
import React, { useState } from "react";

export default function CreateWebsiteModel({ isOpen, onClose }: {
    isOpen: boolean,
    onClose: (url: string | null) => void
}) {
    const [url, setUrl] = useState('')


    return (
        <div className="flex justify-center mt-20">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">
                    Add New Website
                </h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        URL
                    </label>
                    <input
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>

            </div>

        </div>
    )
}