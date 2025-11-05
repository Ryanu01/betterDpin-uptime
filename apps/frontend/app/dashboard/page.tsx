"use client"

import { Appbar } from "@/components/Appbar";
import { Button } from "@/components/ui/button";
import { API_BACKEND_URL } from "@/config";
import { useWebsite } from "@/hooks/useWebsites";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { ChevronDown, ChevronUp, Globe, Moon, Plus, Sun } from "lucide-react";
import React, { useMemo, useState } from "react";

type UptimeStatus = "good" | "bad" | "unknows";

function StatusCircle({status}: {
    status: UptimeStatus
}) {
    return (
        <div className={`w-3 h-3 rounded-full ${status === "good" ? "bg-green-500" : status === "bad" ? "bg-red-500" : "bg-gray-500"}`} />     
    )
}

function UptimeTicks({ticks}: {
    ticks: UptimeStatus[]
}) {
    return (
        <div className="flex gap-1 mt-2">
            {ticks.map((tick, index) => (
                <div 
                    key={index}
                    className={`w-8 h-2 rounded ${
                        tick === "good" ?  "bg-green-500" : tick === "bad" ? "bg-red-500" : "bg-gray-500"
                    }`}
                />
            ))}
        </div>
    );
}

function CreateWebsiteModel({ isOpen, onClose }: {
    isOpen: boolean,
    onClose: (url: string | null) => void
}) {
    const [url, setUrl] = useState('')

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center mt-20">
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
            <div className="flex justify-end space-x-3 mt-6">
                <Button
                    type="button"
                    onClick={() => onClose(null)}
                    className="px-4 py-2 text-sm font-medium bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >Cancel</Button>
                <button
                    type="submit"
                    onClick={() => onClose(url)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >Add Website</button>
            </div>

            </div>

        </div>
    )
}

interface ProcessedWebsite {
    id: string
    url: string
    status: UptimeStatus
    lastChecked: string
    uptimePercentage: number
    uptimeTicks: UptimeStatus[]
}

function WebsiteCard({website}: {
    website: ProcessedWebsite
}) {
    const [isExpnaded, setIsExpanded] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setIsExpanded(!isExpnaded)}
            >
                <div className="flex items-center space-x-4">
                    <StatusCircle status={website.status} />
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{website.url}</h3>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        {website.uptimePercentage.toFixed(1)}% uptime
                    </span>
                    {isExpnaded ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 dark:text-gray-500"/>
                    ): (
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500"/>
                    )}
                </div>
            </div>
            {isExpnaded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="mt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Last 30 minutes status:</p>
                        <UptimeTicks ticks={website.uptimeTicks} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Last checked: {website.lastChecked}
                    </p>
                </div>
            )}
        </div>
    )
}

function App () {
    const [isDarkMode, setIsDarkMode]  = useState(false);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const {websites, refreshWebsites} = useWebsite();
    const {getToken} = useAuth();

    const processWebsites = useMemo(() => {
        return websites.map(website => {
            const sortedTicks = [...website.ticks].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const recentTicks = sortedTicks.filter(tick => 
                new Date(tick.createdAt) > thirtyMinutesAgo
            );

            const windows: UptimeStatus[] = [];

            for(let i = 0; i < 10; i++) {
                const windowStart = new Date(Date.now() - (i + 1) * 3 * 60 * 1000)  
                const windowEnd = new Date(Date.now() - i * 3 * 60 * 1000);

                const windowTicks = recentTicks.filter(tick => {
                        const tickTime = new Date(tick.createdAt)
                        return tickTime >= windowStart && tickTime < windowEnd
                    }
                );

                const upTicks = windowTicks.filter(tick => tick.status === "Good").length;
                windows[9 - i] = windowTicks.length === 0 ? "unknows" : (upTicks / windowTicks.length) >= 0.5 ? "good" : "bad"
            }

            const totalTicks = sortedTicks.length;
            const upTicks = sortedTicks.filter(tick => tick.status === "Good").length
            const uptimePercentage = totalTicks === 0 ? 100 : (upTicks / totalTicks) * 100;
            
            const currentStatus = windows[windows.length - 1]

            const lastChecked = sortedTicks[0]
                ? new Date(sortedTicks[0].createdAt).toLocaleTimeString() : "Never"
                
                return {
                    id: website.id,
                    url: website.url,
                    status: currentStatus,
                    uptimePercentage,
                    lastChecked,
                    uptimeTicks: windows
                };
        })
    }, [websites]);


    React.useEffect(() => {
        if(isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    }, [isDarkMode])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="nax-w-4xl mx-auto py-8 px-4">
                <div className="flex items-center space-x-2">
                    <div>
                        <Globe className="w-8 h-8 text-blue-600"/>
                        <h1 className="text-2xl font-bold text-gray-+00 dark:text-white">DPIN</h1>
                    </div>
                <div className="flex items-center space-x-4">
                   
                    <Button 
                        onClick={() => setIsModelOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        <Plus className="w-4 h-4"/>
                        <span>Add Website</span>
                    </Button>
                </div>
            </div>
            <div className="space-y-4">
                {processWebsites.map((website) => (
                    <WebsiteCard key={website.id} website={website} />
                ))}
            </div>
            </div>
            <CreateWebsiteModel isOpen = {isModelOpen}
                onClose={async (url) => {
                    if(url === null) {
                        setIsModelOpen(false)
                        return;
                    }
                    const token = await getToken();
                    setIsModelOpen(false)
                    axios.post(`${API_BACKEND_URL}/api/v1/website`, {
                        url,
                    }, {
                        headers: {
                            Authorization: token
                        }
                    }).then(() => {
                        refreshWebsites()
                    })
                    
                }}
            />
        </div>

    )
}

export default App;