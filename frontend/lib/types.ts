export interface POItem {
    article_code?: string;
    article_description?: string;
    barcode?: string;
    qty?: number;
    uom?: string;
    unit_price?: number;
    total_price?: number;
    [key: string]: any;
}

export interface PODocument {
    id?: number;
    retailer_name?: string;
    retailer_name_standardized?: string;
    po_number?: string;
    po_date?: string;
    delivery_date?: string;
    expiry_date?: string;
    currency?: string;
    total_amount?: number | string;
    buyer_name?: string;
    delivery_address?: string;
    branch_name?: string;
    branch_code?: string;
    debtor_code?: string;
    tax_id?: string;
    file_hash?: string;
    file_path_url?: string;
    source_filename?: string;
    already_exists?: boolean;
    duplicate_message?: string;
    items?: POItem[];
    status?: string;
    [key: string]: any;
}

export interface UploadResponse {
    status: string;
    documents: PODocument[];
    message?: string;
}

export interface SaveResponse {
    status: string;
    message: string;
}
