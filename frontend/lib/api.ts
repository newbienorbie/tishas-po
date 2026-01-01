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
