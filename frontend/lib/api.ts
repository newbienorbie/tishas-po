import { PODocument, UploadResponse, SaveResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:8000/api';

console.log("API_BASE_URL:", API_BASE_URL);

export async function uploadFiles(files: File[]): Promise<PODocument[]> {
    const allDocs: PODocument[] = [];

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                // Try to extract error message from response
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
            // Re-throw the error so it can be caught by the caller
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
