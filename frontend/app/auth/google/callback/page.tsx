"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleGoogleCallback, exportToGoogleSheets } from "@/lib/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

function GoogleCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'exporting' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code || !state) {
            setStatus('error');
            setMessage('Invalid OAuth callback parameters');
            return;
        }

        // Handle the callback and auto-export
        handleGoogleCallback(code, state)
            .then(async () => {
                setStatus('exporting');
                setMessage('Connected! Creating Google Sheet...');

                try {
                    // Automatically export to Google Sheets
                    const spreadsheetUrl = await exportToGoogleSheets();

                    setStatus('success');
                    setMessage('Opening Google Sheet...');

                    // Open Google Sheets in new tab immediately
                    window.open(spreadsheetUrl, '_blank');

                    // Redirect back after a short delay
                    setTimeout(() => {
                        router.push('/?tab=history');
                    }, 1500);
                } catch (exportError: any) {
                    // Auth succeeded but export failed - still redirect
                    setStatus('success');
                    setMessage('Connected to Google! Redirecting...');
                    setTimeout(() => {
                        router.push('/?tab=history');
                    }, 1500);
                }
            })
            .catch((error) => {
                setStatus('error');
                setMessage(error.message || 'Authentication failed');
            });
    }, [searchParams, router]);

    return (
        <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md">
            {status === 'loading' && (
                <>
                    <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
                    <h2 className="text-xl font-semibold mb-2">Connecting to Google...</h2>
                    <p className="text-muted-foreground">Please wait</p>
                </>
            )}

            {status === 'exporting' && (
                <>
                    <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-green-500" />
                    <h2 className="text-xl font-semibold mb-2">{message}</h2>
                    <p className="text-muted-foreground">Exporting your data...</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h2 className="text-xl font-semibold mb-2">{message}</h2>
                    <p className="text-muted-foreground">Redirecting...</p>
                </>
            )}

            {status === 'error' && (
                <>
                    <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
                    <p className="text-muted-foreground mb-4">{message}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Return to Home
                    </button>
                </>
            )}
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
            <Suspense fallback={<LoadingFallback />}>
                <GoogleCallbackContent />
            </Suspense>
        </div>
    );
}
