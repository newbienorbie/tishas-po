import { PODocument, UploadResponse, SaveResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:8000/api';

console.log("API_BASE_URL:", API_BASE_URL);

// Streaming upload with SSE
export async function uploadFileStream(
    file: File,
    onPO: (po: PODocument, page: number, totalPages: number) => void,
    onComplete: () => void,
    onError: (error: string) => void
): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/upload_stream`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('No response body');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));

                    if (data.type === 'po') {
                        onPO(data.data, data.page, data.total_pages);
                    } else if (data.type === 'complete') {
                        onComplete();
                    } else if (data.type === 'error') {
                        onError(data.message);
                    }
                }
            }
        }
    } catch (error: any) {
        onError(error.message || 'Upload failed');
    }
}

// Batch processing types
export interface BatchStatus {
    status: 'processing' | 'complete' | 'error';
    progress: {
        current: number;
        total: number;
    };
    pos: PODocument[];
    error?: string;
    page_errors?: Array<{ page: number; error: string }>;
    storage_existed?: boolean;
    storage_url?: string;
}

// Batch upload - starts processing and returns batch ID
export async function uploadFileBatch(file: File): Promise<{ batch_id: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload_batch`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Batch upload failed');
    }

    return await response.json();
}

// Get batch status - poll this to get incremental results
export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
    const response = await fetch(`${API_BASE_URL}/batch_status/${batchId}`);

    if (!response.ok) {
        throw new Error('Failed to get batch status');
    }

    return await response.json();
}

// Original non-streaming upload (keep for fallback)
export async function uploadFiles(files: File[]): Promise<PODocument[]> {
    const allDocs: PODocument[] = [];

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    const errorMsg = errorData.detail || errorData.message || `Upload failed for ${file.name}`;
                    throw new Error(errorMsg);
                } catch (jsonError) {
                    throw new Error(`Upload failed for ${file.name}. Make sure it's the correct file.`);
                }
            }
            const data: UploadResponse = await response.json();
            if (data.documents) {
                allDocs.push(...data.documents);
            }
        } catch (error) {
            throw error;
        }
    }

    return allDocs;
}

export async function savePO(doc: PODocument): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(doc),
        });

        if (!response.ok) return false;
        return true;
    } catch (error) {
        console.error("Save error:", error);
        return false;
    }
}

export async function saveAllPOs(docs: PODocument[]): Promise<{ success: boolean, saved: number, failed: number, message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/save_all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(docs),
        });

        if (!response.ok) {
            return { success: false, saved: 0, failed: docs.length, message: "Failed to save POs" };
        }

        const data = await response.json();
        return {
            success: true,
            saved: data.saved || 0,
            failed: data.failed || 0,
            message: data.message || "Saved successfully"
        };
    } catch (error) {
        console.error("Save all error:", error);
        return { success: false, saved: 0, failed: docs.length, message: String(error) };
    }
}

export async function checkFileExists(fileHash: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/check/${fileHash}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error("Check exists error:", error);
        return false;
    }
}

export async function checkPONumberExists(poNumber: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/check_po/${encodeURIComponent(poNumber)}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error("Check PO exists error:", error);
        return false;
    }
}

export async function fetchHistory(): Promise<PODocument[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("History fetch error:", error);
        return [];
    }
}

export async function exportCSV(startDate?: string, endDate?: string): Promise<void> {
    try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const url = `${API_BASE_URL}/export_csv${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Export failed');
        }

        // Get the blob
        const blob = await response.blob();

        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        // Get filename from response headers or generate default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'po_export.csv';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename=(.+)/);
            if (match) filename = match[1];
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error("CSV export error:", error);
        throw error;
    }
}

export function generateGoogleSheetsUrl(data: PODocument[]): void {
    // This function is deprecated - use exportToGoogleSheets instead
    // Keeping for backward compatibility
    const url = `https://docs.google.com/spreadsheets/create`;
    window.open(url, '_blank');
}

// ==========================================
// GOOGLE SHEETS OAUTH API
// ==========================================

const GOOGLE_SESSION_KEY = 'google_sheets_session_id';

export async function initiateGoogleAuth(): Promise<string> {
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const response = await fetch(`${API_BASE_URL}/google/auth/initiate?redirect_uri=${encodeURIComponent(redirectUri)}`);

    if (!response.ok) {
        throw new Error('Failed to initiate Google authentication');
    }

    const data = await response.json();
    return data.auth_url;
}

export async function handleGoogleCallback(code: string, state: string): Promise<string> {
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const response = await fetch(
        `${API_BASE_URL}/google/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );

    if (!response.ok) {
        throw new Error('Google authentication failed');
    }

    const data = await response.json();

    // Store session ID in localStorage
    if (data.session_id) {
        localStorage.setItem(GOOGLE_SESSION_KEY, data.session_id);
    }

    return data.session_id;
}

export async function checkGoogleAuthStatus(): Promise<boolean> {
    const sessionId = localStorage.getItem(GOOGLE_SESSION_KEY);
    if (!sessionId) return false;

    const response = await fetch(`${API_BASE_URL}/google/auth/status?session_id=${sessionId}`);
    const data = await response.json();

    return data.authenticated;
}

export async function exportToGoogleSheets(startDate?: string, endDate?: string, viewMode: 'po_level' | 'item_level' = 'item_level'): Promise<string> {
    const sessionId = localStorage.getItem(GOOGLE_SESSION_KEY);

    if (!sessionId) {
        throw new Error('NOT_AUTHENTICATED');
    }

    const params = new URLSearchParams({ session_id: sessionId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('view_mode', viewMode);

    const response = await fetch(`${API_BASE_URL}/google/sheets/export?${params.toString()}`, {
        method: 'POST'
    });

    if (response.status === 401) {
        // Clear invalid session
        localStorage.removeItem(GOOGLE_SESSION_KEY);
        throw new Error('NOT_AUTHENTICATED');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Export failed');
    }

    const data = await response.json();
    return data.spreadsheet_url;
}
